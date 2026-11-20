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
// The whole island is laid out at this scale: smaller means every place is
// in sight of the others.
const WS = 0.75;
const ISLE = { cx: -1000 * WS, cz: -900 * WS, rx: 2380 * WS, rz: 2280 * WS };
function coastD(x, z) {
  const dx = (x - ISLE.cx) / ISLE.rx;
  const dz = (z - ISLE.cz) / ISLE.rz;
  return Math.pow(dx ** 4 + dz ** 4, 0.25) + (fbm(x * 0.0011 + 7, z * 0.0011 + 3, 3) - 0.5) * 0.22;
}
// The land before roads and towns are cut into it.
// Parts of the island, each with its own character: a great forest in the
// west, farmland in a patchwork of fields to the south, rocky highlands in
// the middle, an open meadow by the west coast, a wind farm on the northern
// downs, sea cliffs under Larkhill, and a lake in the south-west.
const REG = {
  forest: { x: -2350, z: -1250, r: 950 },
  farm: { x: -250, z: -1650, r: 760 },
  high: { x: -1250, z: -380, r: 680 },
  meadow: { x: -2550, z: -250, r: 460 },
  wind: { x: -560, z: 1000, r: 380 },
};
const LAKE = { x: -1650, z: -2030, r: 250, y: 16 };
for (const r of Object.values(REG)) { r.x *= WS; r.z *= WS; r.r *= WS; }
LAKE.x *= WS;
LAKE.z *= WS;
LAKE.r *= 0.85;
const POIS_EARLY = [];
const QUARRY = { x: REG.high.x + 330, z: REG.high.z - 230, r: 85 };
// The airfield in the farmland: a strip laid level across the fields.
const FIELD_A = 0.38; // the fields' grid is turned a little off true
const AIR = { x: 260, z: -1360, a: FIELD_A, len: 560, w: 46, y: 0 };
const regionW = (R, x, z) => smooth(R.r, R.r * 0.4, Math.hypot(x - R.x, z - R.z));
function lakeR(a) { return LAKE.r * (1 + 0.36 * (vnoise(Math.cos(a) * 1.7 + 5, Math.sin(a) * 1.7 + 5) - 0.5)); }
function cliffW(x, z) { return smooth(-2250 * WS, -2650 * WS, x) * smooth(-1000 * WS, -200 * WS, z); }
function baseH0(x, z) {
  const d = coastD(x, z);
  const cw = cliffW(x, z);
  const land = smooth(1.03, 0.9, d) * (1 - cw) + smooth(1.005, 0.99, d) * cw;
  const inland = smooth(0.97, 0.6, d) * (1 - cw) + smooth(0.995, 0.93, d) * cw;
  const wHigh = regionW(REG.high, x, z);
  const wFlat = Math.max(regionW(REG.farm, x, z) * 0.7, regionW(REG.meadow, x, z) * 0.45);
  const hills = Math.pow(fbm(x * 0.00085, z * 0.00085, 5), 1.7) * 150 * (1 - wFlat) * (1 + wHigh * 0.7);
  const ridge = Math.pow(1 - Math.abs(fbm(x * 0.0005 + 11, z * 0.0005 - 5, 3) * 2 - 1), 3) * 45;
  // Craggy tops in the highlands.
  const crags = wHigh * Math.pow(1 - Math.abs(vnoise(x * 0.004, z * 0.004) * 2 - 1), 4) * 35;
  let h = -16 + land * 20 + inland * (hills + ridge + crags) + cw * 34 * smooth(1.0, 0.97, d);
  // A quarry cut into the highlands in great steps.
  const qd = Math.hypot(x - QUARRY.x, z - QUARRY.z);
  if (qd < QUARRY.r) h -= Math.floor(((QUARRY.r - qd) / QUARRY.r) * 6) * 7;
  return h;
}
AIR.y = baseH0(AIR.x, AIR.z);
POIS_EARLY.push({ x: QUARRY.x, z: QUARRY.z, r: QUARRY.r + 20 }, { x: AIR.x, z: AIR.z, r: AIR.len / 2 + 30 });
// The lake sits in the land as it is: its surface a little below the
// lowest point of the ground round it, so it never spills.
{
  let lo = 1e9;
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const r = lakeR(a) * 1.15;
    lo = Math.min(lo, baseH0(LAKE.x + Math.cos(a) * r, LAKE.z + Math.sin(a) * r));
  }
  LAKE.y = Math.max(6, lo - 2.5);
}
function baseH(x, z) {
  let h = baseH0(x, z);
  // The lake: a bowl below its water, a low rim round it.
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (ld < LAKE.r * 1.4 + 160) {
    const lr = lakeR(Math.atan2(z - LAKE.z, x - LAKE.x));
    // The bed below the water; round it, a shore that rises gently to
    // meet the land over 150 m.
    const rim = LAKE.y + 0.4;
    if (ld < lr) h = LAKE.y - 1 - 6 * smooth(lr, lr * 0.3, ld);
    else h = rim + (Math.max(h, rim) - rim) * smooth(lr, lr + 150, ld);
  }
  return h;
}

// ---------- Towns ----------
const TOWNS = [
  { name: "Verdant Bay", ox: 0, oz: 0, n: 10, y: 3, style: "city", downtown: [6.5, 6.5], parks: ["3,3", "3,4", "4,3", "4,4", "8,1", "1,7"], landmarks: { "6,6": "spire", "5,3": "civic", "2,5": "church", "8,8": "stadium", "6,2": "clock", "3,7": "museum" } },
  { name: "Saltmarsh", ox: -460, oz: -2215, n: 4, y: 4, style: "harbor", downtown: [2, 2], parks: ["0,3"], landmarks: { "1,0": "market" } },
  { name: "Larkhill", ox: -2160, oz: 200, n: 4, y: 46, style: "village", downtown: [1.5, 1.5], parks: ["1,1"], landmarks: { "1,2": "chapel" } },
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
const ROAD_HW = 9; // half the width of the highway out of town: two lanes each way
const roads = [];
const [CITY, HARBOR, VILLAGE] = TOWNS;
// How far (x, z) is outside the nearest town's paved edge (0 inside).
function townDist(x, z) {
  let best = 1e9;
  for (const t of TOWNS) best = Math.min(best, Math.hypot(Math.max(t.x0 - x, 0, x - t.x1), Math.max(t.z0 - z, 0, z - t.z1)));
  return best;
}
// The island's one great road: a loop that runs straight down the middle
// of each town (east-west through the city and the harbour, south-north
// through Larkhill) and sweeps between them in long fast bends, past
// almost everything worth seeing. Inside a town it's that town's main
// street, kept clear of junctions and lights so you never have to stop.
// Points round a quarter circle (a bend leaving a town), from heading
// one way to heading the other.
function arc(cx, cz, r, from, to) {
  const out = [];
  for (let k = 1; k <= 6; k++) {
    const t = ((k / 6) * Math.PI) / 2;
    // from 0: leaving east, turning south; from 1: leaving north, turning east.
    if (from === 0) out.push([cx + r * Math.sin(t), cz + r * Math.cos(t)]);
    else out.push([cx - r * Math.cos(t), cz + r * Math.sin(t)]);
  }
  void to;
  return out;
}
// Evenly spaced points straight down a town's main street.
function line(x, z, dx, dz, n) {
  const out = [];
  for (let k = 0; k <= n; k++) out.push([x + dx * k * P, z + dz * k * P]);
  return out;
}
function makeLoop() {
  const hz = HARBOR.oz + 2 * P;
  const vx = VILLAGE.ox + 2 * P;
  const cz = CITY.oz + 5 * P;
  const pts = [
    // Through the city, west to east.
    [-130, cz], ...line(CITY.ox, cz, 1, 0, CITY.n),
    // Round the east coast in a long bend and down to the harbour.
    ...arc(CITY.x1, cz - 210, 210, 0, 1),
    [960, -60], [880, -420], [640, -790], [320, -1060], [20, -1320], [-60, -1640], [110, -1930], [HARBOR.ox + HARBOR.size + 220, hz],
    // Through Saltmarsh, east to west.
    [HARBOR.ox + HARBOR.size + 110, hz], ...line(HARBOR.ox + HARBOR.size, hz, -1, 0, HARBOR.n), [HARBOR.ox - 120, hz],
    // Past the lake and up through the great forest to Larkhill.
    [-780, -2050], [-1100, -1900], [-1450, -1690], [-1760, -1300], [-1960, -800], [-2040, -300], [vx, VILLAGE.oz - 160],
    // Through Larkhill, south to north.
    [vx, VILLAGE.oz - 60], ...line(vx, VILLAGE.oz, 0, 1, VILLAGE.n),
    // Along the clifftops and the northern downs, back to the city.
    ...arc(vx + 210, VILLAGE.z1, 210, 1, 0), [-1500, 790], [-1050, 720], [-650, 560], [-330, 400],
  ];
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
  const total = curve.getLength();
  const n = Math.round(total / 4);
  const S = curve.getSpacedPoints(n).slice(0, n).map((v) => ({ x: v.x, z: v.z, y: 0, s: 0 }));
  const N = S.length;
  const W = (i) => ((i % N) + N) % N;
  // Ease the bends into long sweeps, leaving the runs through town straight.
  const free = S.map((p) => smooth(25, 150, townDist(p.x, p.z)));
  for (let it = 0; it < 2500; it++) {
    const xs = S.map((p) => p.x);
    const zs = S.map((p) => p.z);
    for (let i = 0; i < N; i++) {
      const w = free[i];
      if (!w) continue;
      S[i].x += w * ((xs[W(i - 1)] + 2 * xs[i] + xs[W(i + 1)]) / 4 - xs[i]);
      S[i].z += w * ((zs[W(i - 1)] + 2 * zs[i] + zs[W(i + 1)]) / 4 - zs[i]);
    }
  }
  for (let i = 1; i < N; i++) S[i].s = S[i - 1].s + Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z);
  // Heights: level through the towns, following the land between them,
  // smoothed and no steeper than about 1 in 12.
  const fixed = S.map((p) => { const t = townAt(p.x, p.z, 30); return t ? t.y : null; });
  let ys = S.map((p, i) => fixed[i] ?? Math.max(2, natH(p.x, p.z)));
  for (let pass = 0; pass < 3; pass++) {
    const out = ys.slice();
    for (let i = 0; i < N; i++) {
      if (fixed[i] !== null) continue;
      let sum = 0;
      for (let k = -30; k <= 30; k++) sum += ys[W(i + k)];
      out[i] = sum / 61;
    }
    ys = out;
  }
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < N; i++) if (fixed[i] === null) ys[i] = clamp(ys[i], ys[W(i - 1)] - 0.32, ys[W(i - 1)] + 0.32);
    for (let i = N - 1; i >= 0; i--) if (fixed[i] === null) ys[i] = clamp(ys[i], ys[W(i + 1)] - 0.32, ys[W(i + 1)] + 0.32);
  }
  const names = [["Bay Road", CITY], ["Coast Highway", HARBOR], ["Forest Road", VILLAGE], ["Downs Road", CITY]];
  S.forEach((p, i) => {
    p.y = Math.max(1.6, ys[i]);
    const q = S[W(i + 1)];
    const o = S[W(i - 1)];
    const l = Math.hypot(q.x - o.x, q.z - o.z) || 1;
    p.dx = (q.x - o.x) / l;
    p.dz = (q.z - o.z) / l;
    const td = townDist(p.x, p.z);
    p.hw = 7 + 2 * smooth(0, 60, td);
    p.town = townAt(p.x, p.z, 0);
  });
  // Name each stretch by where it's heading.
  let next = null;
  for (let k = 0; k < 2; k++) for (let i = N - 1; i >= 0; i--) {
    if (S[i].town) next = S[i].town;
    S[i].name = next === HARBOR ? "Coast Highway" : next === VILLAGE ? "Forest Road" : next === CITY ? "Downs Road" : "Loop";
  }
  void names;
  let minR = 1e9;
  for (let i = 0; i < N; i++) {
    const a = S[W(i - 5)];
    const b = S[W(i + 5)];
    const t = Math.acos(clamp(a.dx * b.dx + a.dz * b.dz, -1, 1));
    if (t > 1e-4) minR = Math.min(minR, 40 / t);
  }
  const road = { name: "The Loop", S, closed: true, length: S[N - 1].s, minR };
  roads.push(road);
  return road;
}
// Each town's main street, which the loop runs along.
CITY.hw = { axis: "x", k: 5 };
HARBOR.hw = { axis: "x", k: 2 };
VILLAGE.hw = { axis: "z", k: 2 };
const LOOP = makeLoop();

// Where the roads are, for quick lookups: each 4 m piece filed in 40 m cells.
const RCELL = 40;
const roadGrid = new Map();
for (const road of roads) {
  const S = road.S;
  for (let i = 0; i < S.length - (road.closed ? 0 : 1); i++) {
    const p = S[i];
    const q = S[(i + 1) % S.length];
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
      const q = road.S[(i + 1) % road.S.length];
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
function airLocal(x, z) {
  const dx = x - AIR.x;
  const dz = z - AIR.z;
  return [dx * Math.cos(AIR.a) + dz * Math.sin(AIR.a), -dx * Math.sin(AIR.a) + dz * Math.cos(AIR.a)];
}
function natH(x, z) {
  let h = baseH(x, z);
  const [au, av] = airLocal(x, z);
  const ad = Math.hypot(Math.max(0, Math.abs(au) - AIR.len / 2), Math.max(0, Math.abs(av) - AIR.w / 2));
  if (ad < 120) h += (AIR.y - h) * smooth(120, 0, ad);
  for (const t of TOWNS) {
    const dx = Math.max(t.x0 - x, 0, x - t.x1);
    const dz = Math.max(t.z0 - z, 0, z - t.z1);
    const d = Math.hypot(dx, dz);
    const reach = h > t.y ? 820 : t.y > 10 ? 650 : 170;
    if (d < reach) h += (t.y - 0.06 - h) * smooth(reach, 30, d);
  }
  return h;
}
function landH(x, z) {
  let h = natH(x, z);
  const r = roadAt(x, z, 42);
  if (r) h += (r.y - 0.2 - h) * smooth(42, r.road.S[r.i].hw + 3, r.d);
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
  if (r && r.d < r.road.S[r.i].hw + 0.6) { surface = "road"; return r.y + 0.03; }
  surface = "grass";
  return terrainH(x, z);
}

// Places of interest, so the woods leave room round them.
const POIS = POIS_EARLY;
function nearPOI(x, z) {
  for (const p of POIS) if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return true;
  return false;
}
