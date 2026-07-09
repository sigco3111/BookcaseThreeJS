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
