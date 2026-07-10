import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyWorldUVs } from './materials.js';

export const BOOK_DEFAULTS = {
  enabled: true,
  // cover colors are sampled straight off this editable ramp (no tinting)
  ramp: {
    s1: '#6e3b2e', s2: '#8a6d3b', s3: '#31435e', s4: '#4f6350', s5: '#5c4a3d',
  },
  darkness: 0.5,     // pulls cover tints toward deep, muted tones
  openChance: 0.3,   // fraction of books that fly open when knocked loose
  density: 0.78,     // how packed the shelves are
  lean: 0.22,        // chance of a leaning book
  stacks: 0.18,      // chance of a horizontal pile
  messiness: 0.4,    // depth misalignment + stack jitter
  scale: 1.0,        // global book size multiplier
  seed: 42,
  grab: true,        // interaction mode: grab & throw
  throwPower: 1.3,
};

const LEATHER_SCALE = 0.45; // meters of leather per texture tile

const MAX_BOOKS = 550;

// sample a color along the ramp: u in [0,1] walks across the stops, lerping
// between neighbours — books get the ramp's colors directly, untinted
function sampleRamp(stops, u) {
  const n = stops.length;
  if (n === 0) return new THREE.Color('#888888');
  if (n === 1) return new THREE.Color(stops[0]);
  const x = THREE.MathUtils.clamp(u, 0, 1) * (n - 1);
  const i = Math.min(Math.floor(x), n - 2);
  return new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i + 1]), x - i);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// axis-aligned box with a constant vertex color, pre-translated
function coloredBox(w, h, d, x, y, z, color) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

// a book: two cover boards + spine (at +z) overhanging a cream pages block.
// the pages are inset by an epsilon on every shared face so nothing is coplanar
// with the covers or spine (coplanar faces z-fight). merged with two material
// groups: [0] paper pages, [1] leather covers.
function makeBookGeometry(t, h, d, coverColor, pagesColor, uvSeed) {
  const ct = Math.min(0.0045, t * 0.18); // cover board thickness
  const o = Math.min(0.004, h * 0.03);   // cover overhang past the pages
  const e = 0.0005;                      // anti-z-fight inset
  const pages = coloredBox(t - 2 * ct - 2 * e, h - 2 * o, d - o - 2 * e, 0, 0, (o - e) / 2, pagesColor);
  const covers = mergeGeometries([
    coloredBox(ct, h, d, -(t - ct) / 2, 0, 0, coverColor),
    coloredBox(ct, h, d, (t - ct) / 2, 0, 0, coverColor),
    coloredBox(t - 2 * ct, h, ct, 0, 0, (d - ct) / 2, coverColor),
  ]);
  const geo = mergeGeometries([pages, covers], true);
  // world-scale leather grain, unique patch of hide per book
  applyWorldUVs(geo, LEATHER_SCALE, false, uvSeed * 4, uvSeed * 2.7);
  return geo;
}

// an articulated book that opens at the front cover only: the back cover,
// spine, and page block stay rigid; the front cover hinges at its joint with
// the spine, and a single thin first page trails it. same closed silhouette
// as the merged version, and no way to splay into a starburst.
function makeOpenableBook(t, h, d, coverColor, pagesColor, uvSeed, coverMat, pagesMat) {
  const ct = Math.min(0.0045, t * 0.18);
  const o = Math.min(0.004, h * 0.03);
  const e = 0.0005;
  const root = new THREE.Group();

  const partMesh = (geometry, mat) => {
    applyWorldUVs(geometry, LEATHER_SCALE, false, uvSeed * 4, uvSeed * 2.7);
    const m = new THREE.Mesh(geometry, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // rigid body of the book: pages + back cover + spine (grouped materials)
  const pagesGeo = coloredBox(t - 2 * ct - 2 * e, h - 2 * o, d - o - 2 * e, 0, 0, (o - e) / 2, pagesColor);
  const shellGeo = mergeGeometries([
    coloredBox(ct, h, d, -(t - ct) / 2, 0, 0, coverColor),
    coloredBox(t - 2 * ct, h, ct, 0, 0, (d - ct) / 2, coverColor),
  ]);
  const rigid = mergeGeometries([pagesGeo, shellGeo], true);
  applyWorldUVs(rigid, LEATHER_SCALE, false, uvSeed * 4, uvSeed * 2.7);
  const rigidMesh = new THREE.Mesh(rigid, [pagesMat, coverMat]);
  rigidMesh.castShadow = true;
  rigidMesh.receiveShadow = true;
  root.add(rigidMesh);

  // front cover hinges at its inner corner where it meets the spine
  const hingeZ = d / 2 - ct;
  const coverPivot = new THREE.Group();
  coverPivot.position.set((t - ct) / 2, 0, hingeZ);
  coverPivot.add(partMesh(coloredBox(ct, h, d, 0, 0, -hingeZ, coverColor), coverMat));
  root.add(coverPivot);

  // one thin first page that trails the cover as it opens
  const pagePivot = new THREE.Group();
  pagePivot.position.set((t - ct) / 2 - ct / 2 - 0.0008, 0, hingeZ);
  const pageD = d - o - ct;
  pagePivot.add(partMesh(coloredBox(0.0008, h - 2 * o, pageD, 0, 0, -pageD / 2, pagesColor), pagesMat));
  root.add(pagePivot);

  return {
    root,
    ctl: {
      cover: coverPivot,
      page: pagePivot,
      t: 0,
      opening: false,
      angle: 1.1 + Math.random() * 0.4, // 63..86 degrees when fully open
      phase: Math.random() * Math.PI * 2,
    },
  };
}

export function createBooksSystem(scene, camera, bookMaterials, setOrbitEnabled, onImpact) {
  const group = new THREE.Group();
  scene.add(group);

  // material index 0 = pages, 1 = leather covers (matches geometry groups)
  const materials = [bookMaterials.pages, bookMaterials.covers];

  let world = null;
  let jointBody = null;
  let books = []; // { mesh, body }
  let drag = null;
  let backZ = null; // z of the back panel's front face; dragged books can't cross it
  let currentParams = { ...BOOK_DEFAULTS };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // ---- world / static colliders ----------------------------------------------

  function clear() {
    endDrag();
    for (const b of books) {
      group.remove(b.mesh);
      b.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    books = [];
    world = null;
    jointBody = null;
  }

  function setupWorld(colliders) {
    world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    world.defaultContactMaterial.friction = 0.5;
    world.defaultContactMaterial.restitution = 0.05;
    // softer, more damped contacts + more solver iterations: stiff defaults
    // overcorrect penetrations in piles of light boxes, which makes stacked
    // books buzz indefinitely instead of settling
    world.defaultContactMaterial.contactEquationStiffness = 1e6;
    world.defaultContactMaterial.contactEquationRelaxation = 4;
    world.defaultContactMaterial.frictionEquationStiffness = 1e6;
    world.solver.iterations = 15;

    // studio floor (infinite plane; no back wall — books can sail off into the dark)
    const floor = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floor);

    for (const c of colliders) {
      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(c.size[0] / 2, c.size[1] / 2, c.size[2] / 2)),
      });
      body.position.set(c.position[0], c.position[1], c.position[2]);
      world.addBody(body);
    }

    // anchor for the mouse grab constraint
    jointBody = new CANNON.Body({ mass: 0 });
    jointBody.addShape(new CANNON.Sphere(0.01));
    jointBody.collisionFilterGroup = 0;
    jointBody.collisionFilterMask = 0;
    world.addBody(jointBody);
  }

  // ---- book spawning ------------------------------------------------------------

  function spawnBook(t, h, d, position, quaternion, rnd, bp) {
    // pick a color from the ramp (untinted); darkness still applies globally
    const cover = sampleRamp(Object.values(bp.ramp), rnd());
    // the leather diffuse is whitish, so the vertex tint carries the darkness
    cover.multiplyScalar(1 - 0.55 * bp.darkness);
    const pages = new THREE.Color('#f3ead6');
    pages.offsetHSL(0, 0, (rnd() - 0.5) * 0.06);

    // some books are articulated so they can fly open when knocked loose
    let mesh;
    let openCtl = null;
    if (rnd() < bp.openChance) {
      const openable = makeOpenableBook(t, h, d, cover, pages, rnd(), bookMaterials.covers, bookMaterials.pages);
      mesh = openable.root;
      openCtl = openable.ctl;
    } else {
      mesh = new THREE.Mesh(makeBookGeometry(t, h, d, cover, pages, rnd()), materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    group.add(mesh);

    const body = new CANNON.Body({
      mass: 800 * t * h * d, // ~paper density
      shape: new CANNON.Box(new CANNON.Vec3(t / 2, h / 2, d / 2)),
      angularDamping: 0.25,
      linearDamping: 0.08,
    });
    body.position.set(position.x, position.y, position.z);
    body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    body.sleepSpeedLimit = 0.6;
    body.sleepTimeLimit = 0.25;
    world.addBody(body);
    body.sleep(); // stay perfectly still until something disturbs it

    const rec = {
      mesh, body, lastPuff: 0,
      open: openCtl,
      home: { x: position.x, y: position.y, z: position.z },
    };

    // hard landings kick up a puff of dust at the contact point
    if (onImpact) {
      body.addEventListener('collide', (e) => {
        const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
        const tNow = performance.now();
        if (v < 1.15 || tNow - rec.lastPuff < 160) return;
        rec.lastPuff = tNow;
        const own = e.contact.bi === body;
        const src = own ? e.contact.bi : e.contact.bj;
        const r = own ? e.contact.ri : e.contact.rj;
        onImpact(new THREE.Vector3(
          src.position.x + r.x, src.position.y + r.y, src.position.z + r.z
        ), v);
      });
    }

    books.push(rec);
  }

  function bookDims(rnd, bp, compH, compD) {
    const t = (0.016 + rnd() * 0.045) * bp.scale;
    const h = Math.min((0.17 + rnd() * 0.17) * bp.scale, compH * 0.92);
    const d = Math.min((0.11 + rnd() * 0.05) * bp.scale, compD * 0.92);
    return { t, h, d };
  }

  // z placement: spines pulled to the shelf front, pushed back by messiness
  function bookZ(rnd, bp, comp, d) {
    const z = comp.z1 - d / 2 - 0.006 - rnd() * bp.messiness * 0.07;
    return Math.max(z, comp.z0 + d / 2);
  }

  function fillCompartment(comp, bp, rnd) {
    const compW = comp.x1 - comp.x0;
    const compH = comp.y1 - comp.y0;
    const compD = comp.z1 - comp.z0;
    if (compW < 0.06 || compH < 0.12) return;

    let cursor = comp.x0 + 0.006;
    const endX = comp.x1 - 0.006;
    let supportedLeft = true; // wall / previous books available to lean on
    let guard = 0;

    while (cursor < endX - 0.025 && books.length < MAX_BOOKS && guard++ < 200) {
      // density: chance to leave a breathing gap instead of placing anything
      if (rnd() > bp.density) {
        cursor += 0.03 + rnd() * 0.12;
        supportedLeft = false;
        continue;
      }

      const roll = rnd();
      if (roll < bp.stacks) {
        cursor = placeStack(comp, bp, rnd, cursor, endX, compH, compD);
        supportedLeft = true;
      } else if (roll < bp.stacks + bp.lean && supportedLeft) {
        cursor = placeLean(comp, bp, rnd, cursor, endX, compH, compD);
        supportedLeft = false; // don't chain leaners on a leaner
      } else {
        cursor = placeRun(comp, bp, rnd, cursor, endX, compH, compD);
        supportedLeft = true;
      }
    }
  }

  function placeRun(comp, bp, rnd, cursor, endX, compH, compD) {
    const n = 2 + Math.floor(rnd() * 7);
    for (let i = 0; i < n; i++) {
      const { t, h, d } = bookDims(rnd, bp, compH, compD);
      if (cursor + t > endX) break;
      spawnBook(
        t, h, d,
        new THREE.Vector3(cursor + t / 2, comp.y0 + h / 2, bookZ(rnd, bp, comp, d)),
        new THREE.Quaternion(),
        rnd, bp
      );
      cursor += t + 0.0008;
    }
    return cursor;
  }

  function placeLean(comp, bp, rnd, cursor, endX, compH, compD) {
    const { t, h, d } = bookDims(rnd, bp, compH, compD);
    const angle = 0.1 + rnd() * 0.22; // 6..18 degrees, tipping left onto support
    const aabbW = h * Math.sin(angle) + t * Math.cos(angle);
    const aabbH = h * Math.cos(angle) + t * Math.sin(angle);
    if (cursor + aabbW > endX || aabbH > compH * 0.98) {
      return placeRun(comp, bp, rnd, cursor, endX, compH, compD);
    }
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle));
    spawnBook(
      t, h, d,
      new THREE.Vector3(cursor + aabbW / 2, comp.y0 + aabbH / 2, bookZ(rnd, bp, comp, d)),
      q, rnd, bp
    );
    return cursor + aabbW + 0.002;
  }

  function placeStack(comp, bp, rnd, cursor, endX, compH, compD) {
    const n = 2 + Math.floor(rnd() * 4);
    const dims = [];
    for (let i = 0; i < n; i++) dims.push(bookDims(rnd, bp, compH, compD));
    dims.sort((a, b) => b.h - a.h); // biggest at the bottom

    if (cursor + dims[0].h > endX) {
      return placeRun(comp, bp, rnd, cursor, endX, compH, compD);
    }

    let stackY = comp.y0;
    let widest = 0;
    const baseX = cursor + dims[0].h / 2;
    for (const { t, h, d } of dims) {
      if (stackY + t > comp.y1 - 0.012) break;
      const yaw = (rnd() - 0.5) * bp.messiness * 0.35;
      const q = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(0, yaw, 0))
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)));
      spawnBook(
        t, h, d,
        new THREE.Vector3(
          baseX + (rnd() - 0.5) * bp.messiness * 0.03,
          stackY + t / 2,
          bookZ(rnd, bp, comp, d)
        ),
        q, rnd, bp
      );
      stackY += t;
      widest = Math.max(widest, h);
    }
    return cursor + widest + 0.006;
  }

  function rebuild(built, bp) {
    currentParams = bp;
    backZ = built.backZ ?? null;
    clear();
    setupWorld(built.colliders);
    if (!bp.enabled) return;
    built.compartments.forEach((comp, i) => {
      const rnd = mulberry32((bp.seed * 2654435761 + i * 7919 + 1) | 0);
      fillCompartment(comp, bp, rnd);
    });
  }

  // ---- grab & throw interaction ---------------------------------------------------

  function ndcFromEvent(e) {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }

  function endDrag() {
    if (!drag) return;
    if (world) world.removeConstraint(drag.constraint);
    drag.body.angularDamping = 0.12;
    const power = currentParams.throwPower;
    drag.body.velocity.scale(power, drag.body.velocity);
    const speed = drag.body.velocity.length();
    if (speed > 8) drag.body.velocity.scale(8 / speed, drag.body.velocity);
    drag = null;
    document.body.style.cursor = '';
    setOrbitEnabled(true);
  }

  function onPointerDown(e) {
    if (!currentParams.grab || !currentParams.enabled || e.button !== 0 || !world) return;
    ndcFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(group.children, true)[0];
    if (!hit) return;
    // articulated books are groups: walk up to the book's root object
    let obj = hit.object;
    while (obj.parent && obj.parent !== group) obj = obj.parent;
    const rec = books.find((b) => b.mesh === obj);
    if (!rec) return;

    e.stopPropagation(); // keep OrbitControls from starting a rotate
    setOrbitEnabled(false);

    rec.body.wakeUp();
    rec.body.angularDamping = 0.6; // steadier while carried
    const hitPoint = new CANNON.Vec3(hit.point.x, hit.point.y, hit.point.z);
    jointBody.position.copy(hitPoint);
    const pivot = rec.body.pointToLocalFrame(hitPoint);
    const constraint = new CANNON.PointToPointConstraint(
      rec.body, pivot, jointBody, new CANNON.Vec3(0, 0, 0), 1e3
    );
    world.addConstraint(constraint);
    drag = { body: rec.body, constraint, distance: hit.distance };
    document.body.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!drag) return;
    ndcFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const p = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, drag.distance);
    // don't let a fast drag teleport the book behind the back panel
    const pz = backZ !== null ? Math.max(p.z, backZ + 0.03) : p.z;
    jointBody.position.set(p.x, Math.max(p.y, 0.03), pz);
  }

  // capture phase on window so a grab wins over OrbitControls' own pointerdown
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', endDrag);

  // ---- extras ----------------------------------------------------------------------

  function bookquake() {
    let puffed = 0;
    for (const b of books) {
      b.body.wakeUp();
      b.body.velocity.set(
        (Math.random() - 0.5) * 5,
        1.5 + Math.random() * 4,
        Math.random() * 3.5
      );
      b.body.angularVelocity.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      // dust erupts off the shelves as the books blast out
      if (onImpact && puffed < 60 && Math.random() < 0.5) {
        puffed++;
        onImpact(new THREE.Vector3(
          b.body.position.x, b.body.position.y, b.body.position.z
        ), 2 + Math.random() * 2.5);
      }
    }
  }

  // fastest allowed book: must cross less than one collider thickness (8cm)
  // per 1/120s substep, or it would tunnel through the boards
  const MAX_SPEED = 8;
  let simTime = 0;

  function update(dt) {
    if (!world) return;
    simTime += dt;
    world.step(1 / 120, Math.min(dt, 0.05), 8);
    for (const b of books) {
      if (b.body.sleepState !== CANNON.Body.SLEEPING) {
        const v = b.body.velocity;
        const speed = v.length();
        if (speed > MAX_SPEED) v.scale(MAX_SPEED / speed, v);
        // settle assist: once a book is nearly still, bleed the residual
        // solver jitter so piles stop buzzing and actually fall asleep
        const isDragged = drag && drag.body === b.body;
        if (!isDragged && speed < 0.18 && b.body.angularVelocity.length() < 0.6) {
          v.scale(0.86, v);
          b.body.angularVelocity.scale(0.8, b.body.angularVelocity);
        }
        b.mesh.position.copy(b.body.position);
        b.mesh.quaternion.copy(b.body.quaternion);

        // articulated books spring open once they're properly knocked loose,
        // pages fluttering with speed, and stay open however they land
        if (b.open) {
          const o = b.open;
          if (!o.opening) {
            const dx = b.body.position.x - b.home.x;
            const dy = b.body.position.y - b.home.y;
            const dz = b.body.position.z - b.home.z;
            if (v.lengthSquared() > 2.2 || dx * dx + dy * dy + dz * dz > 0.02) {
              o.opening = true;
            }
          }
          if (o.opening) {
            o.t = Math.min(1, o.t + dt * 3.2);
            const ease = o.t * o.t * (3 - 2 * o.t);
            const A = o.angle * ease;
            const flutter = Math.min(1, v.lengthSquared() / 6) * ease;
            o.cover.rotation.y = -A;
            // the first page trails the cover, never passing it or the body
            const trail = 0.8 + 0.14 * Math.sin(simTime * 5.5 + o.phase) * flutter;
            o.page.rotation.y = -A * Math.min(trail, 0.96);
          }
        }
      }
    }
  }

  return { rebuild, update, bookquake, get count() { return books.length; } };
}
