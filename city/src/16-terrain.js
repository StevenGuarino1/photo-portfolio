// ---------- Ground tiles, woods, sea ----------
const CH = 200; // a tile's size
const CV = CH / GSTEP; // cells along a tile
const TERRAIN_R = TOUCH ? 1000 : 1500; // detailed ground this far; the whole island beyond, simpler
const FINE_R = TOUCH ? 500 : 750; // full detail within this
const TREE_R = TOUCH ? 520 : 760;
// A light haze: the whole island stays in sight from anywhere on it.
scene.fog.near = 700;
scene.fog.far = 5200;

// The sea.
{
  const water = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000), new THREE.MeshPhongMaterial({ color: 0x2b8db0, specular: 0xcfeeff, shininess: 70 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(ISLE.cx, SEA, ISLE.cz);
  water.receiveShadow = true;
  scene.add(water);
}
// A soft grain that's laid over the ground colours, so close up it isn't flat.
const grain = canvasTex(128, 128, (g) => {
  const r = rng(77);
  for (let y = 0; y < 128; y += 2) for (let x = 0; x < 128; x += 2) {
    const v = 205 + r() * 50;
    g.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
    g.fillRect(x, y, 2, 2);
  }
  for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.15)"; g.fillRect(r() * 128, r() * 128, 1, 2 + r() * 2); }
});
const groundMat = new THREE.MeshLambertMaterial({ map: grain, vertexColors: true });
const COL = {
  sand: new THREE.Color(0xe3d3a4), grass: new THREE.Color(0x6aa548), meadow: new THREE.Color(0x8db752), dark: new THREE.Color(0x4c8a3c),
  rock: new THREE.Color(0x8c8a80), gravel: new THREE.Color(0xa59e8c), wet: new THREE.Color(0xb7a77c),
  forestFloor: new THREE.Color(0x4a7234), heather: new THREE.Color(0x8a6f7a), dry: new THREE.Color(0xb9b26a), cliff: new THREE.Color(0x9a9286),
};
// The crops in the farmland's fields.
const CROPS = [0xd8c06a, 0x7fb24a, 0x5c8f3a, 0x8a6a4a, 0xe8d23a, 0x9a86c8, 0x8ec45a, 0xc9a85a, 0x6f9e3e].map((c) => new THREE.Color(c));
// Which field a point is in, and how close it is to the field's edge.
function fieldAt(x, z) {
  const u = x * Math.cos(FIELD_A) + z * Math.sin(FIELD_A);
  const v = -x * Math.sin(FIELD_A) + z * Math.cos(FIELD_A);
  const fu = Math.floor(u / 95);
  const row = Math.floor(v / 70);
  // Fields in a row don't all line up.
  const shift = hash2(row, 9) * 95;
  const fu2 = Math.floor((u + shift) / 95);
  const eu = Math.min(((u + shift) % 95 + 95) % 95, 95 - (((u + shift) % 95 + 95) % 95));
  const ev = Math.min(((v % 70) + 70) % 70, 70 - (((v % 70) + 70) % 70));
  void fu;
  return { id: hash2(fu2, row), edge: Math.min(eu, ev), u, v, alongV: eu > ev };
}
const _c = new THREE.Color();
function groundColour(x, z, h, slope) {
  const r = roadAt(x, z, ROAD_HW + 3);
  if (r && r.d > ROAD_HW - 0.5) return _c.copy(COL.gravel);
  // Sand only on the real shore, not on ground levelled down for a town.
  const shore = Math.min(h, baseH(x, z));
  if (shore < 1.2) return _c.copy(COL.wet);
  if (shore < 3.4) return _c.copy(COL.sand).lerp(COL.grass, smooth(2.4, 3.4, shore));
  const m = fbm(x * 0.004, z * 0.004, 3);
  _c.copy(COL.grass).lerp(COL.meadow, smooth(0.45, 0.7, m)).lerp(COL.dark, smooth(0.55, 0.75, fbm(x * 0.0025 + 5, z * 0.0025, 3)));
  const wf = regionW(REG.farm, x, z);
  if (wf > 0.05 && !townAt(x, z, 30)) {
    const f = fieldAt(x, z);
    const crop = CROPS[Math.floor(f.id * CROPS.length)];
    const rows = 0.9 + 0.1 * Math.sin((f.alongV ? f.u : f.v) * 2.2);
    const field = new THREE.Color().copy(crop).multiplyScalar(rows);
    if (f.edge < 3) field.copy(COL.dark);
    _c.lerp(field, smooth(0.05, 0.4, wf));
  }
  const wForest = regionW(REG.forest, x, z);
  if (wForest > 0) _c.lerp(COL.forestFloor, wForest * 0.7);
  const wHigh = regionW(REG.high, x, z);
  if (wHigh > 0) _c.lerp(fbm(x * 0.01, z * 0.01, 2) > 0.5 ? COL.heather : COL.dry, wHigh * 0.55);
  if (h > 140) _c.lerp(COL.dry, smooth(140, 200, h) * 0.5);
  if (slope > 0.55) _c.lerp(cliffW(x, z) > 0.3 ? COL.cliff : COL.rock, smooth(0.55, 0.9, slope));
  return _c;
}
const tiles = new Map();
// A tile of ground. Far off, every fourth point only (20 m apart), with a
// skirt hanging down round the edge so no gaps show where a coarse tile
// meets a fine one.
function buildTile(cx, cz, lod = 1) {
  const st = lod;
  const m = CV / st;
  const n = m + 1;
  const pos = [];
  const col = [];
  const uv = [];
  let maxH = -99;
  for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) {
    const i = cx * CV + a * st;
    const j = cz * CV + b * st;
    const h = gridH(i, j);
    maxH = Math.max(maxH, h);
    pos.push(i * GSTEP, h, j * GSTEP);
    uv.push((i * GSTEP) / 9, (j * GSTEP) / 9);
    const slope = Math.hypot(gridH(i + st, j) - gridH(i - st, j), gridH(i, j + st) - gridH(i, j - st)) / (2 * GSTEP * st);
    const c = groundColour(i * GSTEP, j * GSTEP, h, slope);
    col.push(c.r, c.g, c.b);
  }
  if (maxH < -2) return { cx, cz, mesh: null, maxH, lod };
  const idx = [];
  for (let b = 0; b < m; b++) for (let a = 0; a < m; a++) {
    const p = b * n + a;
    idx.push(p, p + n, p + 1, p + 1, p + n, p + n + 1);
  }
  // The skirt.
  const border = [];
  for (let a = 0; a < n; a++) border.push(a);
  for (let b = 1; b < n; b++) border.push(b * n + m);
  for (let a = m - 1; a >= 0; a--) border.push(m * n + a);
  for (let b = m - 1; b >= 0; b--) border.push(b * n);
  const base = pos.length / 3;
  border.forEach((k, q) => {
    pos.push(pos[k * 3], pos[k * 3 + 1] - 14, pos[k * 3 + 2]);
    uv.push(uv[k * 2], uv[k * 2 + 1]);
    col.push(col[k * 3] * 0.8, col[k * 3 + 1] * 0.8, col[k * 3 + 2] * 0.8);
    if (q) {
      const a0 = border[q - 1];
      const a1 = k;
      const b0 = base + q - 1;
      const b1 = base + q;
      idx.push(a0, b0, a1, a1, b0, b1, a0, a1, b0, a1, b1, b0);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, groundMat);
  mesh.receiveShadow = lod === 1;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  return { cx, cz, mesh, maxH, lod };
}

// ---------- Trees in the countryside ----------
const TREE = {
  trunk: new THREE.CylinderGeometry(0.17, 0.27, 1, 6).translate(0, 0.5, 0),
  blob: new THREE.IcosahedronGeometry(1, 0),
  blobFine: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
  fronds: (() => {
    const parts = [];
    for (let k = 0; k < 9; k++) {
      const g = new THREE.BoxGeometry(0.5, 0.05, 3.2).translate(0, 0, 1.6);
      g.rotateX(0.35 + (k % 2) * 0.15);
      g.rotateY((k / 9) * Math.PI * 2);
      parts.push(g);
    }
    return mergeGeometries(parts);
  })(),
  bark: new THREE.MeshLambertMaterial({ color: 0x6b4a32 }),
  palmBark: new THREE.MeshLambertMaterial({ color: 0x9a7a52 }),
  leaf: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
  greens: [0x4f9a3a, 0x5aa646, 0x3f8a36, 0x6cb04a, 0x478f3e, 0x7aaa3a].map((c) => new THREE.Color(c)),
  pine: [0x2f6a3a, 0x356f3c, 0x2a5f36].map((c) => new THREE.Color(c)),
  deep: [0x234f30, 0x2a5a34, 0x1f4a2c, 0x2e5f3a].map((c) => new THREE.Color(c)),
  rocks: [0x8a8880, 0x9c978c, 0x76777a].map((c) => new THREE.Color(c)),
  autumn: [0xd9822b, 0xe0a52a, 0xc4552a, 0xd8b23a, 0xb8402e].map((c) => new THREE.Color(c)),
  birch: [0x9ccf5a, 0xb5d86a].map((c) => new THREE.Color(c)),
  barkTinted: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  birchBark: new THREE.Color(0xe8e4dc),
  brownBark: new THREE.Color(0x6b4a32),
};
function instanced(geo, mat, list, f, color) {
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((t, k) => { f(t, tmpM); im.setMatrixAt(k, tmpM); if (color) im.setColorAt(k, color(t, k)); });
  im.castShadow = true;
  im.receiveShadow = mat !== TREE.leaf;
  im.computeBoundingSphere();
  return im;
}
const postsDone = new Set();
// What, if anything, grows at (x, z), given a roll of the dice r.
function treeAt(x, z, r) {
  const wForest = regionW(REG.forest, x, z);
  const wFarm = regionW(REG.farm, x, z);
  const wHigh = regionW(REG.high, x, z);
  const wMeadow = regionW(REG.meadow, x, z);
  const wWind = regionW(REG.wind, x, z);
  const woods = fbm(x * 0.0028 + 40, z * 0.0028 - 12, 4);
  // Ordinary country: woods in patches. The great forest: solid, and
  // tall. The highlands: a few hardy pines. Meadow and downs: the odd
  // big oak. Farmland: trees only along the hedgerows.
  let p = smooth(0.5, 0.68, woods) * 0.8 + 0.02;
  p = p * (1 - wForest) + 0.9 * wForest;
  p *= 1 - 0.85 * wHigh;
  p *= 1 - 0.95 * Math.max(wMeadow, wWind);
  if (wFarm > 0.2) p = p * (1 - wFarm) + (fieldAt(x, z).edge < 2.5 ? 0.3 : 0) * wFarm;
  if (r() > p) return null;
  if (townAt(x, z, 14) || roadAt(x, z, ROAD_HW + 5)) return null;
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (ld < lakeR(Math.atan2(z - LAKE.z, x - LAKE.x)) + 4) return null;
  if (nearPOI(x, z)) return null;
  const h = terrainH(x, z);
  if (h < 1.5) return null;
  const autumn = fbm(x * 0.0016 - 30, z * 0.0016 + 8, 3) > 0.62;
  let kind;
  if (Math.min(h, baseH(x, z)) < 4.5) kind = r() < 0.5 ? "palm" : null;
  else if (wForest > 0.35) kind = "tall";
  else if (ld < LAKE.r * 1.8) kind = r() < 0.7 ? "birch" : "round";
  else if (wHigh > 0.4 || h > 90) kind = "pine";
  else if (wForest > 0.1) kind = r() < 0.55 ? "pine" : r() < 0.25 ? "birch" : "round";
  else kind = r() < 0.25 ? "pine" : r() < 0.12 ? "birch" : "round";
  if (!kind) return null;
  const big = Math.max(wMeadow, wWind) > 0.3 ? 1.7 : 1;
  const s = kind === "tall" ? 1.0 + r() * 0.55 : (0.8 + r() * 0.7) * big;
  return { x, z, y: h - 0.2, s, kind, k: r(), autumn: autumn && kind === "round" };
}
function treesFor(cx, cz) {
  const list = [];
  const r = rng(cx * 7919 + cz * 104729 + 13);
  for (let b = 0; b < CH; b += 7) for (let a = 0; a < CH; a += 7) {
    const t = treeAt(cx * CH + a + r() * 6, cz * CH + b + r() * 6, r);
    if (t) list.push(t);
  }
  return list;
}
function buildTrees(cx, cz) {
  const list = treesFor(cx, cz);
  const key = cx * 4096 + cz;
  if (!postsDone.has(key)) { postsDone.add(key); for (const t of list) addPost(t.x, t.z, t.kind === "palm" ? 0.3 : t.kind === "tall" ? 0.5 * t.s : 0.32 * t.s); }
  const grp = new THREE.Group();
  const round = list.filter((t) => t.kind === "round");
  const pines = list.filter((t) => t.kind === "pine");
  const palms = list.filter((t) => t.kind === "palm");
  const birches = list.filter((t) => t.kind === "birch");
  const talls = list.filter((t) => t.kind === "tall");
  const blobs = [];
  // Rocks and bushes scattered through the fields and under the trees.
  const r2 = rng(cx * 31 + cz * 977 + 5);
  for (let k = 0; k < 70; k++) {
    const x = cx * CH + r2() * CH;
    const z = cz * CH + r2() * CH;
    if (townAt(x, z, 10) || roadAt(x, z, ROAD_HW + 2)) continue;
    const h = terrainH(x, z);
    if (h < 1) continue;
    const rock = r2() < 0.35 || h > 70;
    const s = rock ? 0.4 + Math.pow(r2(), 3) * 2.2 : 0.5 + r2() * 0.8;
    blobs.push({ x, y: h + (rock ? s * 0.15 : s * 0.4), z, s, sy: s * (rock ? 0.55 : 0.75), c: rock ? TREE.rocks[Math.floor(r2() * 3)] : TREE.greens[Math.floor(r2() * 6)] });
  }
  for (const t of round) {
    const c = t.autumn ? TREE.autumn[Math.floor(t.k * TREE.autumn.length)] : TREE.greens[Math.floor(t.k * 6)];
    blobs.push({ x: t.x, y: t.y + 3.7 * t.s, z: t.z, s: 2.2 * t.s, sy: 1.8 * t.s, c });
    blobs.push({ x: t.x + (t.k - 0.5) * 1.8 * t.s, y: t.y + 4.9 * t.s, z: t.z + (0.5 - t.k) * 1.4 * t.s, s: 1.5 * t.s, sy: 1.3 * t.s, c });
  }
  for (const t of birches) {
    blobs.push({ x: t.x, y: t.y + 5.2 * t.s, z: t.z, s: 1.3 * t.s, sy: 2.4 * t.s, c: TREE.birch[Math.floor(t.k * 2)] });
  }
  const add = (m) => m && grp.add(m);
  add(instanced(TREE.trunk, TREE.barkTinted, [...round, ...pines, ...birches], (t, m) => m.compose(tmpV.set(t.x, t.y, t.z), tmpQ.identity(), new THREE.Vector3(t.kind === "birch" ? 0.7 * t.s : t.s, (t.kind === "pine" ? 2 : t.kind === "birch" ? 4.5 : 2.8) * t.s, t.kind === "birch" ? 0.7 * t.s : t.s)), (t) => (t.kind === "birch" ? TREE.birchBark : TREE.brownBark)));
  add(instanced(TREE.blob, TREE.leaf, blobs, (b, m) => m.compose(tmpV.set(b.x, b.y, b.z), tmpQ.setFromEuler(tmpE.set(0, b.x, 0)), new THREE.Vector3(b.s, b.sy, b.s)), (b) => b.c));
  // The great forest's trees: thirty to forty metres, bare trunks under a
  // high dark canopy.
  add(instanced(TREE.trunk, TREE.barkTinted, talls, (t, m) => m.compose(tmpV.set(t.x, t.y, t.z), tmpQ.identity(), new THREE.Vector3(1.1 * t.s, 14 * t.s, 1.1 * t.s)), () => TREE.brownBark));
  add(instanced(TREE.cone, TREE.leaf, talls, (t, m) => m.compose(tmpV.set(t.x, t.y + 7 * t.s, t.z), tmpQ.setFromEuler(tmpE.set(0, t.k * 6, 0)), new THREE.Vector3(3.6 * t.s, 22 * t.s, 3.6 * t.s)), (t) => TREE.deep[Math.floor(t.k * TREE.deep.length)]));
  add(instanced(TREE.cone, TREE.leaf, pines, (t, m) => m.compose(tmpV.set(t.x, t.y + 1.4 * t.s, t.z), tmpQ.setFromEuler(tmpE.set(0, t.k * 6, 0)), new THREE.Vector3(2.2 * t.s, 8 * t.s, 2.2 * t.s)), (t) => TREE.pine[Math.floor(t.k * 3)]));
  add(instanced(new THREE.CylinderGeometry(0.16, 0.24, 1, 6).translate(0, 0.5, 0), TREE.palmBark, palms, (t, m) => m.compose(tmpV.set(t.x, t.y, t.z), tmpQ.identity(), new THREE.Vector3(t.s, 8 * t.s, t.s))));
  add(instanced(TREE.fronds, TREE.leaf, palms, (t, m) => m.compose(tmpV.set(t.x, t.y + 8 * t.s, t.z), tmpQ.setFromEuler(tmpE.set(0, t.k * 6, 0)), new THREE.Vector3(t.s, t.s, t.s)), () => TREE.greens[0]));
  scene.add(grp);
  return grp;
}

// ---------- The whole island, simply ----------
// Beyond the detailed ground, one coarse mesh of the entire island (and a
// stand-in forest, built with the places of interest) keeps every hill,
// wood and landmark on the skyline from anywhere. It sits a few metres low
// so the detailed tiles always cover it close up.
{
  const step = 24;
  const x0 = ISLE.cx - ISLE.rx * 1.08;
  const z0 = ISLE.cz - ISLE.rz * 1.08;
  const nx = Math.ceil((ISLE.rx * 2.16) / step);
  const nz = Math.ceil((ISLE.rz * 2.16) / step);
  const pos = [];
  const col = [];
  const idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * step;
    const z = z0 + j * step;
    const h = landH(x, z);
    pos.push(x, h - 4, z);
    const c = groundColour(x, z, h, 0);
    // Woods read as a darker green from afar.
    const t = treeAt(x, z, () => 0.5);
    if (t && t.kind !== "palm") c.lerp(t.kind === "tall" ? TREE.deep[0] : TREE.greens[2], 0.55);
    col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const p = j * (nx + 1) + i;
    idx.push(p, p + nx + 1, p + 1, p + 1, p + nx + 1, p + nx + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const far = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(far);
}

// ---------- Grass and wildflowers close by ----------
const GRASS_R = TOUCH ? 160 : 300;
const tuftTex = (() => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  const r = rng(404);
  for (let k = 0; k < 26; k++) {
    const x = 6 + r() * 52;
    const h = 30 + r() * 32;
    const lean = (r() - 0.5) * 18;
    g.strokeStyle = `rgb(${200 + r() * 55 | 0},${200 + r() * 55 | 0},${190 + r() * 40 | 0})`;
    g.lineWidth = 2 + r() * 2;
    g.beginPath();
    g.moveTo(x, 64);
    g.quadraticCurveTo(x + lean * 0.3, 64 - h * 0.6, x + lean, 64 - h);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const tuftGeo = (() => {
  const a = new THREE.PlaneGeometry(1, 0.7).translate(0, 0.35, 0);
  const b = a.clone().rotateY(Math.PI / 2);
  return mergeGeometries([a, b]);
})();
const tuftMat = new THREE.MeshLambertMaterial({ map: tuftTex, alphaTest: 0.45, side: THREE.DoubleSide });
const TUFT_COLS = [0x6aa548, 0x7cb552, 0x5d9a40, 0x8fbd5a, 0x6aa548, 0x7cb552, 0xf2d64b, 0xffffff, 0xe889b8, 0xb59de8].map((c) => new THREE.Color(c));
const grassTiles = new Map();
function buildGrass(cx, cz) {
  const r = rng(cx * 7333 + cz * 1013 + 77);
  const list = [];
  for (let k = 0; k < 900; k++) {
    const x = cx * CH + r() * CH;
    const z = cz * CH + r() * CH;
    if (townAt(x, z, 4) || roadAt(x, z, ROAD_HW + 1.5)) continue;
    const h = terrainH(x, z);
    if (h < 3.2) continue;
    // In clumps, thicker in the meadows.
    if (fbm(x * 0.02, z * 0.02, 2) < 0.42) continue;
    const flower = r() < 0.12;
    list.push({ x, y: h - 0.05, z, s: 0.7 + r() * 0.9, a: r() * 6, c: TUFT_COLS[flower ? 6 + Math.floor(r() * 4) : Math.floor(r() * 6)] });
  }
  const im = instanced(tuftGeo, tuftMat, list, (t, m) => m.compose(tmpV.set(t.x, t.y, t.z), tmpQ.setFromEuler(tmpE.set(0, t.a, 0)), new THREE.Vector3(t.s, t.s, t.s)), (t) => t.c);
  if (im) { im.castShadow = false; im.receiveShadow = true; scene.add(im); }
  return im;
}

// ---------- Streaming tiles in and out as you move ----------
const treeTiles = new Map();
function disposeGroup(g) {
  scene.remove(g);
  g.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
}
function streamLand(px, pz, budget = 2, limit = TERRAIN_R) {
  const want = [];
  const R1 = Math.ceil(TERRAIN_R / CH);
  const pcx = Math.floor(px / CH);
  const pcz = Math.floor(pz / CH);
  for (let dz = -R1; dz <= R1; dz++) for (let dx = -R1; dx <= R1; dx++) {
    const cx = pcx + dx;
    const cz = pcz + dz;
    const d = Math.hypot((cx + 0.5) * CH - px, (cz + 0.5) * CH - pz);
    if (d > Math.min(limit, TERRAIN_R) + CH * 0.7) continue;
    const key = cx * 4096 + cz;
    const have = tiles.get(key);
    const lod = d < FINE_R || (have && have.lod === 1 && d < FINE_R + 200) ? 1 : 4;
    if (!have || have.lod !== lod) want.push([have ? d + 100 : d, cx, cz, key, "tile", lod]);
    else if (d < TREE_R && !treeTiles.has(key) && tiles.get(key).maxH > 1) want.push([d + 50, cx, cz, key, "trees"]);
    else if (d < GRASS_R && !grassTiles.has(key) && tiles.get(key).maxH > 3) want.push([d + 80, cx, cz, key, "grass"]);
  }
  want.sort((a, b) => a[0] - b[0]);
  for (const [, cx, cz, key, what, lod] of want.slice(0, budget)) {
    if (what === "tile") {
      const old = tiles.get(key);
      if (old && old.mesh) { scene.remove(old.mesh); old.mesh.geometry.dispose(); }
      tiles.set(key, buildTile(cx, cz, lod));
    }
    else if (what === "trees") treeTiles.set(key, buildTrees(cx, cz));
    else grassTiles.set(key, buildGrass(cx, cz));
  }
  // Let go of what's well behind.
  for (const [key, t] of tiles) {
    const d = Math.hypot((t.cx + 0.5) * CH - px, (t.cz + 0.5) * CH - pz);
    if (d > TERRAIN_R + CH * 2.5) { if (t.mesh) { scene.remove(t.mesh); t.mesh.geometry.dispose(); } tiles.delete(key); }
  }
  for (const [key, g] of treeTiles) {
    const t = tiles.get(key);
    const d = t ? Math.hypot((t.cx + 0.5) * CH - px, (t.cz + 0.5) * CH - pz) : 1e9;
    if (d > TREE_R + CH * 1.5) { disposeGroup(g); treeTiles.delete(key); }
  }
  for (const [key, im] of grassTiles) {
    const t = tiles.get(key);
    const d = t ? Math.hypot((t.cx + 0.5) * CH - px, (t.cz + 0.5) * CH - pz) : 1e9;
    if (d > GRASS_R + CH) { if (im) { scene.remove(im); im.dispose(); } grassTiles.delete(key); }
  }
  return want.length;
}

// ---------- The country roads themselves ----------
{
  const tex = canvasTex(64, 256, (g) => {
    // 18 m across: two lanes each way, a double yellow down the middle,
    // dashed lines between the lanes, solid white at the edges.
    noiseFill(g, 64, 256, 0x55585d, 0.14, 91, 2);
    g.fillStyle = "#eeeeea";
    g.fillRect(2, 0, 1, 256);
    g.fillRect(61, 0, 1, 256);
    for (let y = 0; y < 256; y += 64) { g.fillRect(16, y, 1, 26); g.fillRect(47, y, 1, 26); }
    g.fillStyle = "#f1c232";
    g.fillRect(30, 0, 1, 256);
    g.fillRect(33, 0, 1, 256);
  });
  const mat = new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const road of roads) {
    const S = road.S;
    const pos = [];
    const uv = [];
    const idx = [];
    S.forEach((p, i) => {
      const rx = -p.dz;
      const rz = p.dx;
      pos.push(p.x - rx * ROAD_HW, p.y + 0.03, p.z - rz * ROAD_HW, p.x + rx * ROAD_HW, p.y + 0.03, p.z + rz * ROAD_HW);
      uv.push(0, p.s / 24, 1, p.s / 24);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
    // Marker posts along the verges, every 50 m.
    const postGeo = [];
    for (let i = 6; i < S.length - 6; i += 12) for (const s of [-1, 1]) {
      const p = S[i];
      postGeo.push(colored(new THREE.BoxGeometry(0.14, 1.0, 0.14).translate(p.x - p.dz * s * (ROAD_HW + 1.2), p.y + 0.5, p.z + p.dx * s * (ROAD_HW + 1.2)), 0xf4f4f0));
      postGeo.push(colored(new THREE.BoxGeometry(0.15, 0.12, 0.15).translate(p.x - p.dz * s * (ROAD_HW + 1.2), p.y + 0.85, p.z + p.dx * s * (ROAD_HW + 1.2)), s > 0 ? 0xe03a2a : 0xf0a020));
    }
    // Post-and-rail fences along stretches of verge, where the fields are.
    const fence = [];
    for (const side of [-1, 1]) {
      let prev = null;
      for (let i = 50; i < S.length - 50; i++) {
        const p = S[i];
        const on = fbm(p.s * 0.004 + side * 7, 3.3, 2) > 0.52;
        if (!on || i % 1) { prev = null; continue; }
        const x = p.x - p.dz * side * (ROAD_HW + 3.2);
        const z = p.z + p.dx * side * (ROAD_HW + 3.2);
        const y = terrainH(x, z);
        if (i % 1 === 0 && (p.s % 3.2) < 4) fence.push(colored(new THREE.BoxGeometry(0.12, 1.15, 0.12).translate(x, y + 0.5, z), 0x8a6a48));
        if (prev) {
          const len = Math.hypot(x - prev[0], z - prev[1]);
          for (const ry of [0.55, 0.95]) {
            const g = new THREE.BoxGeometry(0.05, 0.1, len);
            g.rotateY(Math.atan2(x - prev[0], z - prev[1]));
            g.translate((x + prev[0]) / 2, (y + prev[2]) / 2 + ry, (z + prev[1]) / 2);
            fence.push(colored(g, 0x9a7a55));
          }
        }
        prev = [x, z, y];
      }
    }
    if (fence.length) {
      const fm = new THREE.Mesh(mergeGeometries(fence), new THREE.MeshLambertMaterial({ vertexColors: true }));
      fm.castShadow = true;
      scene.add(fm);
    }
    const pm = new THREE.Mesh(mergeGeometries(postGeo), new THREE.MeshLambertMaterial({ vertexColors: true }));
    pm.castShadow = true;
    scene.add(pm);
  }
}

// ---------- Landmarks you can see from far off ----------
const turbines = [];
{
  const spots = [];
  // A wind farm along the northern downs, in two staggered rows.
  for (let k = 0; k < 4000 && spots.length < 8; k++) {
    const x = REG.wind.x + (hash2(k, 3) - 0.5) * REG.wind.r * 1.8;
    const z = REG.wind.z + (hash2(k, 7) - 0.5) * REG.wind.r * 1.4;
    if (townAt(x, z, 120) || roadAt(x, z, 60) || natH(x, z) < 12) continue;
    if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 150)) continue;
    spots.push([x, z]);
  }
  const white = new THREE.MeshLambertMaterial({ color: 0xf2f3f0 });
  for (const [x, z] of spots) {
    const y = landH(x, z) - 1;
    POIS.push({ x, z, r: 14 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 2.0, 70, 12), white);
    tower.position.set(x, y + 35, z);
    tower.castShadow = true;
    const head = new THREE.Group();
    head.position.set(x, y + 71, z);
    head.rotation.y = Math.atan2(SUN_DIR.x, SUN_DIR.z) + 0.6;
    const nac = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 7), white);
    nac.position.z = -1.5;
    const rotor = new THREE.Group();
    rotor.position.z = 2.2;
    for (let k = 0; k < 3; k++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, 34, 0.4).translate(0, 18, 0), white);
      blade.rotation.z = (k / 3) * Math.PI * 2;
      blade.castShadow = true;
      rotor.add(blade);
    }
    head.add(nac, rotor);
    scene.add(tower, head);
    turbines.push({ rotor, speed: 0.6 + hash2(x | 0, z | 0) * 0.4 });
  }
  // A lighthouse on the point west of the harbour.
  const lx = -960;
  const lz = -2300;
  const ly = Math.max(1, landH(lx, lz));
  const stripes = canvasTex(8, 64, (g) => { for (let y = 0; y < 64; y += 16) { g.fillStyle = "#f4f2ec"; g.fillRect(0, y, 8, 8); g.fillStyle = "#c9372c"; g.fillRect(0, y + 8, 8, 8); } });
  const lh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 26, 16), new THREE.MeshLambertMaterial({ map: stripes }));
  lh.position.set(lx, ly + 13, lz);
  lh.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3.2, 12), new THREE.MeshLambertMaterial({ color: 0x2b2f35 }));
  cap.position.set(lx, ly + 27.6, lz);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
  lamp.position.set(lx, ly + 27.8, lz);
  scene.add(lh, cap, lamp);
}
function updateLandmarks(dt) {
  for (const t of turbines) t.rotor.rotation.z += t.speed * dt;
}

// ---------- The mountain ----------
// A great snow-capped massif on its own island out to the north-west,
// about eight kilometres off and 2.6 km high, on the skyline from almost
// anywhere. Ridges, gullies and lesser peaks come from layers of "ridged"
// noise; snow lies on the high ground except where it's too steep to hold;
// below it bare rock, then forest down to a beach. Drawn past the fog, with
// the haze of distance painted into its colours instead.
function ridged(x, z, oct) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  let w = 1;
  for (let k = 0; k < oct; k++) {
    let n = 1 - Math.abs(vnoise(x * f + k * 31.7, z * f - k * 17.3) * 2 - 1);
    n *= n * w;
    w = clamp(n * 1.6, 0, 1);
    s += n * a;
    f *= 2.07;
    a *= 0.52;
  }
  return s;
}
const MOUNT = { x: -3900, z: 5200, h: 3100, r: 3900 };
// A tall, classic peak: steep upper slopes, ridges and gullies running
// down it from the summit, a lesser shoulder peak, and a skirt of foothills.
function mountainH(x, z) {
  const dx = x - MOUNT.x;
  const dz = z - MOUNT.z;
  const d = Math.hypot(dx, dz) / MOUNT.r;
  if (d > 1.05) return -60;
  const a = Math.atan2(dz, dx);
  // Ridges radiating from the top, wandering a little as they descend.
  const wob = (vnoise(Math.cos(a) * 2 + d * 3, Math.sin(a) * 2) - 0.5) * 1.6;
  const ribs = Math.pow(Math.abs(Math.sin(a * 6.5 + wob + d * 2.2)), 0.6);
  const cone = Math.pow(Math.max(0, 1 - d), 1.55);
  const shoulder = 0.32 * Math.exp(-((dx + 900) ** 2 + (dz - 700) ** 2) / 4.5e5);
  const foot = 0.08 * smooth(1.0, 0.5, d) * fbm(x * 0.002, z * 0.002, 4);
  const rough = ridged(x * 0.0011, z * 0.0011, 5) * 0.12 * smooth(0.05, 0.4, d);
  return MOUNT.h * (cone * (0.86 + 0.14 * ribs) + shoulder + foot + rough * cone) - 50 + smooth(1.0, 0.85, d) * 6;
}
{
  const N = 320;
  const span = MOUNT.r * 2.15;
  const step = span / N;
  const x0 = MOUNT.x - span / 2;
  const z0 = MOUNT.z - span / 2;
  const hs = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hs[j * (N + 1) + i] = mountainH(x0 + i * step, z0 + j * step);
  const H = (i, j) => hs[clamp(j, 0, N) * (N + 1) + clamp(i, 0, N)];
  const pos = new Float32Array((N + 1) * (N + 1) * 3);
  const col = new Float32Array((N + 1) * (N + 1) * 3);
  const haze = HAZE.clone();
  const snow = new THREE.Color(0xf6f8fc);
  const rock = new THREE.Color(0x646a74);
  const darkRock = new THREE.Color(0x4a4f58);
  const forest = new THREE.Color(0x355a40);
  const sand = new THREE.Color(0xd9cba0);
  const c = new THREE.Color();
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const k = j * (N + 1) + i;
    const h = H(i, j);
    const x = x0 + i * step;
    const z = z0 + j * step;
    pos[k * 3] = x;
    pos[k * 3 + 1] = h;
    pos[k * 3 + 2] = z;
    const slope = Math.hypot(H(i + 1, j) - H(i - 1, j), H(i, j + 1) - H(i, j - 1)) / (2 * step);
    const snowLine = 1400 + (fbm(x * 0.002, z * 0.002, 3) - 0.5) * 600;
    if (h < 12) c.copy(sand);
    else if (h < 600) c.copy(forest).lerp(rock, smooth(380, 650, h) + smooth(0.6, 1.1, slope) * 0.6);
    else c.copy(rock).lerp(darkRock, smooth(0.5, 1.0, slope) * 0.7);
    // Snow, where the ground is high and not too steep to hold it.
    const snowy = smooth(snowLine - 120, snowLine + 150, h) * (1 - smooth(0.75, 1.15, slope));
    c.lerp(snow, snowy);
    // Thicker haze low down, where you look through more air.
    c.lerp(haze, 0.25 + 0.6 * (1 - smooth(0, 1200, h)));
    col[k * 3] = c.r;
    col[k * 3 + 1] = c.g;
    col[k * 3 + 2] = c.b;
  }
  const idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const p = j * (N + 1) + i;
    if (hs[p] < -50 && hs[p + 1] < -50 && hs[p + N + 1] < -50 && hs[p + N + 2] < -50) continue;
    idx.push(p, p + N + 1, p + 1, p + 1, p + N + 1, p + N + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }));
  mesh.renderOrder = -1;
  scene.add(mesh);
}
