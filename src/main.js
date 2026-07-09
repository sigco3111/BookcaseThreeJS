import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import GUI from 'lil-gui';
import { createWoodMaterial, createBookMaterials } from './materials.js';
import { buildBookcase, disposeGroup, DEFAULT_PARAMS } from './bookcase.js';
import { createStudio, createContactShadow, MOODS } from './studio.js';
import { createBooksSystem, BOOK_DEFAULTS } from './books.js';

// ---- renderer ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app').appendChild(renderer.domElement);

// ---- scene & camera -----------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x131417);
scene.fog = new THREE.FogExp2(0x131417, 0.055);

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 60);
camera.position.set(3.7, 2.1, 5.3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.8;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI / 2 + 0.04;

// ---- params ---------------------------------------------------------------------
const params = { ...DEFAULT_PARAMS };
const style = { tint: '#ffffff', roughness: 1.0 };
const studioParams = {
  mood: 'moonlight',
  keyLight: 95,
  fillLight: 0.6,
  rimLight: 14,
  haze: 0.16,
  dust: 0.35,
  exposure: 1.0,
  backdrop: '#131417',
};
const fxParams = {
  bloom: 0.35,
  bloomRadius: 0.55,
  bloomThreshold: 1.0,
  ao: true,
  aoIntensity: 1.0,
  aoRadius: 0.25,
  dof: false,
  aperture: 0.003,
  maxblur: 0.008,
  chroma: 0.15,
  saturation: 1.0,
  contrast: 1.0,
  temperature: 0.0,
  vignette: 0.55,
  grain: 0.03,
  letterbox: 0.1,
};
const cameraParams = { fov: 30, turntable: false, speed: 1.2 };

// ---- build ------------------------------------------------------------------------
const target = new THREE.Vector3(0, params.height * 0.48, 0);
controls.target.copy(target);

const wood = createWoodMaterial(renderer);
const studio = createStudio(scene, renderer, target);
const contactShadow = createContactShadow();
scene.add(contactShadow);

const bookParams = { ...BOOK_DEFAULTS };
const bookMats = createBookMaterials(renderer);
const booksSys = createBooksSystem(scene, camera, bookMats, (on) => { controls.enabled = on; });

let bookcase = null;
let built = null;
function rebuild() {
  if (bookcase) {
    disposeGroup(bookcase);
    scene.remove(bookcase);
  }
  built = buildBookcase(params, wood);
  bookcase = built.group;
  scene.add(bookcase);
  booksSys.rebuild(built, bookParams);
  contactShadow.scale.set(params.width * 1.6, params.depth * 2.8, 1);
  controls.target.set(0, params.height * 0.48, 0);
}
function rebuildBooks() {
  if (built) booksSys.rebuild(built, bookParams);
}
rebuild();

// ---- post-processing: sanitize -> bloom -> vignette + film grain -> tone mapping ----
const bufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
const composer = new EffectComposer(
  renderer,
  new THREE.WebGLRenderTarget(bufferSize.x, bufferSize.y, {
    type: THREE.HalfFloatType,
    samples: 4,
  })
);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.addPass(new RenderPass(scene, camera));

// ground-truth ambient occlusion: seats books into shelves, corners into carcass
const gtaoPass = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
gtaoPass.output = GTAOPass.OUTPUT.Default;
gtaoPass.blendIntensity = fxParams.aoIntensity;
gtaoPass.updateGtaoMaterial({ radius: fxParams.aoRadius });
gtaoPass.enabled = fxParams.ao;
composer.addPass(gtaoPass);

// GTAO re-renders the scene with override materials that ignore transparency,
// so the haze cone / dust / contact blob would occlude and cast AO as if they
// were solid geometry — hide them while the AO buffers are rendered
const aoExcluded = [studio.shaft.mesh, studio.dust.points, contactShadow];
const gtaoRenderOriginal = gtaoPass.render.bind(gtaoPass);
gtaoPass.render = function (...args) {
  const wasVisible = aoExcluded.map((o) => o.visible);
  aoExcluded.forEach((o) => { o.visible = false; });
  gtaoRenderOriginal(...args);
  aoExcluded.forEach((o, i) => { o.visible = wasVisible[i]; });
};

// specular glints from the spotlight can spike to Inf in the half-float buffer;
// bloom's blur smears Inf/NaN into flickering black rectangles — scrub them first
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      if (c.r != c.r || c.g != c.g || c.b != c.b) c.rgb = vec3(0.0);
      c.rgb = clamp(c.rgb, vec3(0.0), vec3(16.0));
      gl_FragColor = c;
    }
  `,
};
composer.addPass(new ShaderPass(SanitizeShader));

// depth of field, auto-focused on the orbit target (off by default)
const bokehPass = new BokehPass(scene, camera, {
  focus: 4.0,
  aperture: fxParams.aperture,
  maxblur: fxParams.maxblur,
});
bokehPass.enabled = fxParams.dof;
composer.addPass(bokehPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  fxParams.bloom, fxParams.bloomRadius, fxParams.bloomThreshold
);
composer.addPass(bloomPass);

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: fxParams.vignette },
    uGrain: { value: fxParams.grain },
    uChroma: { value: fxParams.chroma },
    uSaturation: { value: fxParams.saturation },
    uContrast: { value: fxParams.contrast },
    uTemperature: { value: fxParams.temperature },
    uLetterbox: { value: fxParams.letterbox },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uChroma;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uTemperature;
    uniform float uLetterbox;
    varying vec2 vUv;
    // interleaved gradient noise — stable on ANGLE/D3D where sin-based hashes break
    float ign(vec2 p) {
      return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
    }
    void main() {
      // chromatic aberration: split channels radially, stronger at the edges
      vec2 dir = vUv - vec2(0.5);
      vec2 off = dir * dot(dir, dir) * uChroma * 0.05;
      vec4 color = texture2D(tDiffuse, vUv);
      color.r = texture2D(tDiffuse, vUv - off).r;
      color.b = texture2D(tDiffuse, vUv + off).b;

      // temperature: warm (+) or cool (-) shift
      color.rgb *= vec3(1.0 + uTemperature * 0.10, 1.0 + uTemperature * 0.02, 1.0 - uTemperature * 0.10);

      // saturation & contrast (pivot at linear mid-grey, pre-tonemap)
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb = mix(vec3(luma), color.rgb, uSaturation);
      color.rgb = max((color.rgb - 0.18) * uContrast + 0.18, 0.0);

      // vignette
      float d = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - uVignette * smoothstep(0.32, 0.82, d);

      // animated film grain, weighted by luminance: full strength in midtones,
      // nearly none in the blacks (constant grain makes dark scenes flicker)
      vec2 jitter = vec2(mod(uTime * 61.0, 17.0), mod(uTime * 83.0, 29.0));
      float n = ign(gl_FragCoord.xy + jitter);
      float lumaOut = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb += (n - 0.5) * uGrain * (0.1 + 0.9 * smoothstep(0.0, 0.35, lumaOut));

      // cinema letterbox bars
      if (vUv.y < uLetterbox || vUv.y > 1.0 - uLetterbox) color.rgb = vec3(0.0);

      gl_FragColor = color;
    }
  `,
};
const gradePass = new ShaderPass(GradeShader);
composer.addPass(gradePass);
composer.addPass(new OutputPass());

// ---- moods ----------------------------------------------------------------------------
function applyMood(name) {
  const m = MOODS[name];
  if (!m) return;
  studio.key.color.set(m.key.color);
  studio.key.intensity = m.key.intensity;
  studio.fill.color.set(m.fill.color);
  studio.fill.intensity = m.fill.intensity;
  studio.rim.color.set(m.rim.color);
  studio.rim.intensity = m.rim.intensity;
  studio.cyc.material.color.set(m.backdrop);
  studio.setFloorHorizon(m.backdrop);
  studio.shaft.material.uniforms.uColor.value.set(m.key.color);
  studio.shaft.material.uniforms.uOpacity.value = m.haze;
  studio.shaft.mesh.visible = m.haze > 0.001;
  studio.dust.material.opacity = m.dust;
  studio.dust.points.visible = m.dust > 0.001;
  scene.background.set(m.backdrop);
  scene.fog.color.set(m.backdrop);
  scene.fog.density = m.fog;
  scene.environmentIntensity = m.env;
  renderer.toneMappingExposure = m.exposure;
  bloomPass.strength = m.bloom;
  fxParams.bloom = m.bloom;

  Object.assign(studioParams, {
    keyLight: m.key.intensity,
    fillLight: m.fill.intensity,
    rimLight: m.rim.intensity,
    haze: m.haze,
    dust: m.dust,
    exposure: m.exposure,
    backdrop: m.backdrop,
  });
  gui.controllersRecursive().forEach((c) => c.updateDisplay());
}

// ---- camera shots: smooth fly-to presets -------------------------------------------------
const SHOTS = {
  hero:   { az: 33, h: 0.78, dist: 2.3,  fov: 30, ty: 0.48 },
  low:    { az: 18, h: 0.10, dist: 2.0,  fov: 26, ty: 0.60 },
  detail: { az: 42, h: 0.66, dist: 1.05, fov: 33, ty: 0.62 },
  front:  { az: 0,  h: 0.50, dist: 2.5,  fov: 25, ty: 0.48 },
};

let shotTween = null;
function flyTo(name) {
  const s = SHOTS[name];
  const scale = Math.max(params.width, params.height * 0.85);
  const az = THREE.MathUtils.degToRad(s.az);
  const dist = scale * s.dist;
  shotTween = {
    t0: performance.now(),
    dur: 1300,
    p0: camera.position.clone(),
    p1: new THREE.Vector3(Math.sin(az) * dist, params.height * s.h, Math.cos(az) * dist),
    g0: controls.target.clone(),
    g1: new THREE.Vector3(0, params.height * s.ty, 0),
    f0: camera.fov,
    f1: s.fov,
  };
}
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---- gui -------------------------------------------------------------------------------
function randomize() {
  const r = (a, b) => a + Math.random() * (b - a);
  params.width = +r(0.9, 2.8).toFixed(2);
  params.height = +r(1.4, 2.8).toFixed(2);
  params.depth = +r(0.28, 0.52).toFixed(3);
  params.shelves = Math.floor(r(2, 7));
  params.separations = Math.floor(r(0, 4));
  params.thickness = +r(0.02, 0.04).toFixed(3);
  params.baseHeight = +r(0.08, 0.18).toFixed(3);
  params.crown = Math.random() > 0.25;
  params.faceFrame = Math.random() > 0.25;
  params.sidePanels = Math.random() > 0.3;
  params.back = ['planks', 'planks', 'flat', 'open'][Math.floor(Math.random() * 4)];
  bookParams.seed = Math.floor(Math.random() * 10000);
  gui.controllersRecursive().forEach((c) => c.updateDisplay());
  rebuild();
}

const gui = new GUI({ title: 'Bookcase Studio' });

const fCase = gui.addFolder('Bookcase Settings');
// dimensions
fCase.add(params, 'width', 0.7, 3.2, 0.01).name('width (m)').onChange(rebuild);
fCase.add(params, 'height', 1.2, 3.0, 0.01).name('height (m)').onChange(rebuild);
fCase.add(params, 'depth', 0.24, 0.6, 0.005).name('depth (m)').onChange(rebuild);
// layout
fCase.add(params, 'shelves', 0, 8, 1).onChange(rebuild);
fCase.add(params, 'separations', 0, 4, 1).onChange(rebuild);
// construction
fCase.add(params, 'thickness', 0.018, 0.045, 0.001).name('board thickness').onChange(rebuild);
fCase.add(params, 'baseHeight', 0.06, 0.22, 0.005).name('plinth height').onChange(rebuild);
fCase.add(params, 'crown').name('crown molding').onChange(rebuild);
fCase.add(params, 'faceFrame').name('face frame').onChange(rebuild);
fCase.add(params, 'sidePanels').name('side insets').onChange(rebuild);
fCase.add(params, 'back', ['planks', 'flat', 'open']).name('back style').onChange(rebuild);
// finish
fCase.addColor(style, 'tint').onChange((v) => wood.color.set(v));
fCase.add(style, 'roughness', 0.4, 1.5, 0.01).onChange((v) => { wood.roughness = v; });
fCase.add(params, 'grainScale', 0.5, 2.5, 0.01).name('grain scale').onChange(rebuild);
fCase.add(params, 'grainFlip').name('grain direction').onChange(rebuild);
fCase.add({ randomize }, 'randomize').name('🎲 randomize');
fCase.close();

const fBooks = gui.addFolder('Books');
fBooks.add(bookParams, 'enabled').name('📚 books').onChange(rebuildBooks);
const fRamp = fBooks.addFolder('color ramp');
Object.keys(bookParams.ramp).forEach((k, i) => {
  fRamp.addColor(bookParams.ramp, k).name(`stop ${i + 1}`).onChange(rebuildBooks);
});
function randomizeBookColors() {
  const c = new THREE.Color();
  Object.keys(bookParams.ramp).forEach((k) => {
    const h = Math.random();
    const s = 0.35 + Math.random() * 0.3;  // muted, never neon
    const l = 0.28 + Math.random() * 0.24; // deep-ish, tasteful
    c.setHSL(h, s, l, THREE.SRGBColorSpace);
    bookParams.ramp[k] = '#' + c.getHexString(THREE.SRGBColorSpace);
  });
  gui.controllersRecursive().forEach((ctrl) => ctrl.updateDisplay());
  rebuildBooks();
}
fRamp.add({ randomizeBookColors }, 'randomizeBookColors').name('🎲 randomize colors');
fRamp.close();
fBooks.add(bookParams, 'darkness', 0, 1, 0.01).onChange(rebuildBooks);
fBooks.add(bookParams, 'density', 0.1, 1, 0.01).onChange(rebuildBooks);
fBooks.add(bookParams, 'lean', 0, 0.6, 0.01).name('leaning books').onChange(rebuildBooks);
fBooks.add(bookParams, 'stacks', 0, 0.6, 0.01).name('flat stacks').onChange(rebuildBooks);
fBooks.add(bookParams, 'messiness', 0, 1, 0.01).onChange(rebuildBooks);
fBooks.add(bookParams, 'scale', 0.7, 1.4, 0.01).name('book size').onChange(rebuildBooks);
fBooks.add(bookParams, 'seed', 0, 9999, 1).onChange(rebuildBooks);
fBooks.add({
  reseed: () => {
    bookParams.seed = Math.floor(Math.random() * 10000);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    rebuildBooks();
  },
}, 'reseed').name('🎲 new seed');
fBooks.add(bookParams, 'grab').name('✋ grab & throw');
fBooks.add(bookParams, 'throwPower', 0.5, 3, 0.05).name('throw power');
fBooks.add({ quake: () => booksSys.bookquake() }, 'quake').name('💥 bookquake');
fBooks.add({ reset: rebuildBooks }, 'reset').name('↩ reset books');
fBooks.close();

const fCam = gui.addFolder('Camera');
fCam.add({ hero: () => flyTo('hero') }, 'hero').name('🎬 hero shot');
fCam.add({ low: () => flyTo('low') }, 'low').name('🎬 low angle');
fCam.add({ detail: () => flyTo('detail') }, 'detail').name('🎬 close-up');
fCam.add({ front: () => flyTo('front') }, 'front').name('🎬 front');
fCam.add(cameraParams, 'fov', 18, 60, 0.5).onChange((v) => {
  camera.fov = v;
  camera.updateProjectionMatrix();
});
fCam.add(cameraParams, 'turntable');
fCam.add(cameraParams, 'speed', 0.2, 5, 0.1).name('turntable speed');
fCam.close();

const fStudio = gui.addFolder('Studio');
fStudio.add(studioParams, 'mood', Object.keys(MOODS)).onChange(applyMood);
fStudio.add(studioParams, 'keyLight', 0, 250, 1).onChange((v) => { studio.key.intensity = v; });
fStudio.add(studioParams, 'fillLight', 0, 12, 0.1).onChange((v) => { studio.fill.intensity = v; });
fStudio.add(studioParams, 'rimLight', 0, 40, 0.1).onChange((v) => { studio.rim.intensity = v; });
fStudio.add(studioParams, 'haze', 0, 0.5, 0.005).onChange((v) => {
  studio.shaft.material.uniforms.uOpacity.value = v;
  studio.shaft.mesh.visible = v > 0.001;
});
fStudio.add(studioParams, 'dust', 0, 1, 0.01).onChange((v) => {
  studio.dust.material.opacity = v;
  studio.dust.points.visible = v > 0.001;
});
fStudio.add(studioParams, 'exposure', 0.3, 2, 0.01).onChange((v) => { renderer.toneMappingExposure = v; });
fStudio.addColor(studioParams, 'backdrop').onChange((v) => {
  studio.cyc.material.color.set(v);
  studio.setFloorHorizon(v);
  scene.background.set(v);
  scene.fog.color.set(v);
});
fStudio.close();

const fFX = gui.addFolder('FX');
fFX.add(fxParams, 'bloom', 0, 1.5, 0.01).name('bloom strength').onChange((v) => { bloomPass.strength = v; });
fFX.add(fxParams, 'bloomRadius', 0, 1, 0.01).name('bloom radius').onChange((v) => { bloomPass.radius = v; });
fFX.add(fxParams, 'bloomThreshold', 0, 1.5, 0.01).name('bloom threshold').onChange((v) => { bloomPass.threshold = v; });
fFX.add(fxParams, 'ao').name('ambient occlusion').onChange((v) => { gtaoPass.enabled = v; });
fFX.add(fxParams, 'aoIntensity', 0, 1, 0.01).name('ao intensity').onChange((v) => { gtaoPass.blendIntensity = v; });
fFX.add(fxParams, 'aoRadius', 0.05, 1, 0.01).name('ao radius').onChange((v) => {
  gtaoPass.updateGtaoMaterial({ radius: v });
});
fFX.add(fxParams, 'dof').name('depth of field').onChange((v) => { bokehPass.enabled = v; });
fFX.add(fxParams, 'aperture', 0, 0.01, 0.0001).onChange((v) => { bokehPass.uniforms.aperture.value = v; });
fFX.add(fxParams, 'maxblur', 0, 0.02, 0.0005).name('max blur').onChange((v) => { bokehPass.uniforms.maxblur.value = v; });
fFX.add(fxParams, 'chroma', 0, 1, 0.01).name('chromatic aberration').onChange((v) => { gradePass.uniforms.uChroma.value = v; });
fFX.add(fxParams, 'saturation', 0, 2, 0.01).onChange((v) => { gradePass.uniforms.uSaturation.value = v; });
fFX.add(fxParams, 'contrast', 0.5, 1.5, 0.01).onChange((v) => { gradePass.uniforms.uContrast.value = v; });
fFX.add(fxParams, 'temperature', -1, 1, 0.01).onChange((v) => { gradePass.uniforms.uTemperature.value = v; });
fFX.add(fxParams, 'vignette', 0, 1, 0.01).onChange((v) => { gradePass.uniforms.uVignette.value = v; });
fFX.add(fxParams, 'grain', 0, 0.15, 0.001).onChange((v) => { gradePass.uniforms.uGrain.value = v; });
fFX.add(fxParams, 'letterbox', 0, 0.2, 0.005).onChange((v) => { gradePass.uniforms.uLetterbox.value = v; });
fFX.close();

applyMood(studioParams.mood);

// ---- loop --------------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = 0;
renderer.setAnimationLoop((time) => {
  const t = time / 1000;
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (shotTween) {
    const k = easeInOut(Math.min(1, (performance.now() - shotTween.t0) / shotTween.dur));
    camera.position.lerpVectors(shotTween.p0, shotTween.p1, k);
    controls.target.lerpVectors(shotTween.g0, shotTween.g1, k);
    camera.fov = THREE.MathUtils.lerp(shotTween.f0, shotTween.f1, k);
    camera.updateProjectionMatrix();
    if (k >= 1) {
      cameraParams.fov = camera.fov;
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      shotTween = null;
    }
  }

  controls.autoRotate = cameraParams.turntable && !shotTween;
  controls.autoRotateSpeed = cameraParams.speed;
  controls.update();

  studio.update(t);
  booksSys.update(dt);
  gradePass.uniforms.uTime.value = t;
  if (fxParams.dof) {
    bokehPass.uniforms.focus.value = camera.position.distanceTo(controls.target);
  }
  composer.render();
});
