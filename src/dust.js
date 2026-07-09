import * as THREE from 'three';

export const DUST_DEFAULTS = {
  // settled surface dust (shader layer on wood + leather + paper)
  surface: 0.35,     // overall coverage
  patchiness: 0.65,  // noise contrast: 0 = even film, 1 = blotchy neglect
  scale: 2.2,        // noise feature size
  topBias: 2.0,      // how strictly dust favours upward-facing surfaces
  color: '#b9ac93',  // dry dusty beige
  // impact puffs (physics-triggered particles)
  puffs: true,
  puffDensity: 1.0,
  puffSize: 1.0,
  puffOpacity: 0.28,
  puffLife: 1.6,
};

const MAX_PARTICLES = 1500;
const MAX_IMPACTS_PER_FRAME = 6;

// mottled soft puff sprite: radial falloff plus random blotches
function makePuffTexture() {
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext('2d');
  const core = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  core.addColorStop(0, 'rgba(255,255,255,0.5)');
  core.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 16; i++) {
    const r = 8 + Math.random() * 24;
    const x = s / 2 + (Math.random() - 0.5) * s * 0.45;
    const y = s / 2 + (Math.random() - 0.5) * s * 0.45;
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, 'rgba(255,255,255,0.18)');
    blob.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = blob;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

export function createDustSystem(scene, renderer, dustParams) {
  // uniforms shared by every dusted material (wood, leather covers, pages)
  const surfaceUniforms = {
    uDustAmount: { value: dustParams.surface },
    uDustPatchiness: { value: dustParams.patchiness },
    uDustScale: { value: dustParams.scale },
    uDustBias: { value: dustParams.topBias },
    uDustColor: { value: new THREE.Color(dustParams.color) },
  };

  // ---- pooled puff particles, fully animated on the GPU -----------------------
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const velocities = new Float32Array(MAX_PARTICLES * 3);
  const starts = new Float32Array(MAX_PARTICLES).fill(-1e4);
  const lives = new Float32Array(MAX_PARTICLES).fill(1);
  const sizes = new Float32Array(MAX_PARTICLES);
  const seeds = new Float32Array(MAX_PARTICLES);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aVel', new THREE.BufferAttribute(velocities, 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(starts, 1));
  geo.setAttribute('aLife', new THREE.BufferAttribute(lives, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uScaleH: { value: 600 },
      uColor: { value: new THREE.Color(dustParams.color).lerp(new THREE.Color('#ffffff'), 0.2) },
      uOpacity: { value: dustParams.puffOpacity },
      uMap: { value: makePuffTexture() },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aVel;
      attribute float aStart;
      attribute float aLife;
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uScaleH;
      varying float vFade;
      varying float vSeed;
      void main() {
        float age = uTime - aStart;
        float tN = clamp(age / aLife, 0.0, 1.0);
        // decelerating outward billow
        vec3 disp = aVel * (1.0 - exp(-2.4 * tN)) * 0.55;
        // gentle swirl while airborne, then settle
        disp += vec3(
          sin(aSeed * 17.0 + tN * 3.1),
          0.0,
          cos(aSeed * 23.0 + tN * 2.7)
        ) * 0.05 * tN;
        disp.y += 0.09 * sin(tN * 3.14159) - 0.05 * tN * tN;
        vec3 p = position + disp;
        vFade = (1.0 - tN);
        vFade *= vFade;
        vFade *= smoothstep(0.0, 0.07, tN);
        if (age < 0.0 || age > aLife) vFade = 0.0;
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float size = aSize * (0.5 + 2.4 * tN);
        gl_PointSize = size * uScaleH / max(-mv.z, 0.1);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      varying float vSeed;
      void main() {
        if (vFade <= 0.003) discard;
        // rotate the sprite per-particle so puffs don't look stamped
        float a = vSeed * 6.2831;
        vec2 c = gl_PointCoord - 0.5;
        vec2 rc = vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a)) + 0.5;
        float m = texture2D(uMap, rc).a;
        gl_FragColor = vec4(uColor, m * vFade * uOpacity);
      }
    `,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false; // positions move in the shader
  points.renderOrder = 3;
  scene.add(points);

  let head = 0;
  let now = 0;
  let impactsThisFrame = 0;

  function spawnParticle(px, py, pz, vx, vy, vz, life, size) {
    const i = head;
    head = (head + 1) % MAX_PARTICLES;
    positions[i * 3] = px; positions[i * 3 + 1] = py; positions[i * 3 + 2] = pz;
    velocities[i * 3] = vx; velocities[i * 3 + 1] = vy; velocities[i * 3 + 2] = vz;
    starts[i] = now;
    lives[i] = life;
    sizes[i] = size;
    seeds[i] = Math.random();
  }

  function commit() {
    for (const name of ['position', 'aVel', 'aStart', 'aLife', 'aSize', 'aSeed']) {
      geo.attributes[name].needsUpdate = true;
    }
  }

  // a puff at a collision point: dust kicks outward and slightly up
  function impact(point, energy) {
    if (!dustParams.puffs || impactsThisFrame >= MAX_IMPACTS_PER_FRAME) return;
    impactsThisFrame++;
    const e = Math.min(energy, 6);
    const count = Math.min(26, Math.round((3 + e * 3.2) * dustParams.puffDensity));
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.25 + e * 0.11) * (0.4 + Math.random() * 0.8);
      spawnParticle(
        point.x + (Math.random() - 0.5) * 0.05,
        point.y + Math.random() * 0.03,
        point.z + (Math.random() - 0.5) * 0.05,
        Math.cos(ang) * spd,
        (0.12 + Math.random() * 0.3) * (0.5 + e * 0.12),
        Math.sin(ang) * spd,
        dustParams.puffLife * (0.7 + Math.random() * 0.6),
        (0.06 + e * 0.02) * dustParams.puffSize * (0.6 + Math.random() * 0.8)
      );
    }
    commit();
  }

  // a large area burst (bookquake / test button)
  function burst(center, radius, count) {
    if (!dustParams.puffs) return;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const spd = 0.3 + Math.random() * 0.8;
      spawnParticle(
        center.x + Math.cos(ang) * r,
        center.y + (Math.random() - 0.5) * radius * 0.8,
        center.z + Math.sin(ang) * r * 0.4,
        Math.cos(ang) * spd * 0.7,
        0.15 + Math.random() * 0.45,
        Math.sin(ang) * spd * 0.7,
        dustParams.puffLife * (0.8 + Math.random() * 0.8),
        (0.08 + Math.random() * 0.1) * dustParams.puffSize
      );
    }
    commit();
  }

  function update(t, camera) {
    now = t;
    impactsThisFrame = 0;
    material.uniforms.uTime.value = t;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    material.uniforms.uScaleH.value =
      size.y * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  }

  // GUI hooks: live-update uniforms from dustParams
  function refresh() {
    surfaceUniforms.uDustAmount.value = dustParams.surface;
    surfaceUniforms.uDustPatchiness.value = dustParams.patchiness;
    surfaceUniforms.uDustScale.value = dustParams.scale;
    surfaceUniforms.uDustBias.value = dustParams.topBias;
    surfaceUniforms.uDustColor.value.set(dustParams.color);
    material.uniforms.uColor.value.set(dustParams.color).lerp(new THREE.Color('#ffffff'), 0.2);
    material.uniforms.uOpacity.value = dustParams.puffOpacity;
  }

  return { surfaceUniforms, impact, burst, update, refresh };
}
