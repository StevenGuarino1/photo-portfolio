// ---------- Ground tiles, woods, sea ----------
const CH = 200; // a tile's size
const CV = CH / GSTEP; // cells along a tile
const TERRAIN_R = TOUCH ? 1100 : 1500;
const TREE_R = TOUCH ? 520 : 760;
scene.fog.near = 260;
scene.fog.far = TERRAIN_R + 50;

// The sea.
{
  const water = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshPhongMaterial({ color: 0x2b8db0, specular: 0xcfeeff, shininess: 70 }));
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
};
const _c = new THREE.Color();
function groundColour(x, z, h, slope) {
  const r = roadAt(x, z, ROAD_HW + 3);
  if (r && r.d > ROAD_HW - 0.5) return _c.copy(COL.gravel);
  if (h < 1.2) return _c.copy(COL.wet);
  if (h < 3.4) return _c.copy(COL.sand).lerp(COL.grass, smooth(2.4, 3.4, h));
  const m = fbm(x * 0.004, z * 0.004, 3);
  _c.copy(COL.grass).lerp(COL.meadow, smooth(0.45, 0.7, m)).lerp(COL.dark, smooth(0.55, 0.75, fbm(x * 0.0025 + 5, z * 0.0025, 3)));
  if (slope > 0.55) _c.lerp(COL.rock, smooth(0.55, 0.9, slope));
  return _c;
}
const tiles = new Map();
function buildTile(cx, cz) {
  const n = CV + 1;
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  const uv = new Float32Array(n * n * 2);
  let maxH = -99;
  for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) {
    const i = cx * CV + a;
    const j = cz * CV + b;
    const h = gridH(i, j);
    maxH = Math.max(maxH, h);
    const k = b * n + a;
    pos.set([i * GSTEP, h, j * GSTEP], k * 3);
    uv.set([(i * GSTEP) / 9, (j * GSTEP) / 9], k * 2);
    const slope = Math.hypot(gridH(i + 1, j) - gridH(i - 1, j), gridH(i, j + 1) - gridH(i, j - 1)) / (2 * GSTEP);
    const c = groundColour(i * GSTEP, j * GSTEP, h, slope);
    col.set([c.r, c.g, c.b], k * 3);
  }
  if (maxH < -2) return { cx, cz, mesh: null, maxH };
  const idx = [];
  for (let b = 0; b < CV; b++) for (let a = 0; a < CV; a++) {
    const p = b * n + a;
    // Split each cell the same way terrainH reads it.
    idx.push(p, p + n, p + 1, p + 1, p + n, p + n + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, groundMat);
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  return { cx, cz, mesh, maxH };
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
function treesFor(cx, cz) {
  const list = [];
  const r = rng(cx * 7919 + cz * 104729 + 13);
  for (let b = 0; b < CH; b += 8) for (let a = 0; a < CH; a += 8) {
    const x = cx * CH + a + r() * 7;
    const z = cz * CH + b + r() * 7;
    const forest = fbm(x * 0.0028 + 40, z * 0.0028 - 12, 4);
    const p = smooth(0.48, 0.66, forest) * 0.85 + 0.035;
    if (r() > p) continue;
    if (townAt(x, z, 14)) continue;
    const road = roadAt(x, z, ROAD_HW + 5);
    if (road) continue;
    const h = terrainH(x, z);
    if (h < 1.5) continue;
    const kind = h < 4.5 ? (r() < 0.5 ? "palm" : null) : h > 55 || r() < 0.3 ? "pine" : "round";
    if (!kind) continue;
    list.push({ x, z, y: h - 0.2, s: 0.8 + r() * 0.7, kind, k: r() });
  }
  return list;
}
function buildTrees(cx, cz) {
  const list = treesFor(cx, cz);
  const key = cx * 4096 + cz;
  if (!postsDone.has(key)) { postsDone.add(key); for (const t of list) addPost(t.x, t.z, t.kind === "palm" ? 0.3 : 0.32 * t.s); }
  const grp = new THREE.Group();
  const round = list.filter((t) => t.kind === "round");
  const pines = list.filter((t) => t.kind === "pine");
  const palms = list.filter((t) => t.kind === "palm");
  const blobs = [];
  for (const t of round) {
    blobs.push({ x: t.x, y: t.y + 3.7 * t.s, z: t.z, s: 2.2 * t.s, sy: 1.8 * t.s, c: TREE.greens[Math.floor(t.k * 6)] });
    blobs.push({ x: t.x + (t.k - 0.5) * 1.8 * t.s, y: t.y + 4.9 * t.s, z: t.z + (0.5 - t.k) * 1.4 * t.s, s: 1.5 * t.s, sy: 1.3 * t.s, c: TREE.greens[Math.floor(t.k * 6)] });
  }
  const add = (m) => m && grp.add(m);
  add(instanced(TREE.trunk, TREE.bark, [...round, ...pines], (t, m) => m.compose(tmpV.set(t.x, t.y, t.z), tmpQ.identity(), new THREE.Vector3(t.s, (t.kind === "pine" ? 2 : 2.8) * t.s, t.s))));
  add(instanced(TREE.blob, TREE.leaf, blobs, (b, m) => m.compose(tmpV.set(b.x, b.y, b.z), tmpQ.setFromEuler(tmpE.set(0, b.x, 0)), new THREE.Vector3(b.s, b.sy, b.s)), (b) => b.c));
  add(instanced(TREE.cone, TREE.leaf, pines, (t, m) => m.compose(tmpV.set(t.x, t.y + 1.4 * t.s, t.z), tmpQ.setFromEuler(tmpE.set(0, t.k * 6, 0)), new THREE.Vector3(2.2 * t.s, 8 * t.s, 2.2 * t.s)), (t) => TREE.pine[Math.floor(t.k * 3)]));
  add(instanced(new THREE.CylinderGeometry(0.16, 0.24, 1, 6).translate(0, 0.5, 0), TREE.palmBark, palms, (t, m) => m.compose(tmpV.set(t.x, t.y, t.z), tmpQ.identity(), new THREE.Vector3(t.s, 8 * t.s, t.s))));
  add(instanced(TREE.fronds, TREE.leaf, palms, (t, m) => m.compose(tmpV.set(t.x, t.y + 8 * t.s, t.z), tmpQ.setFromEuler(tmpE.set(0, t.k * 6, 0)), new THREE.Vector3(t.s, t.s, t.s)), () => TREE.greens[0]));
  scene.add(grp);
  return grp;
}

// ---------- Streaming tiles in and out as you move ----------
const treeTiles = new Map();
function disposeGroup(g) {
  scene.remove(g);
  g.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
}
function streamLand(px, pz, budget = 2) {
  const want = [];
  const R1 = Math.ceil(TERRAIN_R / CH);
  const pcx = Math.floor(px / CH);
  const pcz = Math.floor(pz / CH);
  for (let dz = -R1; dz <= R1; dz++) for (let dx = -R1; dx <= R1; dx++) {
    const cx = pcx + dx;
    const cz = pcz + dz;
    const d = Math.hypot((cx + 0.5) * CH - px, (cz + 0.5) * CH - pz);
    if (d > TERRAIN_R + CH * 0.7) continue;
    const key = cx * 4096 + cz;
    if (!tiles.has(key)) want.push([d, cx, cz, key, "tile"]);
    else if (d < TREE_R && !treeTiles.has(key) && tiles.get(key).maxH > 1) want.push([d + 50, cx, cz, key, "trees"]);
  }
  want.sort((a, b) => a[0] - b[0]);
  for (const [, cx, cz, key, what] of want.slice(0, budget)) {
    if (what === "tile") tiles.set(key, buildTile(cx, cz));
    else treeTiles.set(key, buildTrees(cx, cz));
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
  return want.length;
}

// ---------- The country roads themselves ----------
{
  const tex = canvasTex(64, 256, (g) => {
    noiseFill(g, 64, 256, 0x55585d, 0.14, 91, 2);
    g.fillStyle = "#eeeeea";
    g.fillRect(3, 0, 2, 256);
    g.fillRect(59, 0, 2, 256);
    g.fillStyle = "#f1c232";
    for (let y = 0; y < 256; y += 64) g.fillRect(31, y, 2, 30);
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
      uv.push(0, p.s / 16, 1, p.s / 16);
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
    const pm = new THREE.Mesh(mergeGeometries(postGeo), new THREE.MeshLambertMaterial({ vertexColors: true }));
    pm.castShadow = true;
    scene.add(pm);
  }
}

// ---------- Landmarks you can see from far off ----------
const turbines = [];
{
  const spots = [];
  for (let k = 0; k < 4000 && spots.length < 9; k++) {
    const x = ISLE.cx + (hash2(k, 3) - 0.5) * ISLE.rx * 1.6;
    const z = ISLE.cz + (hash2(k, 7) - 0.5) * ISLE.rz * 1.6;
    const h = baseH(x, z);
    if (h < 70 || townAt(x, z, 200) || roadAt(x, z, 70)) continue;
    if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 260)) continue;
    spots.push([x, z]);
  }
  const white = new THREE.MeshLambertMaterial({ color: 0xf2f3f0 });
  for (const [x, z] of spots) {
    const y = landH(x, z) - 1;
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
  const lx = -1250;
  const lz = -3060;
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
