import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyWorldUVs } from './materials.js';

export const DEFAULT_PARAMS = {
  // dimensions (meters)
  width: 1.6,
  height: 2.2,
  depth: 0.38,
  // layout
  shelves: 4,       // interior shelves per column
  separations: 1,   // vertical dividers
  // construction
  thickness: 0.028,
  baseHeight: 0.12,
  crown: true,
  faceFrame: true,
  sidePanels: true,
  back: 'planks',   // 'planks' | 'flat' | 'open'
  // finish
  grainScale: 1.15,
  grainFlip: false,
};

// deterministic RNG so grain offsets don't flicker between rebuilds
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildBookcase(p, material) {
  const g = new THREE.Group();
  const rng = mulberry32(0x600dcafe);

  const t = p.thickness;
  const W = p.width, H = p.height, D = p.depth;
  const baseH = p.baseHeight;
  const edgeR = Math.min(0.0045, t / 3);

  // physics collision boxes ({size, position}) and open compartments for books.
  // thin boards get fattened collision boxes (cannon-es has no CCD, so fast books
  // tunnel straight through anything thinner than one step of travel); the faces
  // books actually rest against stay exactly on the visible surfaces.
  const colliders = [];
  const compartments = [];
  const addCollider = (w, h, d, x, y, z) => colliders.push({ size: [w, h, d], position: [x, y, z] });
  const fat = Math.max(0.08, p.thickness);
  const xPad = (fat - p.thickness) / 2; // how far side/divider colliders intrude into compartments

  // every board: rounded box, world-scale grain, unique grain offset
  const part = (w, h, d, { rotate = false, r = edgeR } = {}) => {
    const radius = Math.min(r, Math.min(w, h, d) / 2.001);
    const geo = new RoundedBoxGeometry(w, h, d, 2, radius);
    applyWorldUVs(geo, p.grainScale, rotate !== p.grainFlip, rng() * 4, rng() * 4);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  // ---- carcass -------------------------------------------------------------
  const carcassBottom = baseH;
  const carcassTop = H;
  const carcassH = carcassTop - carcassBottom;
  const cy = (carcassBottom + carcassTop) / 2;
  const Wi = W - 2 * t; // interior width

  for (const dir of [-1, 1]) {
    const side = part(t, carcassH, D, { rotate: true });
    side.position.set(dir * (W - t) / 2, cy, 0);
    addCollider(fat, carcassH, D, dir * (W - t) / 2, cy, 0);
  }
  const topBoard = part(Wi, t, D);
  topBoard.position.set(0, carcassTop - t / 2, 0);
  addCollider(Wi, fat, D, 0, carcassTop - t + fat / 2, 0); // bottom face stays put
  const bottomBoard = part(Wi, t, D);
  bottomBoard.position.set(0, carcassBottom + t / 2, 0);
  addCollider(Wi, fat, D, 0, carcassBottom + t - fat / 2, 0); // top face stays put

  const innerH = carcassH - 2 * t;

  // ---- back panel ----------------------------------------------------------
  const tb = 0.014;
  if (p.back === 'flat') {
    const back = part(Wi, innerH, tb, { rotate: true, r: 0.002 });
    back.position.set(0, cy, -D / 2 + tb / 2 + 0.001);
  } else if (p.back === 'planks') {
    // v-grooved plank back: individual boards with tiny gaps and depth jitter
    const gap = 0.0025;
    const n = Math.max(3, Math.round(Wi / 0.105));
    const pw = (Wi - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const plank = part(pw, innerH, tb, { rotate: true, r: 0.002 });
      plank.position.set(
        -Wi / 2 + pw / 2 + i * (pw + gap),
        cy,
        -D / 2 + tb / 2 + 0.001 + rng() * 0.0012
      );
    }
  }

  // shelves and dividers sit behind the face frame, in front of the back
  const backT = p.back === 'open' ? 0.002 : tb + 0.004;
  const shelfD = D - backT - 0.012;
  const shelfZ = -D / 2 + backT + shelfD / 2;

  // back panel collision: a thick wall whose front face is flush with the
  // interior back plane, so books thrown or dragged at the back stop dead
  // instead of passing through. z of that front plane is exported as backZ.
  const backZ = p.back === 'open' ? null : -D / 2 + backT;
  if (backZ !== null) {
    addCollider(Wi, innerH, fat, 0, cy, backZ - fat / 2); // front face at the interior back
  }

  // ---- vertical dividers (separations) --------------------------------------
  const cols = p.separations + 1;
  const colW = (Wi - p.separations * t) / cols;
  for (let i = 1; i <= p.separations; i++) {
    const x = -Wi / 2 + i * (colW + t) - t / 2;
    const divider = part(t, innerH, shelfD, { rotate: true });
    divider.position.set(x, cy, shelfZ);
    addCollider(fat, innerH, shelfD, x, cy, shelfZ);
  }

  // ---- shelves ---------------------------------------------------------------
  const shelfY = (s) => carcassBottom + t + (innerH * s) / (p.shelves + 1);
  for (let c = 0; c < cols; c++) {
    const cx = -Wi / 2 + c * (colW + t) + colW / 2;
    for (let s = 1; s <= p.shelves; s++) {
      const shelf = part(Math.max(colW - 0.002, 0.02), t, shelfD);
      shelf.position.set(cx, shelfY(s), shelfZ);
      addCollider(colW, fat, shelfD, cx, shelfY(s) + t / 2 - fat / 2, shelfZ); // top face stays put
    }
    // record the open compartments of this column for book placement,
    // inset so books never spawn inside the fattened colliders
    for (let gap = 0; gap <= p.shelves; gap++) {
      compartments.push({
        x0: cx - colW / 2 + xPad,
        x1: cx + colW / 2 - xPad,
        y0: gap === 0 ? carcassBottom + t : shelfY(gap) + t / 2,
        y1: gap === p.shelves ? carcassTop - t : shelfY(gap + 1) + t / 2 - fat,
        z0: shelfZ - shelfD / 2,
        z1: shelfZ + shelfD / 2,
      });
    }
  }

  // ---- face frame: proud stiles + rails around the front -----------------------
  if (p.faceFrame) {
    const fd = 0.02;
    const fz = D / 2 + fd / 2 - 0.004; // overlaps carcass front so no gap shows
    const railTopH = 0.085, railBotH = 0.105;
    const stileW = 0.062, midStileW = 0.052;

    const railTop = part(W, railTopH, fd);
    railTop.position.set(0, carcassTop - railTopH / 2, fz);
    addCollider(W, railTopH, fd, 0, carcassTop - railTopH / 2, fz);
    const railBot = part(W, railBotH, fd);
    railBot.position.set(0, carcassBottom + railBotH / 2, fz);
    addCollider(W, railBotH, fd, 0, carcassBottom + railBotH / 2, fz);

    const stileH = carcassH - railTopH - railBotH;
    const stileY = carcassBottom + railBotH + stileH / 2;
    for (const dir of [-1, 1]) {
      const stile = part(stileW, stileH, fd, { rotate: true });
      stile.position.set(dir * (W - stileW) / 2, stileY, fz);
      addCollider(stileW, stileH, fd, dir * (W - stileW) / 2, stileY, fz);
    }
    for (let i = 1; i <= p.separations; i++) {
      const x = -Wi / 2 + i * (colW + t) - t / 2;
      const stile = part(midStileW, stileH, fd, { rotate: true });
      stile.position.set(x, stileY, fz);
      addCollider(midStileW, stileH, fd, x, stileY, fz);
    }
  }

  // ---- recessed side panels: proud frame strips on the outer faces -------------
  if (p.sidePanels) {
    const proud = 0.013;
    const stripW = 0.07;
    const innerD = D - 2 * stripW;
    for (const dir of [-1, 1]) {
      const x = dir * (W / 2 + proud / 2 - 0.002);
      for (const zdir of [-1, 1]) {
        const v = part(proud, carcassH, stripW, { rotate: true, r: 0.003 });
        v.position.set(x, cy, zdir * (D - stripW) / 2);
      }
      const nPanels = Math.max(1, Math.round(carcassH / 0.95));
      for (let i = 0; i <= nPanels; i++) {
        let yc = carcassBottom + (carcassH * i) / nPanels;
        if (i === 0) yc = carcassBottom + stripW / 2;
        if (i === nPanels) yc = carcassTop - stripW / 2;
        const hStrip = part(proud, stripW, Math.max(innerD, 0.02), { r: 0.003 });
        hStrip.position.set(x, yc, 0);
      }
    }
  }

  // ---- crown: stepped cornice, three stacked layers, flush at the back ----------
  if (p.crown) {
    const layers = [
      { proud: 0.020, h: 0.034, y: H - 0.030 },
      { proud: 0.038, h: 0.027, y: H + 0.001 },
      { proud: 0.055, h: 0.021, y: H + 0.025 },
    ];
    for (const L of layers) {
      const c = part(W + 2 * L.proud, L.h, D + L.proud, { r: 0.005 });
      c.position.set(0, L.y + L.h / 2, L.proud / 2);
      addCollider(W + 2 * L.proud, L.h, D + L.proud, 0, L.y + L.h / 2, L.proud / 2);
    }
  }

  // ---- plinth base with cap molding ----------------------------------------------
  const bp = 0.018;
  const plinth = part(W + 2 * bp, baseH, D + bp, { r: 0.004 });
  plinth.position.set(0, baseH / 2, bp / 2);
  addCollider(W + 2 * bp, baseH, D + bp, 0, baseH / 2, bp / 2);
  const cap = part(W + 2 * (bp + 0.012), 0.022, D + bp + 0.012, { r: 0.006 });
  cap.position.set(0, baseH - 0.011, (bp + 0.012) / 2);

  return { group: g, colliders, compartments, backZ };
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}
