// ---------- The island ----------
// About 4.5 km across: rolling hills and woods inland, beaches round the
// edge. Three towns: the city on the east coast, a harbour town on the
// south coast and a hill village in the west, joined by long winding roads
// (each a minute or so at full speed). The ground is a height field built
// in tiles as you approach; roads and towns flatten it where they sit.
const SEA = 0;
function hash2(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(i, j);
  const b = hash2(i + 1, j);
  const c = hash2(i, j + 1);
  const d = hash2(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct = 4) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let k = 0; k < oct; k++) { s += a * vnoise(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= 0.5; }
  return s / (1 - Math.pow(0.5, oct));
}
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const ISLE = { cx: -1000, cz: -900, rx: 2380, rz: 2280 };
function coastD(x, z) {
  const dx = (x - ISLE.cx) / ISLE.rx;
  const dz = (z - ISLE.cz) / ISLE.rz;
  return Math.pow(dx ** 4 + dz ** 4, 0.25) + (fbm(x * 0.0011 + 7, z * 0.0011 + 3, 3) - 0.5) * 0.22;
}
// The land before roads and towns are cut into it.
function baseH(x, z) {
  const d = coastD(x, z);
  const land = smooth(1.03, 0.9, d);
  const inland = smooth(0.97, 0.6, d);
  const hills = Math.pow(fbm(x * 0.00085, z * 0.00085, 5), 1.7) * 150;
  const ridge = Math.pow(1 - Math.abs(fbm(x * 0.0005 + 11, z * 0.0005 - 5, 3) * 2 - 1), 3) * 45;
  return -16 + land * 20 + inland * (hills + ridge);
}

// ---------- Towns ----------
const TOWNS = [
  { name: "Verdant Bay", ox: 0, oz: 0, n: 10, y: 3, style: "city", downtown: [6.5, 6.5], parks: ["3,3", "3,4", "4,3", "4,4", "8,1", "1,7"] },
  { name: "Saltmarsh", ox: -600, oz: -2950, n: 4, y: 4, style: "harbor", downtown: [2, 2], parks: ["0,3"] },
  { name: "Larkhill", ox: -2900, oz: 560, n: 3, y: 46, style: "village", downtown: [1.5, 1.5], parks: ["1,1"] },
];
for (const t of TOWNS) { t.size = t.n * P; t.x0 = t.ox - EDGE - 6; t.z0 = t.oz - EDGE - 6; t.x1 = t.ox + t.size + EDGE + 6; t.z1 = t.oz + t.size + EDGE + 6; }
function townAt(x, z, margin = 0) {
  for (const t of TOWNS) if (x > t.x0 - margin && x < t.x1 + margin && z > t.z0 - margin && z < t.z1 + margin) return t;
  return null;
}
// A crossing on a town's edge, and the way out of town from it.
function gate(t, side, k) {
  const n = t.n;
  const [i, j, dx, dz] = side === "s" ? [k, 0, 0, -1] : side === "n" ? [k, n, 0, 1] : side === "w" ? [0, k, -1, 0] : [n, k, 1, 0];
  return { t, i, j, x: t.ox + i * P, z: t.oz + j * P, dx, dz };
}

// ---------- The roads between towns ----------
const ROAD_HW = 9; // half the width of a country road: two lanes each way
const roads = [];
function makeRoad(name, a, b, via, seed) {
  const r = rng(seed);
  const pts = [];
  pts.push([a.x + a.dx * RW, a.z + a.dz * RW], [a.x + a.dx * 70, a.z + a.dz * 70], [a.x + a.dx * 150, a.z + a.dz * 150]);
  const mids = [[a.x + a.dx * 150, a.z + a.dz * 150], ...via, [b.x + b.dx * 150, b.z + b.dz * 150]];
  for (let k = 1; k < mids.length; k++) {
    const [x0, z0] = mids[k - 1];
    const [x1, z1] = mids[k];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const nx = -(z1 - z0) / len;
    const nz = (x1 - x0) / len;
    // One long bend between each pair of waypoints.
    const off = (r() < 0.5 ? -1 : 1) * (0.1 + r() * 0.12) * len;
    pts.push([x0 + (x1 - x0) * 0.5 + nx * off, z0 + (z1 - z0) * 0.5 + nz * off]);
    pts.push([x1, z1]);
  }
  pts.push([b.x + b.dx * 70, b.z + b.dz * 70], [b.x + b.dx * RW, b.z + b.dz * RW]);
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const total = curve.getLength();
  const n = Math.round(total / 4);
  const S = curve.getSpacedPoints(n).map((v, i) => ({ x: v.x, z: v.z, y: 0, s: 0 }));
  // Ease every bend out into a long sweep you can take at speed, leaving
  // the straight runs out of town as they are.
  const K = 38;
  for (let it = 0; it < 2500; it++) {
    const xs = S.map((p) => p.x);
    const zs = S.map((p) => p.z);
    for (let i = 1; i < S.length - 1; i++) {
      // Full strength in the middle, fading to nothing at the town gates.
      const w = smooth(0, K, Math.min(i, S.length - 1 - i));
      S[i].x += w * ((xs[i - 1] + 2 * xs[i] + xs[i + 1]) / 4 - xs[i]);
      S[i].z += w * ((zs[i - 1] + 2 * zs[i] + zs[i + 1]) / 4 - zs[i]);
    }
  }
  for (let i = 1; i < S.length; i++) S[i].s = S[i - 1].s + Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z);
  // Heights: follow the land, smoothed, no steeper than about 1 in 12, and
  // level with the towns at either end.
  const ends = (i) => (i < 40 ? a.t.y : i > S.length - 41 ? b.t.y : null);
  let ys = S.map((p, i) => ends(i) ?? Math.max(2, natH(p.x, p.z)));
  for (let pass = 0; pass < 3; pass++) {
    const out = ys.slice();
    for (let i = 0; i < S.length; i++) {
      if (ends(i) !== null) continue;
      let s = 0;
      let c = 0;
      for (let k = -30; k <= 30; k++) { const q = ys[clamp(i + k, 0, S.length - 1)]; s += q; c++; }
      out[i] = s / c;
    }
    ys = out;
  }
  for (let i = 1; i < S.length; i++) ys[i] = clamp(ys[i], ys[i - 1] - 0.32, ys[i - 1] + 0.32);
  for (let i = S.length - 2; i >= 0; i--) ys[i] = clamp(ys[i], ys[i + 1] - 0.32, ys[i + 1] + 0.32);
  S.forEach((p, i) => (p.y = Math.max(1.6, ys[i])));
  for (let i = 0; i < S.length; i++) {
    const p = S[Math.max(0, i - 1)];
    const q = S[Math.min(S.length - 1, i + 1)];
    const l = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    S[i].dx = (q.x - p.x) / l;
    S[i].dz = (q.z - p.z) / l;
  }
  // The tightest bend, as a radius (for checking).
  let minR = 1e9;
  for (let i = 30; i < S.length - 30; i++) {
    const t = Math.acos(clamp(S[i - 5].dx * S[i + 5].dx + S[i - 5].dz * S[i + 5].dz, -1, 1));
    if (t > 1e-4) minR = Math.min(minR, (S[i + 5].s - S[i - 5].s) / t);
  }
  const road = { name, S, a, b, length: S[S.length - 1].s, minR };
  roads.push(road);
  return road;
}
const [CITY, HARBOR, VILLAGE] = TOWNS;
makeRoad("Coast Highway", gate(CITY, "s", 3), gate(HARBOR, "n", 2), [[350, -550], [80, -1050], [-280, -1450], [-120, -1950], [-420, -2320]], 11);
makeRoad("Ridge Road", gate(CITY, "w", 5), gate(VILLAGE, "e", 1), [[-480, 520], [-900, 280], [-1380, 640], [-1880, 420], [-2330, 760]], 23);
makeRoad("Old Mill Road", gate(HARBOR, "w", 2), gate(VILLAGE, "s", 1), [[-1150, -2700], [-1750, -2860], [-2320, -2480], [-2880, -1880], [-3000, -1180], [-2830, -520], [-2900, 0]], 37);

// Where the roads are, for quick lookups: each 4 m piece filed in 40 m cells.
const RCELL = 40;
const roadGrid = new Map();
for (const road of roads) {
  const S = road.S;
  for (let i = 0; i < S.length - 1; i++) {
    const p = S[i];
    const q = S[i + 1];
    for (let cx = Math.floor(Math.min(p.x, q.x) / RCELL); cx <= Math.floor(Math.max(p.x, q.x) / RCELL); cx++) for (let cz = Math.floor(Math.min(p.z, q.z) / RCELL); cz <= Math.floor(Math.max(p.z, q.z) / RCELL); cz++) {
      const k = cx * 65536 + cz;
      if (!roadGrid.has(k)) roadGrid.set(k, []);
      roadGrid.get(k).push([road, i]);
    }
  }
}
// The nearest road to a point, if one is within `maxD`.
const _ra = { d: 0, y: 0, road: null, i: 0, f: 0 };
function roadAt(x, z, maxD = 40) {
  let best = maxD;
  let found = false;
  const r = Math.ceil(maxD / RCELL);
  const cx0 = Math.floor(x / RCELL);
  const cz0 = Math.floor(z / RCELL);
  for (let cx = cx0 - r; cx <= cx0 + r; cx++) for (let cz = cz0 - r; cz <= cz0 + r; cz++) {
    const list = roadGrid.get(cx * 65536 + cz);
    if (!list) continue;
    for (const [road, i] of list) {
      const p = road.S[i];
      const q = road.S[i + 1];
      const ex = q.x - p.x;
      const ez = q.z - p.z;
      const l2 = ex * ex + ez * ez;
      const f = clamp(((x - p.x) * ex + (z - p.z) * ez) / l2, 0, 1);
      const d = Math.hypot(x - p.x - ex * f, z - p.z - ez * f);
      if (d < best) { best = d; found = true; _ra.d = d; _ra.y = p.y + (q.y - p.y) * f; _ra.road = road; _ra.i = i; _ra.f = f; }
    }
  }
  return found ? _ra : null;
}

// ---------- The ground's height ----------
// The land, flattened under the towns and graded under the roads.
// The land with the towns settled into it: hills ease down to a town's
// level over most of a kilometre, so each sits in a broad hollow or on a
// broad shelf rather than at the foot of a cliff.
function natH(x, z) {
  let h = baseH(x, z);
  for (const t of TOWNS) {
    const dx = Math.max(t.x0 - x, 0, x - t.x1);
    const dz = Math.max(t.z0 - z, 0, z - t.z1);
    const d = Math.hypot(dx, dz);
    const reach = h > t.y ? 1000 : t.y > 10 ? 650 : 170;
    if (d < reach) h += (t.y - 0.06 - h) * smooth(reach, 30, d);
  }
  return h;
}
function landH(x, z) {
  let h = natH(x, z);
  const r = roadAt(x, z, 42);
  if (r) h += (r.y - 0.2 - h) * smooth(42, ROAD_HW + 3, r.d);
  return h;
}
// The ground as drawn: the tiles are 5 m grids, so heights in between are
// read off the same two triangles the tile draws.
const GSTEP = 5;
const hCache = new Map();
function gridH(i, j) {
  const k = i * 131072 + j;
  let h = hCache.get(k);
  if (h === undefined) {
    if (hCache.size > 200000) hCache.clear();
    h = landH(i * GSTEP, j * GSTEP);
    hCache.set(k, h);
  }
  return h;
}
function terrainH(x, z) {
  const i = Math.floor(x / GSTEP);
  const j = Math.floor(z / GSTEP);
  const fx = x / GSTEP - i;
  const fz = z / GSTEP - j;
  const a = gridH(i, j);
  const b = gridH(i + 1, j);
  const c = gridH(i, j + 1);
  const d = gridH(i + 1, j + 1);
  if (fx + fz < 1) return a + (b - a) * fx + (c - a) * fz;
  return d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
// Is (x, z) on a town's raised blocks?
function onBlock(t, x, z) {
  const lx = x - t.ox;
  const lz = z - t.oz;
  if (lx < -RW || lz < -RW || lx > t.size + RW || lz > t.size + RW) return false;
  const fx = ((lx % P) + P) % P;
  const fz = ((lz % P) + P) % P;
  return fx > RW && fx < P - RW && fz > RW && fz < P - RW;
}
// What a wheel stands on, and its height.
let surface = "road";
function groundAt(x, z) {
  const t = townAt(x, z);
  if (t) { surface = "road"; return t.y + (onBlock(t, x, z) ? CURB : 0); }
  const r = roadAt(x, z, ROAD_HW + 0.6);
  if (r) { surface = "road"; return r.y + 0.03; }
  surface = "grass";
  return terrainH(x, z);
}
