// ---------- The guards ----------
// Flat pixel sprites that always face you, the way the old shooters did it,
// but lit by the car's lamps, with lenses that glow in the dark. Three
// kinds: brutes with shock batons who close in, riflemen who keep their
// distance and shoot, and the captain in white at the front.
const TYPES = {
  brute: { hp: 80, speed: 3.4, r: 0.36, h: 1.95, scale: 1.04, melee: true, dmg: 15, reach: 1.5, windup: 0.4, cool: [0.8, 1.2], sight: 26 },
  gunner: { hp: 55, speed: 2.5, r: 0.34, h: 1.9, scale: 1, dmg: 8, windup: 0.62, cool: [1.3, 2.4], sight: 30, keep: [6, 14] },
  captain: { hp: 700, speed: 2.9, r: 0.46, h: 2.35, scale: 1.25, dmg: 7, windup: 0.5, cool: [1.1, 1.7], burst: 3, sight: 34, keep: [5, 11], boss: true },
};
const PAL = {
  gunner: { coat: "#232a38", dark: "#141923", trim: "#8a2222", trou: "#171a22", boot: "#0b0c0f", helm: "#303744", mask: "#0e1014", lens: "#ff3b2f", metal: "#626975", wood: "#5a3a22", glove: "#2e2722" },
  brute: { coat: "#3a332c", dark: "#231f1a", trim: "#8a6a2a", trou: "#1e1b18", boot: "#0b0c0f", helm: "#45403a", mask: "#141210", lens: "#ffae2e", metal: "#6a6a6a", wood: "#4a3020", glove: "#2a2420" },
  captain: { coat: "#d8d3c6", dark: "#9e988a", trim: "#d0a648", trou: "#23262d", boot: "#101114", helm: "#ebe6d9", mask: "#c49b80", lens: "#ff3b2f", metal: "#8a8f99", wood: "#6a4a2a", glove: "#e8e4da" },
};
const FW = 32;
const FH = 48;
const NF = 8; // idle, walk, walk, aim/raise, fire/strike, hurt, falling, down
function drawGuard(g, e, ox, P, kind, f) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(ox + x, y, w, h); };
  const E = (x, y, w, h, c) => { R(x, y, w, h, c); e.fillStyle = c; e.fillRect(ox + x, y, w, h); };
  const wide = kind === "brute" ? 1 : 0;
  if (f === 7) { // down
    R(1, 42, 4, 4, P.boot); R(4, 41, 18, 5, P.coat); R(4, 45, 18, 1, P.dark); R(9, 43, 9, 1, P.trim);
    R(21, 40, 7, 6, P.helm); R(22, 44, 5, 2, P.mask); E(23, 44, 1, 1, P.lens);
    if (kind !== "brute") R(6, 39, 16, 1, P.metal); else { R(26, 46, 5, 1, "#1a1a1a"); E(30, 46, 1, 1, "#4aa0d0"); }
    return;
  }
  const dy = f === 6 ? 9 : 0;
  const lean = f === 5 ? 1 : 0;
  const L = f === 1 ? 1 : f === 2 ? -1 : 0;
  // Legs and boots (on their knees when falling).
  if (f === 6) { R(10, 40, 5, 5, P.trou); R(17, 40, 5, 5, P.trou); R(9, 45, 6, 2, P.boot); R(17, 45, 6, 2, P.boot); }
  else {
    R(12, 34, 3, 10 - (L > 0 ? 2 : 0), P.trou); R(17, 34, 3, 10 - (L < 0 ? 2 : 0), P.trou);
    R(11, L > 0 ? 42 : 44, 4, 3, P.boot); R(17, L < 0 ? 42 : 44, 4, 3, P.boot);
  }
  const X = (x) => x + lean;
  // The greatcoat.
  R(X(10 - wide), 17 + dy, 12 + wide * 2, 18, P.coat);
  R(X(9 - wide), 29 + dy, 14 + wide * 2, 7 - (f === 6 ? 3 : 0), P.coat);
  R(X(19 + wide), 17 + dy, 3, 18, P.dark);
  R(X(15), 19 + dy, 1, 16 - (f === 6 ? 3 : 0), P.dark);
  R(X(10 - wide), 27 + dy, 12 + wide * 2, 1, P.trim);
  R(X(15), 27 + dy, 2, 1, P.metal);
  R(X(9 - wide), 17 + dy, 14 + wide * 2, 2, P.coat);
  R(X(9 - wide), 17 + dy, 2, 1, P.trim); R(X(21 + wide), 17 + dy, 2, 1, P.trim);
  R(X(12), 16 + dy, 8, 2, P.dark);
  for (const y of [21, 24, 30]) R(X(13), y + dy, 1, 1, P.metal);
  // The head.
  const hx = lean * 2;
  if (kind === "captain") {
    R(11 + hx, 6 + dy, 10, 4, P.helm); R(11 + hx, 10 + dy, 10, 1, "#15161a"); R(15 + hx, 7 + dy, 2, 1, P.trim);
    R(13 + hx, 11 + dy, 6, 5, P.mask); E(13 + hx, 12 + dy, 2, 1, P.lens); E(17 + hx, 12 + dy, 2, 1, P.lens);
    R(14 + hx, 14 + dy, 4, 1, "#e6e2da");
  } else {
    R(13 + hx, 5 + dy, 6, 1, P.helm); R(12 + hx, 6 + dy, 8, 5, P.helm); R(11 + hx, 10 + dy, 10, 1, P.dark);
    R(13 + hx, 11 + dy, 6, 5, P.mask); E(13 + hx, 12 + dy, 2, 1, P.lens); E(17 + hx, 12 + dy, 2, 1, P.lens);
    R(15 + hx, 14 + dy, 2, 2, P.metal);
  }
  // Arms and what they're holding.
  if (f === 5) { // hit: arms thrown up
    R(X(6), 13, 3, 8, P.coat); R(X(23), 13, 3, 8, P.coat); R(X(6), 11, 3, 2, P.glove); R(X(23), 11, 3, 2, P.glove);
    return;
  }
  if (f === 6) { R(8, 26 + 2, 3, 10, P.coat); R(21, 26 + 2, 3, 10, P.coat); return; }
  if (kind === "brute") {
    if (f === 3) { // baton raised
      R(8, 19, 3, 9, P.coat); R(8, 28, 3, 2, P.glove);
      R(22, 9, 3, 10, P.coat); R(22, 7, 3, 2, P.glove); R(23, 0, 2, 7, "#1a1a1a"); E(23, 0, 2, 2, "#8fdcff");
    } else if (f === 4) { // swing
      R(8, 19, 3, 9, P.coat); R(8, 28, 3, 2, P.glove);
      R(17, 19, 5, 5, P.coat); R(15, 22, 3, 3, P.glove);
      for (let k = 0; k < 7; k++) R(14 - k, 24 + k, 2, 1, "#1a1a1a");
      E(6, 30, 3, 3, "#bff0ff"); E(5, 29, 1, 1, "#8fdcff"); E(9, 33, 1, 1, "#8fdcff");
    } else {
      R(8, 19, 3, 9, P.coat); R(8, 28, 3, 2, P.glove);
      R(22, 19, 3, 9, P.coat); R(22, 28, 3, 2, P.glove); R(23, 30, 2, 9, "#1a1a1a"); E(23, 38, 2, 1, "#4aa0d0");
    }
    return;
  }
  if (f === 3 || f === 4) { // aiming at you
    R(10, 19, 4, 6, P.coat); R(18, 19, 4, 6, P.coat);
    R(13, 22, 6, 3, P.glove);
    R(14, 18, 4, 5, P.metal); R(15, 19, 2, 2, "#050505");
    R(19, 17, 3, 3, P.wood);
    if (f === 4) {
      E(15, 12, 2, 14, "#ffd27a"); E(10, 19, 12, 2, "#ffd27a"); E(13, 16, 6, 7, "#fff1c0");
      E(12, 15, 1, 1, "#ffb040"); E(19, 15, 1, 1, "#ffb040"); E(12, 23, 1, 1, "#ffb040"); E(19, 23, 1, 1, "#ffb040");
    }
    return;
  }
  // Rifle held across the body.
  R(8, 19, 3, 9, P.coat); R(21, 19, 3, 5, P.coat);
  for (let k = 0; k < 15; k++) R(8 + k, 31 - Math.round(k * 0.75), 2, 2, k < 4 ? P.wood : P.metal);
  R(9, 28, 3, 2, P.glove); R(19, 22, 3, 2, P.glove);
}
// A dark outline round every figure, so they read against the dark.
function outline(g, w, h) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3]) continue;
    const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4 + 3] > 0 && Math.floor(xx / FW) === Math.floor(x / FW);
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) { out[i] = 6; out[i + 1] = 6; out[i + 2] = 8; out[i + 3] = 255; }
  }
  g.putImageData(new ImageData(out, w, h), 0, 0);
}
const ATLAS = {};
for (const kind of Object.keys(TYPES)) {
  const cv = document.createElement("canvas");
  cv.width = FW * NF;
  cv.height = FH;
  const ev = document.createElement("canvas");
  ev.width = FW * NF;
  ev.height = FH;
  const g = cv.getContext("2d");
  const e = ev.getContext("2d");
  for (let f = 0; f < NF; f++) drawGuard(g, e, f * FW, PAL[kind], kind, f);
  outline(g, cv.width, cv.height);
  // Underneath the glowing bits, a faint copy of the whole figure, so a
  // guard never vanishes into the dark entirely.
  e.globalCompositeOperation = "destination-over";
  e.globalAlpha = 0.2;
  e.drawImage(cv, 0, 0);
  e.globalAlpha = 1;
  e.globalCompositeOperation = "source-over";
  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  };
  ATLAS[kind] = { map: mk(cv, true), glow: mk(ev, true) };
}

// ---------- Rays ----------
function rayBox(o, d, b, maxT) {
  let t0 = 0;
  let t1 = maxT;
  const ax = [[o.x, d.x, b.x0, b.x1], [o.y, d.y, 0, b.h], [o.z, d.z, b.z0, b.z1]];
  for (const [p, v, lo, hi] of ax) {
    if (Math.abs(v) < 1e-9) { if (p < lo || p > hi) return -1; continue; }
    let ta = (lo - p) / v;
    let tb = (hi - p) / v;
    if (ta > tb) [ta, tb] = [tb, ta];
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return -1;
  }
  return t0;
}
// How far a ray goes before it hits a wall, a door, furniture, the floor or
// the ceiling.
function rayWalls(o, d, maxT) {
  let best = maxT;
  for (const b of nearCols(o.z)) {
    const t = rayBox(o, d, b, best);
    if (t >= 0 && t < best) best = t;
  }
  if (d.y < 0) best = Math.min(best, -o.y / d.y);
  if (d.y > 0) best = Math.min(best, (H - o.y) / d.y);
  return best;
}
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
function los(x0, y0, z0, x1, y1, z1) {
  _o.set(x0, y0, z0);
  _d.set(x1 - x0, y1 - y0, z1 - z0);
  const len = _d.length();
  _d.divideScalar(len);
  return rayWalls(_o, _d, len) >= len - 0.05;
}
// The nearest guard a ray hits (a guard is an upright cylinder).
function rayEnemies(o, d, maxT) {
  let best = null;
  for (const e of enemies) {
    if (!e.c.visible || e.state === "dying" || e.state === "dead") continue;
    const r = e.T.r;
    const fx = o.x - e.x;
    const fz = o.z - e.z;
    const a = d.x * d.x + d.z * d.z;
    if (a < 1e-9) continue;
    const b = 2 * (fx * d.x + fz * d.z);
    const cc = fx * fx + fz * fz - r * r;
    const disc = b * b - 4 * a * cc;
    if (disc < 0) continue;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t < 0 || t > maxT || (best && t > best.t)) continue;
    const y = o.y + d.y * t;
    if (y < 0 || y > e.T.h) continue;
    best = { e, t, y };
  }
  return best;
}

// ---------- Circles sliding round boxes ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function resolve(o, r, cols) {
  for (const b of cols) {
    const cx = clamp(o.x, b.x0, b.x1);
    const cz = clamp(o.z, b.z0, b.z1);
    const dx = o.x - cx;
    const dz = o.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      o.x += (dx / d) * (r - d);
      o.z += (dz / d) * (r - d);
    } else {
      const pushes = [[o.x - b.x0, -1, 0], [b.x1 - o.x, 1, 0], [o.z - b.z0, 0, -1], [b.z1 - o.z, 0, 1]];
      pushes.sort((p, q) => p[0] - q[0]);
      const [m, px_, pz] = pushes[0];
      o.x += px_ * (m + r);
      o.z += pz * (m + r);
    }
  }
}
function moveCircle(o, dx, dz, r) {
  const cols = nearCols(o.z);
  o.x += dx;
  resolve(o, r, cols);
  o.z += dz;
  resolve(o, r, cols);
}

// ---------- Guards ----------
const enemies = [];
const randIn = ([a, b]) => a + Math.random() * (b - a);
function makeEnemy(c, kind, x, a) {
  const Ty = TYPES[kind];
  const geo = new THREE.PlaneGeometry(1.4 * Ty.scale, 2.1 * Ty.scale);
  geo.translate(0, 1.05 * Ty.scale, 0);
  const mat = new THREE.MeshLambertMaterial({ map: ATLAS[kind].map, emissiveMap: ATLAS[kind].glow, emissive: 0xffffff, alphaTest: 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  const e = { c, kind, T: Ty, hx: x, hz: c.z0 + a, mesh, mat, geo, frame: -1 };
  resetEnemy(e);
  c.enemies.push(e);
  enemies.push(e);
  return e;
}
function setFrame(e, f) {
  if (e.frame === f) return;
  e.frame = f;
  const uv = e.geo.attributes.uv;
  const u0 = f / NF + 0.0005;
  const u1 = (f + 1) / NF - 0.0005;
  uv.setX(0, u0); uv.setX(1, u1); uv.setX(2, u0); uv.setX(3, u1);
  uv.needsUpdate = true;
}
function resetEnemy(e) {
  Object.assign(e, { x: e.hx, z: e.hz, hp: e.T.hp, state: "idle", t: 0, cool: 0.6 + Math.random(), alert: false, sees: false, losT: Math.random() * 0.2, react: 0, lastX: null, lastZ: null, walk: 0, strafe: Math.random() < 0.5 ? -1 : 1, strafeT: 1 + Math.random(), detour: 0, detourT: 0, flash: 0, burst: 0 });
  e.mesh.visible = true;
  e.mat.color.setRGB(1, 1, 1);
  setFrame(e, 0);
}
for (const c of cars) for (const [kind, x, a] of c.spawns) makeEnemy(c, kind, x, a);

// Tracers and little bursts where shots land.
const tracers = Array.from({ length: 10 }, () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const m = new THREE.LineBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const l = new THREE.LineSegments(g, m);
  l.frustumCulled = false;
  scene.add(l);
  return { l, life: 0 };
});
let tracerAt = 0;
function tracer(a, b) {
  const tr = tracers[tracerAt++ % tracers.length];
  const p = tr.l.geometry.attributes.position;
  p.setXYZ(0, a.x, a.y, a.z);
  p.setXYZ(1, b.x, b.y, b.z);
  p.needsUpdate = true;
  tr.life = 0.09;
}
const puffs = Array.from({ length: 36 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(s);
  return { s, life: 0, max: 1, size: 1, vy: 0 };
});
let puffAt = 0;
function puff(p, color, size = 0.35, life = 0.25, vy = 0) {
  const q = puffs[puffAt++ % puffs.length];
  q.s.position.copy(p);
  q.s.material.color.set(color);
  q.life = q.max = life;
  q.size = size;
  q.vy = vy;
}
function updateFx(dt) {
  for (const tr of tracers) { tr.life -= dt; tr.l.material.opacity = Math.max(0, tr.life / 0.09) * 0.9; }
  for (const q of puffs) {
    if (q.life <= 0) { q.s.material.opacity = 0; continue; }
    q.life -= dt;
    const k = Math.max(0, q.life / q.max);
    q.s.material.opacity = k * 0.9;
    q.s.scale.setScalar(q.size * (1.6 - k * 0.6));
    q.s.position.y += q.vy * dt;
  }
}
// A flash of light when a guard fires (its own light, so the count of
// lights never changes).
const enemyFlash = new THREE.PointLight(0xffc070, 0, 9, 1.6);
scene.add(enemyFlash);

function alertCar(c, x, z, radius) {
  for (const e of c.enemies) if (e.state === "idle" && Math.hypot(e.x - x, e.z - z) < radius) e.alert = true;
}
function damageEnemy(e, dmg, at) {
  if (e.state === "dying" || e.state === "dead") return false;
  e.hp -= dmg;
  e.flash = 0.09;
  e.alert = true;
  alertCar(e.c, e.x, e.z, 10);
  puff(at, 0x9a1a14, 0.32, 0.3);
  if (e.hp <= 0) {
    e.state = "dying";
    e.t = 0;
    sfx.guardDown(e);
    stats.kills++;
    checkCleared(e.c);
    return true;
  }
  sfx.guardHurt(e);
  if (!e.T.boss || Math.random() < 0.25) {
    if (e.state !== "windup" || !e.T.boss) { e.state = "hurt"; e.t = 0; }
  }
  return false;
}
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
function guardFires(e, dist) {
  const moving = Math.hypot(P.vx, P.vz);
  let p = clamp(0.84 - dist * 0.024, 0.22, 0.84) * (moving > 5 ? 0.55 : moving > 2 ? 0.78 : 1);
  if (!los(e.x, e.T.h * 0.62, e.z, P.x, EYE - 0.2, P.z)) p = 0;
  const hit = Math.random() < p;
  _a.set(e.x, e.T.h * 0.6, e.z);
  _b.set(P.x, EYE - 0.35, P.z);
  if (!hit) { _b.x += (Math.random() - 0.5) * 2.2; _b.y += (Math.random() - 0.3) * 1.2; _b.z += (Math.random() - 0.5) * 2.2; }
  _a.lerp(_b, 0.08);
  tracer(_a, _b);
  enemyFlash.position.set(e.x, e.T.h * 0.6, e.z);
  enemyFlash.intensity = 14;
  sfx.guardShot(e);
  if (hit) hurtPlayer(e.T.dmg, e);
}

function updateEnemy(e, dt, active) {
  const Ty = e.T;
  e.t += dt;
  e.cool -= dt;
  if (e.flash > 0) {
    e.flash -= dt;
    e.mat.color.setRGB(3, 1.4, 1.2);
    if (e.flash <= 0) e.mat.color.setRGB(1, 1, 1);
  }
  if (e.state === "dead") return;
  if (e.state === "dying") { setFrame(e, e.t < 0.28 ? 6 : 7); if (e.t >= 0.28) e.state = "dead"; return; }
  if (!active || !P.alive) { setFrame(e, e.state === "idle" ? 0 : e.frame); return; }
  const dx = P.x - e.x;
  const dz = P.z - e.z;
  const dist = Math.hypot(dx, dz);
  e.losT -= dt;
  if (e.losT <= 0) {
    e.losT = 0.14 + Math.random() * 0.1;
    e.sees = dist < Ty.sight && los(e.x, Ty.h * 0.85, e.z, P.x, EYE, P.z);
    if (e.sees) { e.lastX = P.x; e.lastZ = P.z; }
  }
  if (e.state === "idle") {
    setFrame(e, 0);
    if (e.sees || e.alert) {
      e.state = "chase";
      e.react = 0.25 + Math.random() * 0.4;
      alertCar(e.c, e.x, e.z, 12);
      if (Math.random() < 0.6) sfx.radio(e);
    }
    return;
  }
  if (e.react > 0) { e.react -= dt; setFrame(e, 0); return; }
  if (e.state === "hurt") { setFrame(e, 5); if (e.t > 0.24) e.state = "chase"; return; }
  if (e.state === "windup") {
    setFrame(e, 3);
    if (e.t >= Ty.windup) {
      e.t = 0;
      if (Ty.melee) {
        e.state = "strike";
        if (dist < Ty.reach + 0.55 && Math.abs((P.y ?? 0)) < 1) { hurtPlayer(Ty.dmg, e); sfx.zap(e); }
      } else {
        e.state = "fire";
        guardFires(e, dist);
      }
    }
    return;
  }
  if (e.state === "strike" || e.state === "fire") {
    setFrame(e, 4);
    if (e.t > (Ty.melee ? 0.32 : 0.13)) {
      if (!Ty.melee && e.burst > 0) { e.burst--; e.state = "windup"; e.t = Ty.windup - 0.16; }
      else { e.state = "chase"; e.cool = randIn(Ty.cool); e.t = 0; }
    }
    return;
  }
  // Chasing: work out where to go.
  let mx = 0;
  let mz = 0;
  const toward = (tx, tz) => { const d = Math.hypot(tx - e.x, tz - e.z) || 1; mx = (tx - e.x) / d; mz = (tz - e.z) / d; return d; };
  if (Ty.melee) {
    if (e.sees && dist < Ty.reach && e.cool <= 0) { e.state = "windup"; e.t = 0; sfx.swing(e); return; }
    if (e.sees) { if (dist > Ty.reach * 0.75) toward(P.x, P.z); }
    else if (e.lastX !== null && toward(e.lastX, e.lastZ) < 0.6) e.lastX = null;
    else if (e.lastX === null) toward(P.x, P.z);
  } else {
    if (e.sees && e.cool <= 0) { e.state = "windup"; e.t = 0; e.burst = (Ty.burst || 1) - 1; return; }
    e.strafeT -= dt;
    if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = 0.9 + Math.random() * 1.4; }
    if (!e.sees) {
      if (e.lastX !== null) { if (toward(e.lastX, e.lastZ) < 0.6) e.lastX = null; }
      else toward(P.x, P.z);
    } else if (dist > Ty.keep[1]) toward(P.x, P.z);
    else if (dist < Ty.keep[0]) { toward(P.x, P.z); mx = -mx; mz = -mz; }
    else { mx = (-dz / dist) * e.strafe * 0.8; mz = (dx / dist) * e.strafe * 0.8; }
  }
  if (e.detourT > 0) {
    e.detourT -= dt;
    const px_ = -mz * e.detour;
    const pz = mx * e.detour;
    mx = mx * 0.3 + px_;
    mz = mz * 0.3 + pz;
  }
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    const step = Ty.speed * dt;
    const want = { x: e.x, z: e.z };
    moveCircle(want, (mx / len) * step, (mz / len) * step, Ty.r);
    // Keep to this car.
    want.z = clamp(want.z, e.c.z0 + 0.5, e.c.z0 + CL - 0.5);
    const moved = Math.hypot(want.x - e.x, want.z - e.z);
    if (moved < step * 0.35 && e.detourT <= 0) { e.detour = Math.random() < 0.5 ? -1 : 1; e.detourT = 0.5 + Math.random() * 0.5; }
    e.x = want.x;
    e.z = want.z;
    e.walk += moved;
    setFrame(e, 1 + (Math.floor(e.walk / 0.5) % 2));
  } else setFrame(e, 0);
}
function updateEnemies(dt, cur) {
  for (const e of enemies) {
    const vis = e.c.visible;
    e.mesh.visible = vis;
    if (!vis) continue;
    updateEnemy(e, dt, e.c === cur);
    e.mesh.position.set(e.x, 0, e.z);
    e.mesh.rotation.y = Math.atan2(camera.position.x - e.x, camera.position.z - e.z);
  }
  // Keep them from standing in one another.
  const list = cur.enemies;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i];
    const b = list[j];
    if (a.state === "dead" || b.state === "dead" || a.state === "dying" || b.state === "dying") continue;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    const min = a.T.r + b.T.r + 0.1;
    if (d < min && d > 1e-4) {
      const k = (min - d) / 2 / d;
      a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k;
    }
  }
  enemyFlash.intensity *= Math.pow(0.0001, dt);
}
