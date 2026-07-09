import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// lighting moods — each one is a complete grade of the scene
export const MOODS = {
  noir: {
    backdrop: '#131417',
    key: { color: '#ffd9a3', intensity: 95 },
    fill: { color: '#8fa3c9', intensity: 0.6 },
    rim: { color: '#86a8ff', intensity: 14 },
    env: 0.07,
    exposure: 1.0,
    bloom: 0.35,
    haze: 0.16,
    dust: 0.35,
    fog: 0.055,
  },
  ember: {
    backdrop: '#171310',
    key: { color: '#ff9d4f', intensity: 85 },
    fill: { color: '#ff5f3c', intensity: 0.5 },
    rim: { color: '#ffd9a3', intensity: 10 },
    env: 0.05,
    exposure: 1.05,
    bloom: 0.5,
    haze: 0.2,
    dust: 0.45,
    fog: 0.06,
  },
  moonlight: {
    backdrop: '#0d1117',
    key: { color: '#bcd2ff', intensity: 75 },
    fill: { color: '#5f7fae', intensity: 0.8 },
    rim: { color: '#ffb37a', intensity: 9 },
    env: 0.08,
    exposure: 0.95,
    bloom: 0.4,
    haze: 0.14,
    dust: 0.3,
    fog: 0.05,
  },
  daylight: {
    backdrop: '#e3e0da',
    key: { color: '#fff0dd', intensity: 60 },
    fill: { color: '#dfe9ff', intensity: 5 },
    rim: { color: '#ffffff', intensity: 7 },
    env: 0.5,
    exposure: 1.12,
    bloom: 0.08,
    haze: 0.0,
    dust: 0.0,
    fog: 0.012,
  },
};

export function createStudio(scene, renderer, target) {
  RectAreaLightUniformsLib.init();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // key: hard tungsten spotlight from upper left — the star of the show
  const key = new THREE.SpotLight(0xffd9a3, 95);
  key.position.set(-2.6, 3.4, 2.4);
  key.angle = 0.5;
  key.penumbra = 0.65;
  key.decay = 1.6;
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 16;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.035;
  key.shadow.radius = 4;
  key.target.position.set(0, 1.0, 0.1);
  scene.add(key, key.target);

  // fill: barely-there ambient lift from the right
  const fill = new THREE.RectAreaLight(0x8fa3c9, 0.6, 3.4, 2.6);
  fill.position.set(3.0, 1.6, 2.6);
  fill.lookAt(target);
  scene.add(fill);

  // rim: cool edge light from behind, cuts the silhouette out of the dark
  const rim = new THREE.RectAreaLight(0x86a8ff, 14, 1.0, 3.0);
  rim.position.set(2.2, 2.4, -2.6);
  rim.lookAt(target);
  scene.add(rim);

  const floor = buildFloor();
  const cyc = floor.mesh;
  scene.add(cyc);

  const dust = createDust();
  scene.add(dust.points);

  const shaft = createLightShaft(key.position, new THREE.Vector3(0, 0.9, 0.35));
  scene.add(shaft.mesh);

  function update(t) {
    dust.update(t);
  }

  return { key, fill, rim, cyc, dust, shaft, update, setFloorHorizon: floor.setHorizon };
}

// flat ground plane with a baked-in horizon fade: past `near` metres from the
// centre the floor blends toward the backdrop colour, fully dissolving by `far`
// (well inside the plane's edge) so the rim is never visible — independent of
// scene fog. setHorizon() re-tints it to match the backdrop on every change.
function buildFloor({ size = 60, color = 0x131417, near = 8, far = 27 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.9, metalness: 0, envMapIntensity: 0.25,
  });
  const horizon = { value: new THREE.Color(color) };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHorizonColor = horizon;
    shader.uniforms.uHorizonNear = { value: near };
    shader.uniforms.uHorizonFar = { value: far };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHorizonWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vHorizonWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHorizonWorld;\nuniform vec3 uHorizonColor;\nuniform float uHorizonNear;\nuniform float uHorizonFar;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  float _hd = length(vHorizonWorld.xz);\n  float _hf = smoothstep(uHorizonNear, uHorizonFar, _hd);\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, uHorizonColor, _hf);');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return { mesh, setHorizon: (c) => horizon.value.set(c) };
}

// floating dust motes drifting through the light
function createDust(count = 420) {
  const base = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    base[i * 3 + 0] = (Math.random() - 0.5) * 4.6;
    base[i * 3 + 1] = Math.random() * 3.2;
    base[i * 3 + 2] = -1.3 + Math.random() * 3.6;
    phase[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));

  // soft round sprite
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const mat = new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(canvas),
    color: 0xfff2dd,
    size: 0.02,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  points.renderOrder = 2;

  function update(t) {
    const pos = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      const p = phase[i];
      pos.array[i * 3 + 0] = base[i * 3 + 0] + Math.sin(t * 0.12 + p) * 0.22;
      pos.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.07 + p * 1.7) * 0.16;
      pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.09 + p * 0.6) * 0.18;
    }
    pos.needsUpdate = true;
  }

  return { points, material: mat, update };
}

// fake volumetric shaft: additive cone from the key light, fading toward the floor
function createLightShaft(lightPos, floorTarget) {
  const dir = floorTarget.clone().sub(lightPos);
  const len = dir.length();
  dir.normalize();

  const radius = Math.tan(0.5) * len * 0.85;
  const geo = new THREE.ConeGeometry(radius, len, 96, 1, true);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(0xffd9a3) },
      uOpacity: { value: 0.16 },
      uFloorY: { value: 0.0 },
      uWallZ: { value: -1.8 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uFloorY;
      uniform float uWallZ;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;
      void main() {
        // brightest through the core of the cone, fading at grazing edges
        float core = pow(abs(dot(normalize(vNormal), normalize(vViewDir))), 1.8);
        // brightest near the light (uv.y = 1 at apex), fading to the floor
        float falloff = pow(vUv.y, 1.6);
        // dissolve before reaching the floor / back wall so the depth test
        // never slices the cone into hard polygon edges
        float floorFade = smoothstep(uFloorY + 0.03, uFloorY + 0.65, vWorldPos.y);
        float wallFade = smoothstep(uWallZ + 0.05, uWallZ + 0.75, vWorldPos.z);
        float a = core * falloff * floorFade * wallFade * uOpacity;
        // dither the faint gradient so it doesn't band on 8-bit output
        float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        a *= 0.88 + 0.24 * n;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  // cone apex (+y) sits at the light, axis pointing down toward the floor target
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  mesh.position.copy(lightPos).addScaledVector(dir, len / 2);
  mesh.renderOrder = 1;

  return { mesh, material: mat };
}

// soft fake contact-shadow blob under the bookcase
export function createContactShadow() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, opacity: 0.55,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  mesh.renderOrder = 1;
  return mesh;
}
