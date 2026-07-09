import * as THREE from 'three';

export function createWoodMaterial(renderer) {
  const loader = new THREE.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const setup = (tex, srgb = false) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = aniso;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const map = setup(loader.load('/Wood027_1K-JPG_Color.jpg'), true);
  const normalMap = setup(loader.load('/Wood027_1K-JPG_NormalGL.jpg'));
  const roughnessMap = setup(loader.load('/Wood027_1K-JPG_Roughness.jpg'));

  return new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.9,
  });
}

// book materials: whitish leather tinted per-book via vertex colors, plus plain paper
export function createBookMaterials(renderer) {
  const loader = new THREE.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const setup = (tex, srgb = false) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = aniso;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const covers = new THREE.MeshStandardMaterial({
    map: setup(loader.load('/Leather025_1K-JPG_Color.jpg'), true),
    normalMap: setup(loader.load('/Leather025_1K-JPG_NormalGL.jpg')),
    roughnessMap: setup(loader.load('/Leather025_1K-JPG_Roughness.jpg')),
    normalScale: new THREE.Vector2(0.9, 0.9),
    vertexColors: true,
    roughness: 1.0,
    metalness: 0,
    envMapIntensity: 0.55,
  });

  const pages = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.35,
  });

  return { covers, pages };
}

/**
 * Injects a procedural settled-dust layer into a MeshStandardMaterial:
 * dust accumulates on upward-facing surfaces (with a faint grime film on
 * verticals), broken up by world-space value noise for patchiness. Blends
 * the albedo toward the dust color and lifts roughness where dust sits.
 * All dusted materials share the same uniform objects so one GUI change
 * updates wood, leather, and paper together — live, no rebuild.
 */
export function addDustLayer(material, uniforms, cacheKey) {
  material.customProgramCacheKey = () => `dusted-${cacheKey}`;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vDustWorldPos;
varying vec3 vDustNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vDustWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vDustNormal = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vDustWorldPos;
varying vec3 vDustNormal;
uniform float uDustAmount;
uniform float uDustPatchiness;
uniform float uDustScale;
uniform float uDustBias;
uniform vec3 uDustColor;
// sine-free hash (stable on ANGLE/D3D)
float dustHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float dustNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dustHash(i), dustHash(i + vec2(1.0, 0.0)), u.x),
    mix(dustHash(i + vec2(0.0, 1.0)), dustHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
{
  float dUp = pow(clamp(vDustNormal.y, 0.0, 1.0), uDustBias);
  vec2 dP = (vDustWorldPos.xz + vec2(vDustWorldPos.y * 0.61, vDustWorldPos.y * 0.27)) * uDustScale;
  float dN = 0.65 * dustNoise(dP) + 0.35 * dustNoise(dP * 3.1);
  float dCover = dUp * mix(1.0, smoothstep(0.25, 0.85, dN), uDustPatchiness);
  float dust = uDustAmount * dCover + uDustAmount * 0.12 * dN * (1.0 - dUp);
  dust = clamp(dust, 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, uDustColor, dust);
  roughnessFactor = mix(roughnessFactor, 1.0, dust * 0.9);
}`);
  };
  material.needsUpdate = true;
}

/**
 * Box-projects UVs in world-scale meters so wood grain density is identical on
 * every part no matter its dimensions. `rotate` swaps U/V so grain can run
 * along the length of vertical members. `ou`/`ov` offset the projection so no
 * two boards share the same patch of grain.
 */
export function applyWorldUVs(geometry, scale = 1.2, rotate = false, ou = 0, ov = 0) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    if (nx >= ny && nx >= nz) { u = z; v = y; }
    else if (ny >= nx && ny >= nz) { u = x; v = z; }
    else { u = x; v = y; }
    if (rotate) { const s = u; u = v; v = s; }
    uv.setXY(i, u / scale + ou, v / scale + ov);
  }
  uv.needsUpdate = true;
}
