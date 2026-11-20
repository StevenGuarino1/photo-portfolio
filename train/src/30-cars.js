// ---------- The train ----------
// Seven cars from the tail to the engine, each a room: the bunks at the back,
// freight, the galley, the greenhouse, the dining car, the captain's lounge,
// and the engine. Between each pair, a short vestibule and two doors. A car's
// front door stays locked until every guard in it is down.
const cars = [];
const doors = [];
function addCol(c, x0, x1, a0, a1, h = H) {
  const col = { x0, x1, z0: c.z0 + a0, z1: c.z0 + a1, h, on: true };
  c.cols.push(col);
  return col;
}
// Everything that might be in the way near z: the colliders of the car
// you're in and its neighbours.
function nearCols(z) {
  const i = Math.floor(z / STRIDE);
  const out = [];
  for (let k = i - 1; k <= i + 1; k++) if (cars[k]) for (const col of cars[k].cols) if (col.on) out.push(col);
  return out;
}

// Lamps: where the light comes from. A handful of real lights is shared out
// to the nearest lamps (see the light pool below); every lamp also has a
// glow and a bulb you can see.
const glowMats = new Map();
function glowSprite(color, scale, opacity = 0.55) {
  const key = color + ":" + opacity;
  if (!glowMats.has(key)) glowMats.set(key, new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  const s = new THREE.Sprite(glowMats.get(key));
  s.scale.setScalar(scale);
  return s;
}
function lamp(c, x, y, a, color, int, dist = 10, o = {}) {
  const L = { c, x, y, a, z: c.z0 + a, color: new THREE.Color(color), int, dist, flicker: o.flicker || 0, swing: o.swing || 0, phase: Math.random() * 10, pos: new THREE.Vector3(x, y, c.z0 + a) };
  const holder = new THREE.Group();
  holder.position.set(x, y, a);
  if (o.glow !== 0) holder.add(glowSprite(color, o.glow ?? 1.6, o.glowOpacity ?? 0.55));
  if (o.bulb !== false) holder.add(new THREE.Mesh(new THREE.SphereGeometry(o.bulbR ?? 0.07, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5) })));
  c.group.add(holder);
  L.holder = holder;
  c.lamps.push(L);
  return L;
}

// ---------- The shell of a car ----------
function makeCar(i, spec) {
  const c = { i, z0: i * STRIDE, group: new THREE.Group(), cols: [], lamps: [], spawns: [], pickups: [], enemies: [], pools: [], cleared: false, entered: false, ...spec };
  c.group.position.z = c.z0;
  scene.add(c.group);
  cars.push(c);
  return c;
}
function shell(c) {
  const { wall, low, lowH = 1.1, floor, ceil, win } = c;
  const ft = c.floorTile ?? 2;
  put(plane(2 * HW, CL, ft, ft), floor, { y: 0, z: CL / 2, rx: -Math.PI / 2 });
  if (!c.glassRoof) put(plane(2 * HW, CL, c.ceilTile ?? 2, c.ceilTile ?? 2), ceil, { y: H, z: CL / 2, rx: Math.PI / 2 });
  const wins = [];
  for (let a = win.start; a + win.w / 2 <= CL - win.start + win.w / 2 + 0.01; a += win.every) wins.push(a);
  c.wins = wins;
  const cuts = [0, ...wins.flatMap((a) => [a - win.w / 2, a + win.w / 2]), CL];
  for (const s of [-1, 1]) {
    const ry = -s * Math.PI / 2;
    const seg = (a0, a1, b0, b1, m, tw, th) => {
      if (a1 - a0 < 0.01 || b1 - b0 < 0.01) return;
      put(plane(a1 - a0, b1 - b0, tw, th, s > 0 ? a0 : CL - a1, b0), m, { x: s * HW, y: (b0 + b1) / 2, z: (a0 + a1) / 2, ry });
    };
    const piece = (a0, a1, y0, y1) => {
      if (low) {
        seg(a0, a1, y0, Math.min(y1, lowH), low, c.lowTW ?? 1.8, c.lowTH ?? lowH);
        seg(a0, a1, Math.max(y0, lowH), y1, wall, c.wallTile ?? 2, c.wallTile ?? 2);
      } else seg(a0, a1, y0, y1, wall, c.wallTile ?? 2, c.wallTile ?? 2);
    };
    for (let k = 0; k < cuts.length - 1; k++) {
      if (k % 2 === 0) piece(cuts[k], cuts[k + 1], 0, H);
      else {
        piece(cuts[k], cuts[k + 1], 0, win.sill);
        piece(cuts[k], cuts[k + 1], win.sill + win.h, H);
      }
    }
    if (low && !c.noRail) put(box(0.08, 0.08, CL), M.dark, { x: s * (HW - 0.04), y: lowH, z: CL / 2 });
    addCol(c, s > 0 ? HW : -HW - 0.4, s > 0 ? HW + 0.4 : -HW, -0.3, CL + 0.3);
    const frame = c.frame ?? M.dark;
    for (const a of wins) {
      const y = win.sill + win.h / 2;
      put(plane(win.w, win.h), glassMat, { x: s * (HW + 0.04), y, z: a, ry });
      put(box(0.14, win.h + 0.16, 0.08), frame, { x: s * (HW - 0.03), y, z: a - win.w / 2 - 0.04 });
      put(box(0.14, win.h + 0.16, 0.08), frame, { x: s * (HW - 0.03), y, z: a + win.w / 2 + 0.04 });
      put(box(0.14, 0.08, win.w + 0.16), frame, { x: s * (HW - 0.03), y: win.sill + win.h + 0.04, z: a });
      put(box(0.26, 0.06, win.w + 0.24), frame, { x: s * (HW - 0.1), y: win.sill - 0.03, z: a });
      if (win.mullion) put(box(0.06, win.h, 0.06), frame, { x: s * (HW - 0.01), y, z: a });
      if (c.boarded) for (const k of [0.15, 0.5, 0.86]) put(box(0.06, win.h * 0.2, win.w + 0.3, 1, 0.25), M.boards, { x: s * (HW - 0.06), y: win.sill + win.h * k, z: a, rx: (k - 0.5) * 0.12 });
      if (c.curtains) for (const d of [-1, 1]) put(plane(0.5, win.h + 0.7, 0.5, 1), M.velvet, { x: s * (HW - 0.07), y: y + 0.1, z: a + d * (win.w / 2 + 0.2), ry });
      // Moonlight through the right-hand windows lands on the floor.
      if (s > 0 && !c.noPools) {
        const xNear = HW - win.sill * 1.42;
        const xFar = Math.max(-HW + 0.2, HW - (win.sill + win.h) * 1.42);
        const pw = xNear - xFar;
        if (pw > 0.2) {
          const mat = new THREE.MeshBasicMaterial({ map: POOL, color: c.poolColor ?? 0x5a6c9c, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
          const pool = new THREE.Mesh(new THREE.PlaneGeometry(pw, win.w * 1.05), mat);
          pool.rotation.x = -Math.PI / 2;
          pool.position.set((xNear + xFar) / 2, 0.012, a - (win.sill + win.h / 2) * 0.5);
          c.group.add(pool);
          c.pools.push({ mat, a: pool.position.z, base: c.poolOpacity ?? 0.4 });
        }
      }
    }
  }
  // The end walls, thick enough to hold the sliding doors.
  const endMat = c.endWall ?? wall;
  for (const front of [false, true]) {
    if (front && c.noFrontDoor) continue;
    const a = front ? CL + 0.15 : -0.15;
    for (const s of [-1, 1]) {
      put(box(HW - DW, H, 0.3, 2, 2), endMat, { x: s * (HW + DW) / 2, y: H / 2, z: a });
      addCol(c, s > 0 ? DW : -HW, s > 0 ? HW : -DW, a - 0.15, a + 0.15);
      put(box(0.14, DH + 0.1, 0.42), M.iron, { x: s * (DW + 0.07), y: (DH + 0.1) / 2, z: a });
    }
    put(box(2 * DW, H - DH, 0.3, 2, 2), endMat, { x: 0, y: (H + DH) / 2, z: a });
    put(box(2 * DW + 0.28, 0.12, 0.42), M.iron, { x: 0, y: DH + 0.06, z: a });
  }
}

function makeDoor(c, front) {
  const a = front ? CL + 0.15 : -0.15;
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  const leaves = [-1, 1].map((s) => {
    const m = new THREE.Mesh(box(DW, DH, 0.08, DW, DH), M.door);
    m.position.set(s * DW / 2, DH / 2, a);
    c.group.add(m);
    return m;
  });
  for (const d of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.04), lampMat);
    l.position.set(0, DH + 0.3, a + d * 0.17);
    c.group.add(l);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff3020, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(0, DH + 0.3, a + (front ? -0.3 : 0.3));
  glow.scale.setScalar(0.9);
  c.group.add(glow);
  const door = { c, front, z: c.z0 + a, leaves, open: 0, target: 0, locked: true, lampMat, glow, col: addCol(c, -DW, DW, a - 0.15, a + 0.15) };
  doors.push(door);
  return door;
}
function setDoorLamp(d, green) {
  const col = green ? 0x60ff8a : 0xff3020;
  d.lampMat.color.set(col);
  d.glow.material.color.set(col);
}

// The vestibule between this car and the next: rubber bellows, a plated
// floor, cold light leaking through the folds, and the wind loud.
function vestibule(c) {
  const a0 = CL;
  const a1 = STRIDE;
  const am = (a0 + a1) / 2;
  put(plane(2 * VW, VL, 1, 1), M.plate, { y: 0, z: am, rx: -Math.PI / 2 });
  put(plane(2 * VW, VL, 0.5, 1), M.bellows, { y: VH, z: am, rx: Math.PI / 2 });
  for (const s of [-1, 1]) {
    put(plane(VL, VH, 0.5, VH), M.bellows, { x: s * VW, y: VH / 2, z: am, ry: -s * Math.PI / 2 });
    addCol(c, s > 0 ? VW : -VW - 0.4, s > 0 ? VW + 0.4 : -VW, a0, a1);
  }
  const leak = new THREE.MeshBasicMaterial({ color: 0x5f7cb0 });
  for (const s of [-1, 1]) for (const a of [a0 + 0.9, am, a1 - 0.9]) put(plane(0.035, VH - 0.3), leak, { x: s * (VW - 0.01), y: VH / 2, z: a, ry: -s * Math.PI / 2 });
  lamp(c, 0, VH - 0.12, am, 0xff4a2a, 2.2, 5, { glow: 0.9, bulbR: 0.06 });
}

// ---------- Props ----------
function solid(c, w, h, d, mat, x, a, { y = 0, tw = 1, th = 1, col = true, ry = 0 } = {}) {
  put(box(w, h, d, tw, th), mat, { x, y: y + h / 2, z: a, ry });
  if (col) addCol(c, x - w / 2, x + w / 2, a - d / 2, a + d / 2, y + h);
}
function crate(c, x, a, w, d, h, mat = M.crate) {
  if (h > 1.5) {
    put(box(w, h / 2, d, w, h / 2), mat, { x, y: h / 4, z: a });
    put(box(w * 0.9, h / 2, d * 0.9, w * 0.9, h / 2), mat, { x: x + 0.05, y: h * 0.75, z: a, ry: 0.06 });
  } else put(box(w, h, d, w, h), mat, { x, y: h / 2, z: a });
  addCol(c, x - w / 2, x + w / 2, a - d / 2, a + d / 2, h);
}
function barrel(c, x, a, mat = M.rust) {
  put(new THREE.CylinderGeometry(0.34, 0.34, 0.95, 12), mat, { x, y: 0.475, z: a });
  put(new THREE.CylinderGeometry(0.355, 0.355, 0.05, 12), M.dark, { x, y: 0.3, z: a });
  put(new THREE.CylinderGeometry(0.355, 0.355, 0.05, 12), M.dark, { x, y: 0.7, z: a });
  addCol(c, x - 0.34, x + 0.34, a - 0.34, a + 0.34, 0.95);
}
function fireBarrel(c, x, a) {
  barrel(c, x, a);
  const fire = new THREE.Group();
  for (const [col, sx, sy, y] of [[0xff6a1a, 0.9, 1.1, 0.25], [0xffb040, 0.5, 0.8, 0.15], [0xfff0c0, 0.25, 0.4, 0.05]]) {
    const s = glowSprite(col, 1, 0.9);
    s.scale.set(sx, sy, 1);
    s.position.y = y;
    fire.add(s);
  }
  fire.position.set(x, 1.0, a);
  c.group.add(fire);
  c.fires = (c.fires || []).concat(fire);
  lamp(c, x, 1.35, a, 0xff8a3a, 9, 10, { flicker: 1, glow: 2.4, bulb: false });
}
function bunk(c, s, a0, len) {
  const x = s * (HW - 0.52);
  for (const [dx, da] of [[-0.46, 0.05], [0.46, 0.05], [-0.46, len - 0.05], [0.46, len - 0.05]]) put(box(0.07, 2.6, 0.07), M.pipe, { x: x + dx, y: 1.3, z: a0 + da });
  const blankets = [M.blanketA, M.blanketB, M.blanketC];
  [0.35, 1.25, 2.15].forEach((y, k) => {
    put(box(1.0, 0.07, len), M.pipe, { x, y, z: a0 + len / 2 });
    put(box(0.9, 0.16, len - 0.2, 1, 1), blankets[(k + Math.round(a0)) % 3], { x, y: y + 0.11, z: a0 + len / 2 });
  });
  addCol(c, x - 0.52, x + 0.52, a0, a0 + len, 2.6);
}
function laundry(c, a, y = 2.9) {
  put(box(2 * HW - 2.2, 0.02, 0.02), M.dark, { y, z: a });
  const r = rng(Math.round(a * 13));
  for (let x = -HW + 1.6; x < HW - 1.6; x += 0.6 + r() * 0.8) {
    const h = 0.3 + r() * 0.35;
    put(plane(0.3 + r() * 0.25, h, 1, 1), r() < 0.5 ? M.rag : M.blanketB, { x, y: y - h / 2, z: a + (r() - 0.5) * 0.05, ry: (r() - 0.5) * 0.3 });
  }
}
function pipes(c, xs, y = H - 0.25) {
  for (const x of xs) put(new THREE.CylinderGeometry(0.09, 0.09, CL, 8), M.pipe, { x, y, z: CL / 2, rx: Math.PI / 2 });
}
function counter(c, x0, x1, a0, a1, h = 0.95, top = M.counter, body = M.steel) {
  const w = x1 - x0;
  const d = a1 - a0;
  put(box(w, h - 0.06, d, 1, 1), body, { x: (x0 + x1) / 2, y: (h - 0.06) / 2, z: (a0 + a1) / 2 });
  put(box(w + 0.06, 0.06, d + 0.06, 1, 1), top, { x: (x0 + x1) / 2, y: h - 0.03, z: (a0 + a1) / 2 });
  addCol(c, x0, x1, a0, a1, h);
}
const plantMat = new THREE.MeshLambertMaterial({ map: T.bush, emissiveMap: T.bush, emissive: 0x404040, alphaTest: 0.5, side: THREE.DoubleSide });
const treeMat = new THREE.MeshLambertMaterial({ map: T.tree, emissiveMap: T.tree, emissive: 0x404040, alphaTest: 0.5, side: THREE.DoubleSide });
function plant(x, y, a, s, mat = plantMat) {
  const hgt = mat === treeMat ? s * 1.5 : s;
  for (const ry of [0.4, 0.4 + Math.PI / 2]) put(plane(s, hgt, s, hgt), mat, { x, y: y + hgt / 2, z: a, ry });
}
function planter(c, x, a0, a1, w = 1.2) {
  put(box(w, 0.62, a1 - a0, 1, 0.62), M.slats, { x, y: 0.31, z: (a0 + a1) / 2 });
  put(plane(w - 0.1, a1 - a0 - 0.1, 1, 1), M.soil, { x, y: 0.63, z: (a0 + a1) / 2, rx: -Math.PI / 2 });
  addCol(c, x - w / 2, x + w / 2, a0, a1, 0.62);
  const r = rng(Math.round(a0 * 7 + x * 3));
  for (let a = a0 + 0.5; a < a1 - 0.3; a += 0.55 + r() * 0.3) plant(x + (r() - 0.5) * 0.5, 0.6, a, 0.8 + r() * 0.7);
}
function table(c, x, a, lampOn = true) {
  put(box(1.2, 0.05, 1.2, 1, 1), M.cloth, { x, y: 0.77, z: a });
  put(box(1.24, 0.42, 1.24, 1, 1), M.cloth, { x, y: 0.55, z: a });
  for (const d of [-1, 1]) {
    put(box(0.46, 0.06, 0.46), M.leather, { x: x + d * 0.85, y: 0.46, z: a });
    put(box(0.06, 0.6, 0.46), M.wood, { x: x + d * 1.08, y: 0.75, z: a });
  }
  addCol(c, x - 0.62, x + 0.62, a - 0.62, a + 0.62, 0.8);
  if (lampOn) {
    put(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), M.brass, { x, y: 0.94, z: a });
    const shadeM = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.12, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb066, side: THREE.DoubleSide }));
    shadeM.position.set(x, 1.1, a);
    c.group.add(shadeM);
    const g = glowSprite(0xff9a40, 1.1, 0.5);
    g.position.set(x, 1.08, a);
    c.group.add(g);
  }
}
function armchair(c, x, a, ry = 0) {
  const g = new THREE.Group();
  const mk = (w, h, d, px_, py, pz) => { const m = new THREE.Mesh(box(w, h, d, 0.5, 0.5), M.leather); m.position.set(px_, py, pz); g.add(m); };
  mk(0.9, 0.42, 0.85, 0, 0.21, 0);
  mk(0.9, 0.7, 0.18, 0, 0.7, -0.36);
  mk(0.16, 0.3, 0.85, -0.45, 0.55, 0);
  mk(0.16, 0.3, 0.85, 0.45, 0.55, 0);
  g.position.set(x, 0, a);
  g.rotation.y = ry;
  g.updateMatrixWorld(true);
  g.traverse((m) => { if (m.isMesh) put(m.geometry.clone().applyMatrix4(m.matrixWorld), m.material); });
  addCol(c, x - 0.5, x + 0.5, a - 0.5, a + 0.5, 1.0);
}
function ceilingLight(c, x, a, color, int, dist = 11, o = {}) {
  put(box(0.9, 0.05, 0.25), M.iron, { x, y: H - 0.03, z: a });
  return lamp(c, x, H - 0.12, a, color, int, dist, { glow: 2.0, bulbR: 0.09, ...o });
}
function hangingLamp(c, x, a, color, int, dist = 11, drop = 0.9) {
  put(box(0.03, drop, 0.03), M.dark, { x, y: H - drop / 2, z: a });
  return lamp(c, x, H - drop - 0.1, a, color, int, dist, { swing: drop, glow: 2.0, bulbR: 0.1 });
}
function chandelier(c, a) {
  put(box(0.03, 0.6, 0.03), M.brass, { y: H - 0.3, z: a });
  put(new THREE.TorusGeometry(0.45, 0.03, 6, 16), M.brass, { y: H - 0.75, z: a, rx: Math.PI / 2 });
  for (let k = 0; k < 6; k++) {
    const t = (k / 6) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
    m.position.set(Math.cos(t) * 0.45, H - 0.68, a + Math.sin(t) * 0.45);
    c.group.add(m);
  }
  return lamp(c, 0, H - 0.8, a, 0xffc890, 18, 15, { glow: 3.0, bulb: false });
}
function health(c, x, a, y = 0) { c.pickups.push({ kind: "health", x, a, y }); }

// ---------- The seven cars ----------
const SPECS = [
  {
    title: "The Tail", sub: "Where they kept you.",
    wall: M.rust, floor: M.planks, ceil: M.rust, boarded: true, noPools: false, poolOpacity: 0.32,
    win: { w: 1.0, h: 0.55, sill: 2.75, every: 3.6, start: 3.4 },
    hemi: [0x5a4030, 0x140c08, 0.5], fog: 0x0e0b0a,
    build(c) {
      for (const s of [-1, 1]) for (const a0 of [1.6, 5.6, 9.6, 13.6]) bunk(c, s, a0, 3.6);
      pipes(c, [-2.6, -2.35, 2.5]);
      fireBarrel(c, -1.7, 7.4);
      fireBarrel(c, 1.9, 14.2);
      laundry(c, 4.6);
      laundry(c, 10.8, 3.0);
      laundry(c, 17.4);
      solid(c, 1.2, 0.72, 0.8, M.planks, 0.9, 3.6, { tw: 1, th: 1 });
      for (const [x, a] of [[0.2, 3.1], [1.6, 4.1]]) solid(c, 0.32, 0.45, 0.32, M.planks, x, a, { col: false });
      crate(c, -0.6, 11.2, 0.9, 0.9, 0.9);
      // The guards' barricade near the front.
      crate(c, -2.3, 22, 2.0, 0.8, 1.15, M.ammo);
      crate(c, 2.2, 22.4, 2.2, 0.8, 1.25, M.ammo);
      crate(c, -3.9, 24.8, 1.0, 1.4, 2.2, M.ammo);
      crate(c, 3.8, 25.6, 1.1, 1.1, 1.0, M.ammo);
      barrel(c, 0.2, 19.6);
      lamp(c, 0, H - 0.4, 10.5, 0xffc070, 3.5, 9, { glow: 1.3 });
      lamp(c, 0, H - 0.4, 23.5, 0xffe0b0, 6, 11, { glow: 1.6 });
      health(c, -3.2, 18.6);
      c.spawns.push(["brute", -1.2, 20.4], ["brute", 2.4, 20.8], ["gunner", -2.4, 24.6], ["gunner", 2.0, 25.4]);
    },
  },
  {
    title: "Freight", sub: "Everything they took from you.",
    wall: M.steel, floor: M.grate, ceil: M.steel, floorTile: 1.5,
    win: { w: 1.3, h: 0.45, sill: 3.5, every: 4, start: 3 },
    hemi: [0x34405a, 0x0a0b0e, 0.55], fog: 0x0a0e16,
    build(c) {
      pipes(c, [-3.6, 3.6]);
      for (const [x, a, w, d, h, m] of [
        [-3.2, 3.2, 1.8, 1.6, 2.4], [2.8, 4.6, 2.2, 1.6, 1.3], [-0.6, 8.2, 1.4, 1.4, 1.4], [3.2, 10.2, 2.0, 2.4, 2.6],
        [-3.0, 12.4, 2.4, 2.0, 1.2, M.ammo], [0.9, 14.8, 1.6, 1.6, 2.2], [-2.0, 18.2, 1.4, 1.4, 1.4], [3.0, 19.4, 2.0, 1.6, 1.2, M.ammo],
        [-3.3, 22.4, 1.8, 2.0, 2.6], [1.4, 23.8, 2.0, 1.4, 1.3], [-3.6, 7.0, 1.2, 1.2, 1.0],
      ]) crate(c, x, a, w, d, h, m);
      barrel(c, 1.6, 2.0, M.steel); barrel(c, 2.3, 2.3, M.steel); barrel(c, -1.2, 26.2, M.steel);
      for (const a of [4, 11, 18, 25]) hangingLamp(c, 0, a, 0xffd8a0, 7.5, 11);
      health(c, -3.9, 15.2);
      c.spawns.push(["brute", -1.0, 13.0], ["gunner", 3.0, 16.4], ["brute", -2.6, 20.6], ["brute", 2.0, 21.6], ["gunner", -3.0, 25.8], ["gunner", 1.4, 26.4]);
    },
  },
  {
    title: "The Galley", sub: "Real food. You can smell it.",
    wall: M.cream, low: M.tile, lowH: 1.6, lowTW: 1, lowTH: 1, floor: M.checker, ceil: M.counter, floorTile: 2,
    win: { w: 1.4, h: 1.0, sill: 1.6, every: 3.6, start: 2.6 },
    hemi: [0x50586a, 0x14100c, 0.6], fog: 0x0e1016,
    build(c) {
      for (const s of [-1, 1]) {
        counter(c, s > 0 ? HW - 0.85 : -HW, s > 0 ? HW : -HW + 0.85, 1.6, 11.6);
        counter(c, s > 0 ? HW - 0.85 : -HW, s > 0 ? HW : -HW + 0.85, 15.8, 25.8);
        solid(c, 1.0, 2.4, 2.0, M.steel, s * (HW - 0.5), 13.7, { tw: 1, th: 1 });
        for (const a of [3.5, 7.5, 19.5, 23.5]) {
          const plateM = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ color: 0xff5a1a }));
          plateM.rotation.x = -Math.PI / 2;
          plateM.position.set(s * (HW - 0.45), 0.96, a);
          c.group.add(plateM);
          put(new THREE.CylinderGeometry(0.2, 0.17, 0.26, 10), M.iron, { x: s * (HW - 0.45), y: 1.09, z: a });
          c.steam = (c.steam || []).concat({ x: s * (HW - 0.45), a });
        }
      }
      counter(c, -1.0, 1.0, 7.0, 11.0);
      counter(c, -1.0, 1.0, 17.0, 21.0);
      for (const a of [9, 19]) {
        put(box(1.6, 0.04, 3.6), M.iron, { y: 3.2, z: a });
        for (const d of [-1.4, -0.5, 0.4, 1.3]) put(new THREE.CylinderGeometry(0.16, 0.13, 0.22, 10), M.iron, { x: (d % 1) * 0.6, y: 2.95, z: a + d });
      }
      for (const a of [5, 11, 17, 23]) ceilingLight(c, 0, a, 0xe8f0ff, 9, 13);
      lamp(c, -HW + 0.5, 1.3, 5.5, 0xff6a20, 2.5, 4, { glow: 0.8, bulb: false, flicker: 0.3 });
      lamp(c, HW - 0.5, 1.3, 21.5, 0xff6a20, 2.5, 4, { glow: 0.8, bulb: false, flicker: 0.3 });
      c.pickups.push({ kind: "repeater", x: 0, a: 9, y: 0.96 });
      health(c, 2.6, 13.6);
      c.spawns.push(["brute", 0, 14.2], ["gunner", -3.0, 15.0], ["gunner", 3.2, 18.2], ["brute", -2.0, 20.2], ["brute", 2.4, 22.4], ["gunner", -1.8, 23.6], ["gunner", 2.0, 25.6]);
    },
  },
  {
    title: "The Greenhouse", sub: "Something still grows at the end of the world.",
    wall: M.cream, floor: M.slats, ceil: M.cream, glassRoof: true, poolColor: 0x5a7aa0, poolOpacity: 0.45,
    win: { w: 2.3, h: 2.7, sill: 0.75, every: 2.8, start: 1.6, mullion: true }, frame: M.cream,
    hemi: [0x40605a, 0x0c140e, 0.75], fog: 0x0a1414,
    build(c) {
      // The glass roof, on ribs.
      put(plane(2 * HW, CL, 1, 1), glassMat, { y: H + 0.02, z: CL / 2, rx: Math.PI / 2 });
      for (let a = 0; a <= CL; a += 2.8) put(box(2 * HW, 0.12, 0.1), M.cream, { y: H - 0.06, z: a });
      for (const x of [-HW + 0.05, -1.5, 1.5, HW - 0.05]) put(box(0.1, 0.12, CL), M.cream, { x, y: H - 0.06, z: CL / 2 });
      for (const s of [-1, 1]) { planter(c, s * 2.4, 3, 12); planter(c, s * 2.4, 16, 25); }
      for (const [x, a] of [[0, 14], [-3.9, 14], [3.9, 14]]) {
        put(new THREE.CylinderGeometry(0.42, 0.34, 0.6, 10), M.planks, { x, y: 0.3, z: a });
        addCol(c, x - 0.42, x + 0.42, a - 0.42, a + 0.42, 0.6);
        plant(x, 0.55, a, 1.5, treeMat);
      }
      for (const s of [-1, 1]) for (const [a, col] of [[7.5, 0xb87cff], [20.5, 0xffb070]]) {
        put(box(0.16, 0.06, 6), M.iron, { x: s * 2.4, y: 3.3, z: a });
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 5.8), new THREE.MeshBasicMaterial({ color: col }));
        strip.rotation.x = Math.PI / 2;
        strip.position.set(s * 2.4, 3.26, a);
        c.group.add(strip);
        lamp(c, s * 2.4, 3.1, a, col, col === 0xffb070 ? 6 : 4, 9, { glow: 2.4, bulb: false });
      }
      health(c, -3.9, 8);
      c.spawns.push(["gunner", -2.4, 13.6], ["gunner", 2.6, 14.6], ["brute", 0, 18], ["brute", 1.5, 21], ["brute", -1.0, 23], ["gunner", -3.9, 24], ["gunner", 3.9, 25.2]);
    },
  },
  {
    title: "Dining", sub: "White linen. Silver. They never knew you were back there.",
    wall: M.damask, low: M.wood, lowH: 1.1, floor: M.carpet, ceil: M.cream, curtains: true, frame: M.wood,
    win: { w: 1.8, h: 1.5, sill: 1.05, every: 3.5, start: 2.4 },
    hemi: [0x7a5a44, 0x24140c, 0.7], fog: 0x120c0a,
    build(c) {
      for (const s of [-1, 1]) for (const a of [4, 8, 12, 16, 20, 24]) table(c, s * 2.6, a);
      solid(c, 0.8, 1.0, 1.2, M.wood, 0.4, 14.2, { tw: 1, th: 1 });
      for (const a of [7, 14, 21]) chandelier(c, a);
      health(c, -3.9, 14);
      health(c, 3.9, 6);
      c.spawns.push(["gunner", -2.6, 10.2], ["brute", -1.0, 12.2], ["gunner", 2.6, 14.6], ["brute", 1.0, 17.0], ["gunner", -2.6, 18.4], ["brute", -0.5, 22.0], ["gunner", 2.6, 22.6], ["brute", 3.7, 25.4], ["gunner", 0, 26.2]);
    },
  },
  {
    title: "The Lounge", sub: "The captain keeps his fire lit.",
    wall: M.greenwall, low: M.wood, lowH: 1.1, floor: M.carpetBlue, ceil: M.cream, curtains: true, frame: M.wood,
    win: { w: 2.4, h: 1.7, sill: 0.95, every: 4.4, start: 3.2 },
    hemi: [0x4a5a50, 0x100c0a, 0.6], fog: 0x0c100e,
    build(c) {
      // Shelves of books between the windows on the left.
      for (const a of [5.4, 9.8, 14.2, 18.6, 23.0]) put(plane(1.6, 2.6, 1, 1), M.books, { x: -HW + 0.06, y: 1.9, z: a, ry: Math.PI / 2 });
      // The grand piano.
      solid(c, 1.5, 0.35, 2.0, M.black, -2.4, 8.8, { y: 0.7 });
      put(box(1.5, 0.04, 2.0), M.black, { x: -2.6, y: 1.4, z: 8.8, rz: 0.6 });
      for (const [dx, da] of [[-0.6, -0.8], [0.6, -0.8], [0, 0.85]]) put(box(0.08, 0.7, 0.08), M.black, { x: -2.4 + dx, y: 0.35, z: 8.8 + da });
      put(box(0.6, 0.45, 0.35), M.leather, { x: -1.3, y: 0.22, z: 8.0 });
      // The bar, and bottles behind it.
      counter(c, HW - 1.1, HW - 0.5, 14.6, 22.2, 1.12, M.brass, M.wood);
      const r = rng(5);
      for (let a = 14.8; a < 22; a += 0.18) put(new THREE.CylinderGeometry(0.035, 0.04, 0.3, 6), r() < 0.5 ? M.blanketB : M.blanketC, { x: HW - 0.2, y: 1.65 + ((r() * 2) | 0) * 0.5, z: a });
      put(box(0.3, 0.04, 7.6), M.wood, { x: HW - 0.18, y: 1.48, z: 18.4 });
      put(box(0.3, 0.04, 7.6), M.wood, { x: HW - 0.18, y: 1.98, z: 18.4 });
      // Armchairs round low tables.
      for (const [x, a, ry] of [[1.6, 5.4, Math.PI * 0.9], [2.8, 7.0, -Math.PI * 0.6], [-2.8, 16.4, Math.PI * 0.5], [-2.8, 19.0, Math.PI * 0.5], [1.2, 24.0, Math.PI]]) armchair(c, x, a, ry);
      solid(c, 0.8, 0.45, 0.8, M.wood, 2.4, 6.0);
      solid(c, 0.8, 0.45, 1.2, M.wood, -1.8, 17.7);
      // A fire in a real fireplace, on the right.
      solid(c, 0.6, 1.5, 2.2, M.tile, HW - 0.3, 10.6, { tw: 0.5, th: 0.5 });
      const hearth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ color: 0xff7a24 }));
      hearth.position.set(HW - 0.61, 0.5, 10.6);
      hearth.rotation.y = -Math.PI / 2;
      c.group.add(hearth);
      c.fires = [hearth];
      lamp(c, HW - 1.0, 0.7, 10.6, 0xff8a3a, 10, 10, { flicker: 1, glow: 2.6, bulb: false });
      lamp(c, -HW + 0.6, 1.7, 22.5, 0xffc080, 5, 8, { glow: 1.6 });
      chandelier(c, 14);
      ceilingLight(c, 0, 24, 0xffd6a0, 6, 10);
      health(c, -3.8, 12);
      health(c, 3.0, 2.4);
      c.spawns.push(["brute", -1.5, 18.6], ["captain", 0, 22.4], ["gunner", 3.6, 24.4], ["gunner", -3.4, 25.2]);
    },
  },
  {
    title: "The Engine", sub: "It never stops.",
    wall: M.steel, floor: M.plate, ceil: M.steel, noFrontDoor: true, floorTile: 1,
    win: { w: 1.3, h: 0.45, sill: 3.5, every: 4, start: 3 },
    hemi: [0x8a6a40, 0x2a1a0c, 1.0], fog: 0x140e08,
    build(c) {
      // The great engine down the middle, glowing at the seams.
      put(new THREE.CylinderGeometry(1.35, 1.35, 13, 20), M.iron, { y: 1.55, z: 15, rx: Math.PI / 2 });
      addCol(c, -1.4, 1.4, 8.5, 21.5, 2.9);
      for (let a = 9.5; a < 21; a += 1.8) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.37, 0.06, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
        ring.position.set(0, 1.55, a);
        c.group.add(ring);
      }
      for (const s of [-1, 1]) {
        put(new THREE.CylinderGeometry(0.15, 0.15, CL - 4, 8), M.pipe, { x: s * 3.4, y: 3.6, z: CL / 2, rx: Math.PI / 2 });
        put(box(0.05, 1.0, 13), M.brass, { x: s * 2.0, y: 0.5, z: 15 });
        addCol(c, s > 0 ? 1.95 : -2.05, s > 0 ? 2.05 : -1.95, 8.5, 21.5, 1.0);
      }
      for (const a of [5, 15, 24]) lamp(c, 0, 3.9, a, 0xffa040, 16, 14, { glow: 3, bulb: false, flicker: 0.15 });
      // The firebox door at the back end of the engine, glowing through its grille.
      const fireDoor = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: 0xff7a24 }));
      fireDoor.position.set(0, 1.55, 8.44);
      fireDoor.rotation.y = Math.PI;
      c.group.add(fireDoor);
      c.fires = [fireDoor];
      for (let k = -3; k <= 3; k++) put(box(0.07, 1.8 * Math.sqrt(1 - (k / 3.6) ** 2), 0.05), M.black, { x: k * 0.24, y: 1.55, z: 8.4 });
      lamp(c, 0, 1.55, 7.6, 0xff7a30, 10, 9, { glow: 3.4, bulb: false, flicker: 0.6 });
      // The front: a wide window onto the tracks ahead.
      const fz = CL + 0.15;
      for (const s of [-1, 1]) put(box(HW - 1.9, H, 0.3, 2, 2), M.steel, { x: s * (HW + 1.9) / 2, y: H / 2, z: fz });
      put(box(3.8, 1.2, 0.3, 2, 2), M.steel, { y: 0.6, z: fz });
      put(box(3.8, H - 3.0, 0.3, 2, 2), M.steel, { y: (H + 3.0) / 2, z: fz });
      put(plane(3.8, 1.8), glassMat, { y: 2.1, z: fz + 0.1, ry: Math.PI });
      addCol(c, -HW, HW, CL, CL + 0.3);
      put(box(3.0, 1.0, 0.8, 1, 1), M.iron, { y: 0.5, z: CL - 0.8 });
      addCol(c, -1.5, 1.5, CL - 1.2, CL, 1.0);
      for (let k = 0; k < 7; k++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: [0x60ff8a, 0xffb040, 0xff4030][k % 3] }));
        b.position.set(-1.2 + k * 0.4, 1.02, CL - 1.21);
        c.group.add(b);
      }
    },
  },
];

function buildTrain() {
  SPECS.forEach((spec, i) => {
    const c = makeCar(i, spec);
    shell(c);
    spec.build(c);
    if (i < SPECS.length - 1) vestibule(c);
    flush(c.group);
    c.back = makeDoor(c, false); // the tail's stays shut for good
    c.frontDoor = i < SPECS.length - 1 ? makeDoor(c, true) : null;
  });
  // The very back of the train stays shut.
  cars[0].sealed = true;
}
buildTrain();

// ---------- The light pool ----------
// Eight real lights, handed out to the lamps nearest you; everything else
// glows but casts nothing. (A fixed number, so nothing recompiles.)
const POOL_N = 8;
const lightPool = Array.from({ length: POOL_N }, () => {
  const l = new THREE.PointLight(0xffffff, 0, 10, 1.25);
  scene.add(l);
  return { l, lamp: null };
});
const hemi = new THREE.HemisphereLight(0x5a4030, 0x140c08, 0.5);
scene.add(hemi);
const moonLight = new THREE.DirectionalLight(0x8ea4dc, 0.28);
moonLight.position.copy(MOON_DIR).multiplyScalar(50);
scene.add(moonLight);
const hemiSky = new THREE.Color();
const hemiGround = new THREE.Color();
const fogCol = new THREE.Color();
let lightTimer = 0;
function updateLights(dt, t, pz, visible) {
  lightTimer -= dt;
  if (lightTimer <= 0) {
    lightTimer = 0.2;
    const cand = [];
    for (const c of visible) for (const L of c.lamps) cand.push(L);
    cand.sort((a, b) => Math.abs(a.z - pz) - Math.abs(b.z - pz));
    lightPool.forEach((p, k) => (p.lamp = cand[k] || null));
  }
  for (const L of visible.flatMap((c) => c.lamps)) {
    if (L.swing) {
      const sw = Math.sin(t * 1.3 + L.phase) * 0.12 + trainSway * 0.08;
      L.holder.position.x = L.x + Math.sin(sw) * L.swing;
      L.holder.position.y = L.y + (1 - Math.cos(sw)) * L.swing;
    }
    L.pos.set(L.holder.position.x, L.holder.position.y, L.z);
    L.k = L.flicker ? 1 - L.flicker * (0.25 * Math.sin(t * 13 + L.phase) * Math.sin(t * 7.3) + 0.15 * Math.random()) : 1;
  }
  for (const { l, lamp: L } of lightPool) {
    if (!L) { l.intensity = 0; continue; }
    l.position.copy(L.pos);
    l.color.copy(L.color);
    l.distance = L.dist;
    l.intensity = L.int * L.k;
  }
}
