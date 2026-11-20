// ---------- Towns ----------
// Each town is a grid of blocks; each block is one of: towers (downtown),
// mid-rise streets of shops and flats, houses with gardens, or park. Trees
// line every sidewalk. Built in the town's own coordinates inside a group
// sitting at the town's corner and height.
const LIGHT_COLS = [new THREE.Color(0x30ff6a), new THREE.Color(0xffc21a), new THREE.Color(0xff3020)];
function lightFor(n, axis, t) {
  const ph = (t + n.phase) % 20;
  if (axis === "z") return ph < 8 ? 0 : ph < 10 ? 1 : 2;
  return ph >= 10 && ph < 18 ? 0 : ph >= 18 ? 1 : 2;
}

// Roofs, awnings and other shared bits.
const roofMat = (c) => { const m = new THREE.MeshLambertMaterial({ color: c }); m.prism = new THREE.MeshLambertMaterial({ color: c }); return m; };
const ROOFS = {
  tile: [0xc0623f, 0xb5532f, 0x8a4a3a, 0x55606e, 0x3f4650, 0x6b7f5a, 0x7a5a44, 0x9a3a2a, 0x4a5a72, 0x2f3338].map(roofMat),
  metal: [0x5f9e8a, 0x3f4650, 0xb89a4a, 0x8a9098].map(roofMat),
  slate: [0x3f4650, 0x55606e, 0x2f3338].map(roofMat),
};
const AWNINGS = [0xc8553d, 0x2f7d6d, 0xe0a030, 0x2d5f9a, 0xf2efe6, 0x7a4f9a, 0x3b7d3b, 0xd94f7a].map((c) => new THREE.MeshLambertMaterial({ color: c }));
Object.assign(M, {
  stone: new THREE.MeshLambertMaterial({ color: 0xd9d2c2 }),
  brick: new THREE.MeshLambertMaterial({ color: 0x9a4a36 }),
  red: new THREE.MeshBasicMaterial({ color: 0xff3020 }),
  pool: new THREE.MeshPhongMaterial({ color: 0x4ec3e0, specular: 0xffffff, shininess: 100 }),
  glassRoof: new THREE.MeshLambertMaterial({ color: 0x6f9fc0 }),
  copper: new THREE.MeshLambertMaterial({ color: 0x5f9e8a }),
  gold: new THREE.MeshLambertMaterial({ color: 0xd4af37 }),
  turf: new THREE.MeshLambertMaterial({ color: 0x4f9a3a }),
  black: new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  seats: new THREE.MeshLambertMaterial({ color: 0x2d5f9a }),
  water: new THREE.MeshPhongMaterial({ color: 0x3a9fbf, specular: 0xffffff, shininess: 90 }),
});

function buildTown(t) {
  const n = t.n;
  const size = t.size;
  const g = new THREE.Group();
  g.position.set(t.ox, t.y, t.oz);
  scene.add(g);
  t.group = g;
  t.blocks = [];
  t.nodes = [];
  t.heads = [];
  const trees = [];
  const bushes = [];
  const R = rng(t.ox * 13 + t.oz * 7 + 99);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const parks = new Set(t.parks);
  // In town coordinates; colliders go in at world coordinates.
  const box_ = (x0, z0, x1, z1, h) => addBox(t.ox + x0, t.oz + z0, t.ox + x1, t.oz + z1, h);
  const post_ = (x, z, r) => addPost(t.ox + x, t.oz + z, r);

  // The road surface under the whole town, a little past its edge.
  const A0 = -EDGE - 6;
  const A1 = size + EDGE + 6;
  put(plane(A1 - A0, A1 - A0, 8, 8), M.asphalt, { x: (A0 + A1) / 2, y: 0, z: (A0 + A1) / 2, rx: -Math.PI / 2, cast: false });

  function hedge(x0, z0, x1, z1, h = 1.1) {
    const w = Math.max(0.6, x1 - x0);
    const d = Math.max(0.6, z1 - z0);
    put(box(w, h, d, 1.5, 1.5), M.hedge, { x: (x0 + x1) / 2, y: CURB + h / 2, z: (z0 + z1) / 2 });
    box_(x0, z0, x0 + w, z0 + d, h);
  }
  function walls(x0, z0, x1, z1, y0, y1, tile, th = 3.5) {
    const w = x1 - x0;
    const d = z1 - z0;
    const h = y1 - y0;
    const cy = (y0 + y1) / 2;
    const twW = w / Math.max(1, Math.round(w / 4));
    const twD = d / Math.max(1, Math.round(d / 4));
    put(tiledPlane(w, h, twW, th, 0, y0 - CURB, tile), wallMat, { x: (x0 + x1) / 2, y: cy, z: z1 });
    put(tiledPlane(w, h, twW, th, 0, y0 - CURB, tile), wallMat, { x: (x0 + x1) / 2, y: cy, z: z0, ry: Math.PI });
    put(tiledPlane(d, h, twD, th, 0, y0 - CURB, tile), wallMat, { x: x1, y: cy, z: (z0 + z1) / 2, ry: Math.PI / 2 });
    put(tiledPlane(d, h, twD, th, 0, y0 - CURB, tile), wallMat, { x: x0, y: cy, z: (z0 + z1) / 2, ry: -Math.PI / 2 });
  }
  function flatRoof(x0, z0, x1, z1, y, extras = true) {
    const w = x1 - x0;
    const d = z1 - z0;
    put(plane(w, d, 4, 4), M.roof, { x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, rx: -Math.PI / 2 });
    for (const [x, z, ww, dd] of [[(x0 + x1) / 2, z0 + 0.15, w, 0.3], [(x0 + x1) / 2, z1 - 0.15, w, 0.3], [x0 + 0.15, (z0 + z1) / 2, 0.3, d], [x1 - 0.15, (z0 + z1) / 2, 0.3, d]]) put(box(ww, 0.7, dd, 2, 1), M.wall, { x, y: y + 0.35, z });
    if (!extras) return;
    const r = R();
    if (w > 8 && d > 8) {
      for (let k = 0; k < 1 + Math.floor(r * 4); k++) put(box(1 + R(), 0.8 + R() * 0.6, 1 + R()), M.metal, { x: x0 + 2 + R() * (w - 4), y: y + 0.5, z: z0 + 2 + R() * (d - 4) });
      if (r < 0.3) {
        const tx = x0 + 2.5 + R() * (w - 5);
        const tz = z0 + 2.5 + R() * (d - 5);
        put(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 10), M.wood, { x: tx, y: y + 2.4, z: tz });
        put(new THREE.ConeGeometry(1.2, 0.8, 10), M.darkMetal, { x: tx, y: y + 4.0, z: tz });
        for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) put(box(0.12, 1.2, 0.12), M.darkMetal, { x: tx + dx, y: y + 0.6, z: tz + dz });
      } else if (r < 0.6) {
        for (let k = 0; k < 6 + Math.floor(R() * 10); k++) bushes.push({ x: x0 + 1.5 + R() * (w - 3), y: y + 0.2, z: z0 + 1.5 + R() * (d - 3), s: 0.7 + R() * 0.7 });
        if (R() < 0.5) put(box(Math.min(6, w - 3), 0.12, Math.min(4, d - 3)), M.wood, { x: (x0 + x1) / 2, y: y + 2.4, z: (z0 + z1) / 2 });
      }
    }
  }
  // Tops for towers and mid-rise blocks, so the skyline isn't all flat.
  function crown(kind, x0, z0, x1, z1, top, tile) {
    const w = x1 - x0;
    const d = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const min = Math.min(w, d);
    if (kind === "pyramid") {
      flatRoof(x0, z0, x1, z1, top, false);
      const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4);
      put(g, pick(ROOFS.metal), { x: cx, y: top + min * 0.25, z: cz, sx: w * 0.94, sy: min * 0.5, sz: d * 0.94 });
      return min * 0.5;
    }
    if (kind === "spire") {
      const i = min * 0.22;
      flatRoof(x0, z0, x1, z1, top, false);
      walls(x0 + i, z0 + i, x1 - i, z1 - i, top, top + 7, tile);
      flatRoof(x0 + i, z0 + i, x1 - i, z1 - i, top + 7, false);
      put(new THREE.ConeGeometry(min * 0.2, min * 1.1, 8), pick(ROOFS.metal), { x: cx, y: top + 7 + min * 0.55, z: cz });
      put(new THREE.CylinderGeometry(0.15, 0.15, 12, 6), M.metal, { x: cx, y: top + 7 + min * 1.1 + 6, z: cz });
      return 7 + min * 1.1 + 12;
    }
    if (kind === "antenna") {
      flatRoof(x0, z0, x1, z1, top);
      const n = 1 + Math.floor(R() * 3);
      let tall = 0;
      for (let k = 0; k < n; k++) {
        const hh = 8 + R() * 22;
        tall = Math.max(tall, hh);
        const ax = x0 + 3 + R() * (w - 6);
        const az = z0 + 3 + R() * (d - 6);
        put(new THREE.CylinderGeometry(0.12, 0.25, hh, 6), M.darkMetal, { x: ax, y: top + hh / 2, z: az });
        put(new THREE.SphereGeometry(0.35, 8, 6), M.red, { x: ax, y: top + hh, z: az });
      }
      return tall;
    }
    if (kind === "helipad") {
      flatRoof(x0, z0, x1, z1, top, false);
      put(new THREE.CylinderGeometry(min * 0.38, min * 0.38, 0.3, 24), M.darkMetal, { x: cx, y: top + 0.3, z: cz });
      for (const [bw, bd, bx_] of [[0.9, 5, -1.6], [0.9, 5, 1.6], [3.2, 0.9, 0]]) put(box(bw, 0.1, bd), M.white, { x: cx + bx_, y: top + 0.5, z: cz });
      return 1;
    }
    if (kind === "slant") {
      // A sloping glass top.
      const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4);
      put(g, M.glassRoof, { x: cx + w * 0.1, y: top + min * 0.15, z: cz, sx: w, sy: min * 0.3, sz: d });
      return min * 0.3;
    }
    if (kind === "mansard") {
      const g = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.72, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4);
      put(g, pick(ROOFS.slate), { x: cx, y: top + 1.6, z: cz, sx: w + 0.3, sy: 3.2, sz: d + 0.3 });
      put(plane(w * 0.72, d * 0.72), M.roof, { x: cx, y: top + 3.2, z: cz, rx: -Math.PI / 2 });
      return 3.2;
    }
    if (kind === "cornice") {
      for (const [x, z, ww, dd] of [[cx, z0, w + 0.8, 0.8], [cx, z1, w + 0.8, 0.8], [x0, cz, 0.8, d + 0.8], [x1, cz, 0.8, d + 0.8]]) put(box(ww, 0.6, dd), M.stone, { x, y: top - 0.3, z });
    }
    flatRoof(x0, z0, x1, z1, top);
    return 0;
  }
  function building(x0, z0, x1, z1, kind, faces) {
    const w = x1 - x0;
    const d = z1 - z0;
    let h;
    let style;
    if (kind === "tower") {
      const near = Math.hypot((x0 + x1) / 2 / P - t.downtown[0], (z0 + z1) / 2 / P - t.downtown[1]);
      h = Math.round((24 + R() * 80 * Math.max(0.3, 1.4 - near * 0.45)) / 3.5) * 3.5;
      style = R() < 0.6 ? "glass" : "concrete";
    } else if (kind === "mid") {
      h = (2 + Math.floor(R() * (t.style === "city" ? 7 : 3))) * 3.5;
      style = pick(["brick", "stucco", "stucco", "concrete"]);
    } else {
      return house(x0, z0, x1, z1, faces);
    }
    // Sometimes two blocks of different heights instead of one.
    const vols = [];
    if (w > 15 && d > 15 && R() < 0.35) {
      if (w >= d) {
        const cut = x0 + w * (0.4 + R() * 0.2);
        vols.push([x0, z0, cut, z1, h], [cut, z0 + (R() < 0.5 ? d * 0.3 : 0), x1, z1 - (R() < 0.5 ? d * 0.2 : 0), Math.max(7, Math.round(h * (0.35 + R() * 0.5) / 3.5) * 3.5)]);
      } else {
        const cut = z0 + d * (0.4 + R() * 0.2);
        vols.push([x0, z0, x1, cut, h], [x0 + (R() < 0.5 ? w * 0.3 : 0), cut, x1, z1, Math.max(7, Math.round(h * (0.35 + R() * 0.5) / 3.5) * 3.5)]);
      }
    } else vols.push([x0, z0, x1, z1, h]);
    const shop = R() < 0.8;
    const shopTile = nextTile("shop", R);
    for (const [a0, b0, a1, b1, hv] of vols) {
      const tile = nextTile(style, R);
      const top = CURB + hv;
      if (shop) {
        walls(a0, b0, a1, b1, CURB, CURB + 4, shopTile, 4);
        walls(a0, b0, a1, b1, CURB + 4, top, tile);
      } else walls(a0, b0, a1, b1, CURB, top, tile);
      const kinds = kind === "tower" ? ["flat", "pyramid", "spire", "antenna", "helipad", "slant", "setback"] : ["flat", "flat", "cornice", "cornice", "mansard", "antenna"];
      let ck = pick(kinds);
      if (ck === "setback" && (hv < 50 || a1 - a0 < 16 || b1 - b0 < 16)) ck = "antenna";
      let extra = 0;
      if (ck === "setback") {
        const i = 2.5;
        const h2 = Math.round((10 + R() * 30) / 3.5) * 3.5;
        flatRoof(a0, b0, a1, b1, top, false);
        walls(a0 + i, b0 + i, a1 - i, b1 - i, top, top + h2, tile);
        extra = h2 + crown(pick(["flat", "antenna", "pyramid", "spire"]), a0 + i, b0 + i, a1 - i, b1 - i, top + h2, tile);
      } else extra = crown(ck, a0, b0, a1, b1, top, tile);
      box_(a0, b0, a1, b1, hv + CURB + extra);
    }
    if (shop) {
      const am = pick(AWNINGS);
      for (const f of faces) {
        if (R() < 0.35) continue;
        const len = (f === "n" || f === "s" ? w : d) * (0.5 + R() * 0.4);
        if (f === "s") put(box(len, 0.08, 1.4), am, { x: (x0 + x1) / 2, y: CURB + 3.4, z: z0 - 0.7, rx: -0.25 });
        if (f === "n") put(box(len, 0.08, 1.4), am, { x: (x0 + x1) / 2, y: CURB + 3.4, z: z1 + 0.7, rx: 0.25 });
        if (f === "w") put(box(1.4, 0.08, len), am, { x: x0 - 0.7, y: CURB + 3.4, z: (z0 + z1) / 2, rz: 0.25 });
        if (f === "e") put(box(1.4, 0.08, len), am, { x: x1 + 0.7, y: CURB + 3.4, z: (z0 + z1) / 2, rz: -0.25 });
      }
    }
  }
  // Houses: each its own colour, roof and extras.
  function house(x0, z0, x1, z1, faces) {
    const w = x1 - x0;
    const d = z1 - z0;
    const floors = R() < 0.55 ? 2 : R() < 0.7 ? 1 : 3;
    const top = CURB + floors * 3.2;
    walls(x0, z0, x1, z1, CURB, top, nextTile(R() < 0.75 ? "house" : "stucco", R), 3.2);
    const rt = pick(["hip", "hip", "gable", "gable", "flat"]);
    const rm = pick(ROOFS.tile);
    let ridge = top;
    if (rt === "hip") {
      const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4);
      const rh = 1.8 + R() * 1.4;
      put(g, rm, { x: (x0 + x1) / 2, y: top + rh / 2, z: (z0 + z1) / 2, sx: w + 0.9, sy: rh, sz: d + 0.9 });
      ridge = top + rh;
    } else if (rt === "gable") {
      const along = w > d;
      const rh = 2 + R() * 1.6;
      put(PRISM.clone(), rm.prism, { x: (x0 + x1) / 2, y: top, z: (z0 + z1) / 2, ry: along ? Math.PI / 2 : 0, sx: (along ? d : w) + 0.9, sy: rh, sz: (along ? w : d) + 0.6 });
      // The gable ends, in the wall colour.
      ridge = top + rh;
    } else {
      flatRoof(x0, z0, x1, z1, top, false);
    }
    if (rt !== "flat" && R() < 0.55) {
      const cx = x0 + 1.2 + R() * (w - 2.4);
      const cz = z0 + 1.2 + R() * (d - 2.4);
      put(box(0.8, ridge - top + 1.8, 0.8), M.brick, { x: cx, y: top + (ridge - top + 1.8) / 2, z: cz });
    }
    box_(x0, z0, x1, z1, ridge);
    // A porch on the street side, a garage, a pool out back.
    const f = faces[0];
    if (f && R() < 0.45) {
      const pw = Math.min(w, d) * 0.5;
      const [px_, pz, ry] = f === "s" ? [(x0 + x1) / 2, z0 - 1.2, 0] : f === "n" ? [(x0 + x1) / 2, z1 + 1.2, 0] : f === "w" ? [x0 - 1.2, (z0 + z1) / 2, Math.PI / 2] : [x1 + 1.2, (z0 + z1) / 2, Math.PI / 2];
      put(box(pw, 0.15, 2.4), M.wood, { x: px_, y: CURB + 2.9, z: pz, ry });
      put(box(pw, 0.25, 2.4), M.stone, { x: px_, y: CURB + 0.12, z: pz, ry });
    }
    if (R() < 0.3) {
      const back = faces.includes("s") ? z1 + 3.2 : z0 - 3.2;
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(7, w - 1), 3.2), M.pool);
      pm.rotation.x = -Math.PI / 2;
      pm.position.set((x0 + x1) / 2, CURB + 0.03, back);
      g.add(pm);
      put(box(Math.min(7, w - 1) + 0.6, 0.06, 3.8), M.stone, { x: (x0 + x1) / 2, y: CURB + 0.01, z: back, cast: false });
    }
  }
  // ---------- One-of-a-kind buildings ----------
  function landmark(name, x0, z0, x1, z1) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const B = CURB;
    if (name === "spire") {
      // The tallest thing in the city: four glass tiers and a needle.
      const tile = nextTile("glass", R);
      const tiers = [[36, 0, 63], [29, 63, 112], [22, 112, 151], [15, 151, 175]];
      for (const [s, y0, y1] of tiers) {
        walls(cx - s / 2, cz - s / 2, cx + s / 2, cz + s / 2, B + y0, B + y1, tile);
        flatRoof(cx - s / 2, cz - s / 2, cx + s / 2, cz + s / 2, B + y1, false);
        put(box(s + 0.8, 0.8, s + 0.8), M.stone, { x: cx, y: B + y1 - 0.4, z: cz });
      }
      put(new THREE.ConeGeometry(5.5, 32, 8), M.copper, { x: cx, y: B + 175 + 16, z: cz });
      put(new THREE.CylinderGeometry(0.2, 0.3, 30, 6), M.metal, { x: cx, y: B + 207 + 15, z: cz });
      put(new THREE.SphereGeometry(0.6, 8, 6), M.red, { x: cx, y: B + 237, z: cz });
      box_(cx - 18, cz - 18, cx + 18, cz + 18, 240);
      for (const [x, z] of [[x0 + 4, z0 + 4], [x1 - 4, z0 + 4], [x0 + 4, z1 - 4], [x1 - 4, z1 - 4]]) trees.push({ x, z, s: 0.9, kind: "round" });
    } else if (name === "civic") {
      // City hall: a classical block with a portico and a copper dome, facing the park.
      const tile = nextTile("concrete", R);
      const hx0 = x0 + 12;
      walls(hx0, cz - 14, x1 - 2, cz + 14, B, B + 15, tile);
      flatRoof(hx0, cz - 14, x1 - 2, cz + 14, B + 15, false);
      put(box(x1 - 2 - hx0 + 1, 1, 29), M.stone, { x: (hx0 + x1 - 2) / 2, y: B + 15.5, z: cz });
      for (let k = 0; k < 8; k++) put(new THREE.CylinderGeometry(0.65, 0.75, 13, 12), M.stone, { x: hx0 - 4.5, y: B + 1 + 6.5, z: cz - 10.5 + k * 3 });
      put(box(7, 1, 26), M.stone, { x: hx0 - 4, y: B + 0.5, z: cz });
      put(box(5, 1.2, 25), M.stone, { x: hx0 - 4.5, y: B + 14.6, z: cz });
      put(PRISM.clone(), M.stone.prism || (M.stone.prism = new THREE.MeshLambertMaterial({ color: 0xd9d2c2 })), { x: hx0 - 4.5, y: B + 15.2, z: cz, ry: Math.PI / 2, sx: 25, sy: 4.5, sz: 5 });
      const dx = (hx0 + x1 - 2) / 2;
      put(new THREE.CylinderGeometry(8, 8, 6, 24), M.stone, { x: dx, y: B + 19, z: cz });
      put(new THREE.SphereGeometry(8.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.copper, { x: dx, y: B + 22, z: cz });
      put(new THREE.CylinderGeometry(1.2, 1.2, 3, 10), M.stone, { x: dx, y: B + 31.5, z: cz });
      put(new THREE.ConeGeometry(1.4, 3, 10), M.gold, { x: dx, y: B + 34.5, z: cz });
      box_(hx0 - 8, cz - 14, x1 - 2, cz + 14, 36);
    } else if (name === "church" || name === "chapel") {
      const big = name === "church" ? 1 : 0.7;
      const tile = nextTile(R() < 0.5 ? "brick" : "concrete", R);
      const nw = 12 * big;
      const nl = 30 * big;
      const nh = 11 * big;
      walls(cx - nw / 2, cz - nl / 2 + 4, cx + nw / 2, cz + nl / 2, B, B + nh, tile);
      put(PRISM.clone(), ROOFS.slate[0].prism, { x: cx, y: B + nh, z: cz + 2, sx: nw + 1, sy: 6 * big, sz: nl - 3 });
      const tw = 7 * big;
      const tz = cz - nl / 2 + 2;
      walls(cx - tw / 2, tz - tw / 2, cx + tw / 2, tz + tw / 2, B, B + 28 * big, tile);
      flatRoof(cx - tw / 2, tz - tw / 2, cx + tw / 2, tz + tw / 2, B + 28 * big, false);
      put(new THREE.ConeGeometry(tw * 0.7, 16 * big, 4).rotateY(Math.PI / 4), ROOFS.slate[0], { x: cx, y: B + 28 * big + 8 * big, z: tz });
      put(new THREE.CylinderGeometry(0.1, 0.1, 3, 4), M.gold, { x: cx, y: B + 44 * big + 1.5, z: tz });
      for (const [fx, fz, ry] of [[0, -tw / 2 - 0.05, Math.PI], [0, tw / 2 + 0.05, 0], [tw / 2 + 0.05, 0, Math.PI / 2], [-tw / 2 - 0.05, 0, -Math.PI / 2]]) {
        put(new THREE.CircleGeometry(1.5 * big, 20), M.white, { x: cx + fx, y: B + 22 * big, z: tz + fz, ry });
      }
      box_(cx - nw / 2, tz - tw / 2, cx + nw / 2, cz + nl / 2, 44 * big);
      for (let k = 0; k < 6; k++) trees.push({ x: x0 + 3 + R() * 6, z: z0 + 4 + k * 7, s: 0.9, kind: "cypress" });
    } else if (name === "stadium") {
      const rx = 23;
      const rz = 21;
      const ds = (m) => { const c = m.clone(); c.side = THREE.DoubleSide; return c; };
      M.stoneDS = M.stoneDS || ds(M.stone);
      M.seatsDS = M.seatsDS || ds(M.seats);
      put(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), M.stoneDS, { x: cx, y: B + 8, z: cz, sx: rx, sy: 16, sz: rz });
      put(new THREE.CylinderGeometry(1, 0.62, 1, 48, 1, true), M.seatsDS, { x: cx, y: B + 8, z: cz, sx: rx - 0.4, sy: 15, sz: rz - 0.4 });
      put(new THREE.CircleGeometry(1, 40), M.turf, { x: cx, y: B + 0.6, z: cz, rx: -Math.PI / 2, sx: rx * 0.6, sy: rz * 0.6 });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const lx = cx + sx * rx * 0.78;
        const lz = cz + sz * rz * 0.78;
        put(new THREE.CylinderGeometry(0.3, 0.5, 30, 6), M.darkMetal, { x: lx, y: B + 15, z: lz });
        put(box(4, 2.5, 0.5), M.white, { x: lx, y: B + 30, z: lz, ry: Math.atan2(cx - lx, cz - lz) });
      }
      box_(cx - rx, cz - rz, cx + rx, cz + rz, 18);
    } else if (name === "clock") {
      const tile = nextTile("concrete", R);
      walls(cx - 3.5, cz - 3.5, cx + 3.5, cz + 3.5, B, B + 34, tile);
      put(box(8, 1, 8), M.stone, { x: cx, y: B + 34.5, z: cz });
      put(new THREE.ConeGeometry(5.2, 9, 4).rotateY(Math.PI / 4), M.copper, { x: cx, y: B + 39.5, z: cz });
      for (const [fx, fz, ry] of [[0, -3.55, Math.PI], [0, 3.55, 0], [3.55, 0, Math.PI / 2], [-3.55, 0, -Math.PI / 2]]) {
        put(new THREE.CircleGeometry(2.4, 24), M.white, { x: cx + fx, y: B + 29, z: cz + fz, ry });
        put(box(0.18, 1.8, 0.05), M.black, { x: cx + fx * 1.01, y: B + 29.6, z: cz + fz * 1.01, ry });
        put(box(1.3, 0.18, 0.05), M.black, { x: cx + fx * 1.01 + Math.cos(ry) * 0.5, y: B + 29, z: cz + fz * 1.01 - Math.sin(ry) * 0.5, ry });
      }
      box_(cx - 3.5, cz - 3.5, cx + 3.5, cz + 3.5, 44);
      // A fountain in the square.
      const fx = cx + 14;
      put(new THREE.CylinderGeometry(5, 5.3, 0.7, 28), M.stone, { x: fx, y: B + 0.35, z: cz });
      const wm = new THREE.Mesh(new THREE.CircleGeometry(4.6, 28), M.water);
      wm.rotation.x = -Math.PI / 2;
      wm.position.set(fx, B + 0.6, cz);
      g.add(wm);
      put(new THREE.CylinderGeometry(0.5, 0.8, 3, 10), M.stone, { x: fx, y: B + 1.5, z: cz });
      put(new THREE.CylinderGeometry(1.6, 0.4, 0.4, 14), M.stone, { x: fx, y: B + 3.1, z: cz });
      post_(fx, cz, 5.2);
      for (let k = 0; k < 8; k++) trees.push({ x: x0 + 3 + (k % 4) * 14, z: k < 4 ? z0 + 3 : z1 - 3, s: 0.85, kind: "round" });
    } else if (name === "museum") {
      // A glass pyramid between two low stone wings.
      const tile = nextTile("concrete", R);
      walls(x0 + 2, z0 + 2, x0 + 14, z1 - 2, B, B + 7, tile);
      flatRoof(x0 + 2, z0 + 2, x0 + 14, z1 - 2, B + 7);
      walls(x1 - 14, z0 + 2, x1 - 2, z1 - 2, B, B + 7, tile);
      flatRoof(x1 - 14, z0 + 2, x1 - 2, z1 - 2, B + 7);
      put(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), M.glassRoof, { x: cx, y: B + 9, z: cz, sx: 20, sy: 18, sz: 20 });
      box_(x0 + 2, z0 + 2, x0 + 14, z1 - 2, 7);
      box_(x1 - 14, z0 + 2, x1 - 2, z1 - 2, 7);
      box_(cx - 10, cz - 10, cx + 10, cz + 10, 18);
    } else if (name === "market") {
      // The harbour's covered fish market: a long roof on rows of columns.
      for (let k = 0; k <= 8; k++) for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.35, 0.35, 6, 8), M.white, { x: x0 + 5 + k * 5, y: B + 3, z: cz + s * 8 });
      put(PRISM.clone(), ROOFS.tile[0].prism, { x: cx, y: B + 6, z: cz, ry: Math.PI / 2, sx: 19, sy: 5, sz: 44 });
      for (let k = 0; k < 6; k++) put(box(5, 1, 2), M.wood, { x: x0 + 8 + k * 6.5, y: B + 0.5, z: cz + (k % 2 ? 3 : -3) });
      for (let k = 0; k <= 8; k++) for (const s of [-1, 1]) post_(x0 + 5 + k * 5, cz + s * 8, 0.4);
    }
  }
  function parcels(x0, z0, x1, z1, min, out) {
    const w = x1 - x0;
    const d = z1 - z0;
    if ((w < min * 2 && d < min * 2) || (out.length > 6 && R() < 0.5)) { out.push([x0, z0, x1, z1]); return out; }
    if (w >= d) { const cut = x0 + w * (0.35 + R() * 0.3); parcels(x0, z0, cut, z1, min, out); parcels(cut, z0, x1, z1, min, out); }
    else { const cut = z0 + d * (0.35 + R() * 0.3); parcels(x0, z0, x1, cut, min, out); parcels(x0, cut, x1, z1, min, out); }
    return out;
  }

  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const bx0 = i * P + RW;
    const bz0 = j * P + RW;
    const bx1 = (i + 1) * P - RW;
    const bz1 = (j + 1) * P - RW;
    const lx0 = bx0 + SW;
    const lz0 = bz0 + SW;
    const lx1 = bx1 - SW;
    const lz1 = bz1 - SW;
    const dd = Math.hypot(i + 0.5 - t.downtown[0], j + 0.5 - t.downtown[1]);
    let kind;
    if (parks.has(`${i},${j}`)) kind = "park";
    else if (t.style === "city") kind = dd < 2.0 ? "tower" : dd < 4.2 ? "mid" : "house";
    else if (t.style === "harbor") kind = dd < 1.6 ? "mid" : "house";
    else kind = "house";
    if (kind === "mid" && R() < 0.08) kind = "park";
    t.blocks.push({ kind, x0: t.ox + lx0, z0: t.oz + lz0, x1: t.ox + lx1, z1: t.oz + lz1, i, j });
    put(box(bx1 - bx0, CURB, bz1 - bz0, 2, 2), M.sidewalk, { x: (bx0 + bx1) / 2, y: CURB / 2, z: (bz0 + bz1) / 2, cast: false });
    const green = kind === "park" || kind === "house";
    put(plane(lx1 - lx0, lz1 - lz0, green ? 6 : 3, green ? 6 : 3), green ? M.grass : M.plaza, { x: (lx0 + lx1) / 2, y: CURB + 0.01, z: (lz0 + lz1) / 2, rx: -Math.PI / 2, cast: false });
    for (const side of ["s", "n", "w", "e"]) {
      const along = side === "s" || side === "n";
      const fixed = side === "s" ? bz0 + 1.3 : side === "n" ? bz1 - 1.3 : side === "w" ? bx0 + 1.3 : bx1 - 1.3;
      const a0 = (along ? bx0 : bz0) + 6;
      const a1 = (along ? bx1 : bz1) - 6;
      for (let a = a0; a <= a1; a += kind === "tower" ? 11 : 9) {
        if (R() < 0.12) continue;
        trees.push({ x: along ? a : fixed, z: along ? fixed : a, s: 0.8 + R() * 0.45, kind: kind === "house" && R() < 0.25 ? "cypress" : "round" });
      }
    }
    const lm = t.landmarks && t.landmarks[`${i},${j}`];
    if (lm) { landmark(lm, lx0, lz0, lx1, lz1); continue; }
    if (kind === "park") {
      const cx = (lx0 + lx1) / 2;
      const cz = (lz0 + lz1) / 2;
      put(plane(lx1 - lx0, 3, 3, 3), M.path, { x: cx, y: CURB + 0.02, z: cz, rx: -Math.PI / 2, cast: false });
      put(plane(3, lz1 - lz0, 3, 3), M.path, { x: cx, y: CURB + 0.025, z: cz, rx: -Math.PI / 2, cast: false });
      const pond = R() < 0.6;
      const pr = 7 + R() * 3;
      const px_ = cx + (R() < 0.5 ? -1 : 1) * 11;
      const pz = cz + (R() < 0.5 ? -1 : 1) * 11;
      if (pond) {
        const pm = new THREE.Mesh(new THREE.CircleGeometry(pr, 28), new THREE.MeshPhongMaterial({ color: 0x3a9fbf, specular: 0xffffff, shininess: 90 }));
        pm.rotation.x = -Math.PI / 2;
        pm.position.set(px_, CURB + 0.04, pz);
        pm.receiveShadow = true;
        g.add(pm);
        put(new THREE.TorusGeometry(pr, 0.25, 6, 28), M.wall, { x: px_, y: CURB + 0.05, z: pz, rx: Math.PI / 2 });
        post_(px_, pz, pr - 0.5);
      }
      let placed = 0;
      for (let k = 0; k < 140 && placed < 46; k++) {
        const x = lx0 + 2 + R() * (lx1 - lx0 - 4);
        const z = lz0 + 2 + R() * (lz1 - lz0 - 4);
        if (Math.abs(x - cx) < 3 || Math.abs(z - cz) < 3) continue;
        if (pond && Math.hypot(x - px_, z - pz) < pr + 2) continue;
        trees.push({ x, z, s: 0.9 + R() * 0.8, kind: R() < 0.15 ? "cypress" : "round" });
        placed++;
      }
      for (let k = 0; k < 40; k++) {
        const x = lx0 + 1 + R() * (lx1 - lx0 - 2);
        const z = lz0 + 1 + R() * (lz1 - lz0 - 2);
        if (Math.abs(x - cx) < 2.5 || Math.abs(z - cz) < 2.5 || (pond && Math.hypot(x - px_, z - pz) < pr + 1)) continue;
        bushes.push({ x, y: CURB, z, s: 0.6 + R() * 0.8 });
      }
      for (const [x, z, ry] of [[cx - 8, cz + 2.4, 0], [cx + 8, cz - 2.4, Math.PI], [cx + 2.4, cz + 8, Math.PI / 2], [cx - 2.4, cz - 8, -Math.PI / 2]]) {
        put(box(1.8, 0.08, 0.5), M.wood, { x, y: CURB + 0.48, z, ry });
        put(box(1.8, 0.45, 0.08), M.wood, { x: x + Math.sin(ry) * 0.25, y: CURB + 0.75, z: z + Math.cos(ry) * 0.25, ry });
      }
      continue;
    }
    const faces = (p) => [p[1] <= lz0 + 0.1 && "s", p[3] >= lz1 - 0.1 && "n", p[0] <= lx0 + 0.1 && "w", p[2] >= lx1 - 0.1 && "e"].filter(Boolean);
    const list = parcels(lx0, lz0, lx1, lz1, kind === "tower" ? 16 : kind === "mid" ? 11 : 14, []);
    for (const p of list) {
      const inset = kind === "tower" ? 1 : kind === "mid" ? 0.4 : 3.5;
      const [x0, z0, x1, z1] = [p[0] + inset, p[1] + inset, p[2] - inset, p[3] - inset];
      if (x1 - x0 < 5 || z1 - z0 < 5) continue;
      if (kind === "tower" && R() < 0.12) {
        for (let k = 0; k < 4; k++) {
          const x = x0 + 2 + R() * (x1 - x0 - 4);
          const z = z0 + 2 + R() * (z1 - z0 - 4);
          put(box(2.4, 0.6, 2.4), M.wall, { x, y: CURB + 0.3, z });
          box_(x - 1.2, z - 1.2, x + 1.2, z + 1.2, 0.6);
          trees.push({ x, z, s: 0.8, kind: "round", y: 0.6 });
        }
        continue;
      }
      building(x0, z0, x1, z1, kind, faces(p));
      if (kind === "house") {
        for (const f of faces(p)) {
          if (f === "s") hedge(p[0] + 1, p[1] + 0.3, p[2] - 1, p[1] + 1.1);
          if (f === "n") hedge(p[0] + 1, p[3] - 1.1, p[2] - 1, p[3] - 0.3);
          if (f === "w") hedge(p[0] + 0.3, p[1] + 1, p[0] + 1.1, p[3] - 1);
          if (f === "e") hedge(p[2] - 1.1, p[1] + 1, p[2] - 0.3, p[3] - 1);
        }
        for (let k = 0; k < 1 + Math.floor(R() * 3); k++) {
          const c = [[p[0] + 1.8, p[1] + 1.8], [p[2] - 1.8, p[1] + 1.8], [p[0] + 1.8, p[3] - 1.8], [p[2] - 1.8, p[3] - 1.8]][Math.floor(R() * 4)];
          trees.push({ x: c[0], z: c[1], s: 0.9 + R() * 0.5, kind: R() < 0.3 ? "cypress" : "round" });
        }
        for (let k = 0; k < 5; k++) bushes.push({ x: x0 - 1 + R() * (x1 - x0 + 2), y: CURB, z: R() < 0.5 ? z0 - 0.9 : z1 + 0.9, s: 0.5 + R() * 0.5 });
      } else if (kind === "mid") {
        for (let k = 0; k < 3; k++) bushes.push({ x: x0 + R() * (x1 - x0), y: CURB, z: R() < 0.5 ? z0 - 0.7 : z1 + 0.7, s: 0.45 + R() * 0.3 });
      }
    }
  }

  // Crossings, markings, traffic lights, lamps.
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const nd = { t, i, j, x: t.ox + i * P, z: t.oz + j * P, phase: R() * 20, hw: !!t.hw && (t.hw.axis === "x" ? j === t.hw.k : i === t.hw.k) };
    t.nodes.push(nd);
    nodes.push(nd);
  }
  t.nodeAt = (i, j) => (i < 0 || j < 0 || i > n || j > n ? null : t.nodes[i * (n + 1) + j]);
  {
    const quad = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const whites = [];
    const yellows = [];
    const mark = (list, x, z, w, d) => list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.02, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, d)));
    for (let k = 0; k <= n; k++) for (let s = 0; s < n; s++) {
      const a0 = s * P + RW + 3.2;
      const a1 = (s + 1) * P - RW - 3.2;
      const mid = (a0 + a1) / 2;
      const len = a1 - a0;
      for (const o of [-0.16, 0.16]) { mark(yellows, k * P + o, mid, 0.11, len); mark(yellows, mid, k * P + o, len, 0.11); }
      // The main street (the loop): two lanes each way, no stop lines.
      const mainNS = t.hw && t.hw.axis === "z" && k === t.hw.k;
      const mainEW = t.hw && t.hw.axis === "x" && k === t.hw.k;
      if (!mainNS) { mark(whites, k * P - LO, a0 - 0.2, 2 * LO - 0.4, 0.4); mark(whites, k * P + LO, a1 + 0.2, 2 * LO - 0.4, 0.4); }
      else for (let q = a0; q < a1 - 3; q += 8) for (const o of [-3.5, 3.5]) mark(whites, k * P + o, q + 1.5, 0.14, 3);
      if (!mainEW) { mark(whites, a0 - 0.2, k * P + LO, 0.4, 2 * LO - 0.4); mark(whites, a1 + 0.2, k * P - LO, 0.4, 2 * LO - 0.4); }
      else for (let q = a0; q < a1 - 3; q += 8) for (const o of [-3.5, 3.5]) mark(whites, q + 1.5, k * P + o, 3, 0.14);
    }
    for (const nd of t.nodes) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!t.nodeAt(nd.i + dx, nd.j + dz)) continue;
      const cx = nd.i * P + dx * (RW + 1.6);
      const cz = nd.j * P + dz * (RW + 1.6);
      for (let q = -RW + 0.8; q <= RW - 0.8; q += 1.1) {
        if (dx) mark(whites, cx, nd.j * P + q, 2.4, 0.55);
        else mark(whites, nd.i * P + q, cz, 0.55, 2.4);
      }
    }
    for (const [list, mat] of [[whites, M.white], [yellows, M.yellow]]) {
      const im = new THREE.InstancedMesh(quad, mat, list.length);
      list.forEach((m, k) => im.setMatrixAt(k, m));
      im.receiveShadow = true;
      g.add(im);
    }
  }
  for (const nd of t.nodes) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (!t.nodeAt(nd.i - dx, nd.j - dz) || nd.hw) continue;
    const rx = -dz;
    const rz = dx;
    const x = nd.i * P - dx * (RW + 3.6) + rx * (RW + 0.9);
    const z = nd.j * P - dz * (RW + 3.6) + rz * (RW + 0.9);
    put(new THREE.CylinderGeometry(0.09, 0.11, 4.2, 6), M.darkMetal, { x, y: CURB + 2.1, z });
    const ry = Math.atan2(-dx, -dz);
    put(box(0.42, 1.15, 0.32), M.darkMetal, { x, y: CURB + 4.3, z, ry });
    post_(x, z, 0.2);
    t.heads.push({ n: nd, axis: dx ? "x" : "z", x: x - dx * 0.17, z: z - dz * 0.17, ry, state: -1 });
  }
  t.lamps = new THREE.InstancedMesh(new THREE.CircleGeometry(0.13, 10), new THREE.MeshBasicMaterial({ toneMapped: false }), Math.max(1, t.heads.length));
  g.add(t.lamps);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    for (const [x, z, ry] of [[i * P + P / 2, j * P + RW + 0.5, 0], [i * P + RW + 0.5, j * P + P / 2, Math.PI / 2]]) {
      put(new THREE.CylinderGeometry(0.08, 0.12, 6, 6), M.darkMetal, { x, y: CURB + 3, z });
      put(box(0.1, 0.1, 1.6), M.darkMetal, { x: x + (ry ? -0.8 : 0), y: CURB + 6, z: z + (ry ? 0 : -0.8), ry });
      put(box(0.5, 0.18, 0.3), M.metal, { x: x + (ry ? -1.5 : 0), y: CURB + 5.9, z: z + (ry ? 0 : -1.5), ry });
      post_(x, z, 0.18);
    }
  }
  flush(g);

  // The town's trees and bushes, instanced.
  const round = trees.filter((q) => q.kind === "round");
  const cyp = trees.filter((q) => q.kind === "cypress");
  const Y = (q) => CURB + (q.y || 0);
  for (const q of trees) post_(q.x, q.z, 0.3 * q.s);
  const blobs = [];
  for (const q of round) {
    const r = rng(Math.round(q.x * 31 + q.z * 7));
    const c = TREE.greens[Math.floor(r() * TREE.greens.length)];
    blobs.push({ x: q.x, y: Y(q) + 3.6 * q.s, z: q.z, s: 2.0 * q.s, sy: 1.7 * q.s, c });
    blobs.push({ x: q.x + (r() - 0.5) * 1.6 * q.s, y: Y(q) + (4.6 + r() * 0.6) * q.s, z: q.z + (r() - 0.5) * 1.6 * q.s, s: 1.4 * q.s, sy: 1.3 * q.s, c });
  }
  for (const b of bushes) blobs.push({ x: b.x, y: b.y + b.s * 0.45, z: b.z, s: b.s, sy: b.s * 0.75, c: TREE.greens[Math.floor(Math.abs(b.x * 13 + b.z) % TREE.greens.length)] });
  const add = (m) => m && g.add(m);
  add(instanced(TREE.trunk, TREE.bark, [...round, ...cyp], (q, m) => m.compose(tmpV.set(q.x, Y(q), q.z), tmpQ.identity(), new THREE.Vector3(q.s, (q.kind === "cypress" ? 1.6 : 2.6) * q.s, q.s))));
  add(instanced(TREE.blobFine, TREE.leaf, blobs, (b, m) => m.compose(tmpV.set(b.x, b.y, b.z), tmpQ.setFromEuler(tmpE.set(0, b.x, 0)), new THREE.Vector3(b.s, b.sy, b.s)), (b) => b.c));
  add(instanced(TREE.cone, TREE.leaf, cyp, (q, m) => m.compose(tmpV.set(q.x, Y(q) + 1.2 * q.s, q.z), tmpQ.identity(), new THREE.Vector3(q.s, 7 * q.s, q.s)), () => TREE.pine[0]));
}
for (const t of TOWNS) buildTown(t);

function updateLights(time) {
  for (const t of TOWNS) {
    let changed = false;
    t.heads.forEach((h, k) => {
      const s = lightFor(h.n, h.axis, time);
      if (s === h.state) return;
      h.state = s;
      changed = true;
      tmpM.compose(tmpV.set(h.x, CURB + 4.68 - s * 0.36, h.z), tmpQ.setFromEuler(tmpE.set(0, h.ry, 0)), ONE);
      t.lamps.setMatrixAt(k, tmpM);
      t.lamps.setColorAt(k, LIGHT_COLS[s]);
    });
    if (changed) {
      t.lamps.instanceMatrix.needsUpdate = true;
      if (t.lamps.instanceColor) t.lamps.instanceColor.needsUpdate = true;
    }
  }
}

// Street names: avenues run north-south, streets east-west.
const AVENUES = ["Harbor", "Cedar", "Magnolia", "Laurel", "Bayview", "Juniper", "Oleander", "Willow", "Sycamore", "Palmetto", "Seawall"];
const STREETS = ["Shore", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "North"];
function placeName(x, z) {
  const t = townAt(x, z);
  if (t) {
    const kx = clamp(Math.round((x - t.ox) / P), 0, t.n);
    const kz = clamp(Math.round((z - t.oz) / P), 0, t.n);
    const dx = Math.abs(x - t.ox - kx * P);
    const dz = Math.abs(z - t.oz - kz * P);
    const av = `${AVENUES[kx]} Ave`;
    const st = `${STREETS[kz]} St`;
    if (dx < RW + 2 && dz < RW + 2) return `${t.name} · ${av} & ${st}`;
    return `${t.name} · ${dx < dz ? av : st}`;
  }
  const r = roadAt(x, z, 30);
  if (r) return r.road.S[r.i].name;
  return "Countryside";
}
