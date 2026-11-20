// ---------- Traffic ----------
// In town, drivers keep right, take each crossing straight on or turning,
// and stop for red lights. Out on the country roads they hold their lane
// round the bends, slowing for the sharp ones. Everyone stops for whatever
// is in front of them, and honks when you shove them. Cars a long way from
// you are moved to roads nearer you.
const TRAFFIC = TOUCH ? 24 : 36;
const PARKED = 80;
const HW_LANE = 6.75; // the slow (outer) lane's middle, from the road's middle; the inner lane is for passing
const rightOf = (dx, dz) => [-dz, dx];
// Is the street from node n along (dx, dz) the town's main street?
function onMain(n, dx, dz) {
  const hw = n.t.hw;
  if (!hw) return false;
  const along = hw.axis === "x" ? dx !== 0 : dz !== 0;
  return along && n.hw;
}

// ---------- Town driving ----------
function planTurn(ai, to, dx, dz) {
  const opts = [];
  // The main street is the loop's: town traffic doesn't join it or cross it.
  if (!to.hw) for (const [ex, ez, w] of [[dx, dz, 2.2], [-dz, dx, 1], [dz, -dx, 1]]) if (to.t.nodeAt(to.i + ex, to.j + ez) && !onMain(to, ex, ez)) opts.push([ex, ez, w]);
  let ch = opts[0] || [-dx, -dz, 1];
  let r = Math.random() * opts.reduce((s, o) => s + o[2], 0);
  for (const o of opts) if ((r -= o[2]) <= 0) { ch = o; break; }
  const [ex, ez] = ch;
  const [rx, rz] = rightOf(dx, dz);
  const ent = [to.x - dx * (RW + 3.4) + rx * LO, to.z - dz * (RW + 3.4) + rz * LO];
  const [erx, erz] = rightOf(ex, ez);
  const exit = [to.x + ex * (RW + 2) + erx * LO, to.z + ez * (RW + 2) + erz * LO];
  const straight = ex === dx && ez === dz;
  const ctrl = straight ? [(ent[0] + exit[0]) / 2, (ent[1] + exit[1]) / 2] : [to.x + rx * LO + erx * LO, to.z + rz * LO + erz * LO];
  ai.queue.push(ent);
  for (let k = 1; k <= 5; k++) {
    const t = k / 5;
    const u = 1 - t;
    ai.queue.push([u * u * ent[0] + 2 * u * t * ctrl[0] + t * t * exit[0], u * u * ent[1] + 2 * u * t * ctrl[1] + t * t * exit[1]]);
  }
  const next = to.t.nodeAt(to.i + ex, to.j + ez) || to;
  Object.assign(ai, { node: next, dx: ex, dz: ez, entry: null });
}
function setEntry(ai) {
  const [rx, rz] = rightOf(ai.dx, ai.dz);
  ai.entry = [ai.node.x - ai.dx * (RW + 3.4) + rx * LO, ai.node.z - ai.dz * (RW + 3.4) + rz * LO];
  ai.stopAt = { n: ai.node, axis: ai.dx ? "x" : "z" };
}
function startTown(c, from, dx, dz, along) {
  const to = from.t.nodeAt(from.i + dx, from.j + dz);
  const [rx, rz] = rightOf(dx, dz);
  placeCar(c, from.x + dx * along + rx * LO, from.z + dz * along + rz * LO, Math.atan2(dx, dz));
  const speed = 10 + Math.random() * 4;
  c.vx = dx * speed;
  c.vz = dz * speed;
  c.ai = { kind: "town", queue: [], node: to, dx, dz, cruise: speed, stunned: 0 };
  setEntry(c.ai);
  c.awake = true;
}
// ---------- Country driving ----------
function startRoad(c, road, i, dir) {
  const p = road.S[i];
  const tx = p.dx * dir;
  const tz = p.dz * dir;
  const [rx, rz] = rightOf(tx, tz);
  const lane = p.hw * 0.75;
  placeCar(c, p.x + rx * lane, p.z + rz * lane, Math.atan2(tx, tz));
  c.y = p.y;
  const speed = 23 + Math.random() * 7;
  c.vx = tx * speed;
  c.vz = tz * speed;
  c.ai = { kind: "road", road, i, dir, cruise: speed, stunned: 0 };
  c.awake = true;
}
// Somewhere to put a car, between minD and maxD from (px, pz).
function randomSpot(px, pz, minD, maxD, townOnly = false) {
  for (let tries = 0; tries < 60; tries++) {
    if (!townOnly && Math.random() < 0.5) {
      const road = LOOP;
      const i = Math.floor(Math.random() * road.S.length);
      const p = road.S[i];
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d < minD || d > maxD) continue;
      if (cars.some((c) => Math.abs(c.x - p.x) < 14 && Math.abs(c.z - p.z) < 14)) continue;
      return { road, i, dir: Math.random() < 0.5 ? 1 : -1 };
    }
    const n = nodes[Math.floor(Math.random() * nodes.length)];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => n.t.nodeAt(n.i + dx, n.j + dz) && !(onMain(n, dx, dz) && n.t.nodeAt(n.i + dx, n.j + dz).hw));
    if (!dirs.length) continue;
    const [dx, dz] = dirs[Math.floor(Math.random() * dirs.length)];
    const along = RW + 6 + Math.random() * (P - 2 * RW - 24);
    const x = n.x + dx * along;
    const z = n.z + dz * along;
    const d = Math.hypot(x - px, z - pz);
    if (d < minD || d > maxD) continue;
    if (cars.some((c) => Math.abs(c.x - x) < 9 && Math.abs(c.z - z) < 9)) continue;
    return { n, dx, dz, along };
  }
  return null;
}
function start(c, spot) {
  if (spot.road) startRoad(c, spot.road, spot.i, spot.dir);
  else startTown(c, spot.n, spot.dx, spot.dz, spot.along);
}
const traffic = [];
function spawnTraffic(px, pz) {
  for (let k = 0; k < TRAFFIC; k++) {
    const c = makeCar(pick(["sedan", "sedan", "hatch", "hatch", "coupe", "pickup", "van"]), pick(PAINTS), 0, 0, 0);
    const spot = randomSpot(px, pz, 25, 300);
    if (spot) start(c, spot);
    traffic.push(c);
  }
  // Cars left at the places worth visiting.
  for (const [x, z, h] of poiParked) makeCar(pick(["sedan", "hatch", "coupe", "pickup", "van"]), pick(PAINTS), x, z, h).parked = true;
  for (let k = 0; k < PARKED; k++) {
    const spot = randomSpot(0, 0, 0, 1e9, true);
    if (!spot) continue;
    const { n, dx, dz, along } = spot;
    const [rx, rz] = rightOf(dx, dz);
    const c = makeCar(pick(["sedan", "hatch", "hatch", "coupe", "pickup", "van", "sedan"]), pick(PAINTS), n.x + dx * along + rx * (RW - 1.25), n.z + dz * along + rz * (RW - 1.25), Math.atan2(dx, dz));
    c.parked = true;
  }
}

// ---------- Steering and speed, for both ----------
function steerAt(c, tx, tz) {
  const fx = Math.sin(c.h);
  const fz = Math.cos(c.h);
  const lx = tx - c.x;
  const lz = tz - c.z;
  const lat = lx * -fz + lz * fx;
  const fwd = lx * fx + lz * fz;
  c.in.steer = clamp(Math.atan2(2 * c.T.wb * lat, fwd * fwd + lat * lat) / (0.58 / (1 + Math.abs(c.vl) / 11)), -1, 1);
}
function gapAhead(c) {
  const fx = Math.sin(c.h);
  const fz = Math.cos(c.h);
  let gap = 99;
  const reach = 14 + Math.abs(c.vl) * 1.4;
  const consider = (ox, oz, len) => {
    const dx = ox - c.x;
    const dz = oz - c.z;
    const f = dx * fx + dz * fz;
    if (f < 0 || f > reach) return;
    if (Math.abs(dx * -fz + dz * fx) > 2.3) return;
    gap = Math.min(gap, f - len);
  };
  for (const o of cars) if (o !== c && Math.abs(o.x - c.x) < reach && Math.abs(o.z - c.z) < reach) consider(o.x, o.z, (o.T.L + c.T.L) / 2);
  if (state.mode === "foot") consider(me.x, me.z, c.T.L / 2 + 0.5);
  for (const p of peds) if (p.mode !== "walk" && Math.abs(p.x - c.x) < 24 && Math.abs(p.z - c.z) < 24) consider(p.x, p.z, c.T.L / 2 + 0.6);
  return gap;
}
function speedTo(c, want, dt) {
  const I = c.in;
  const gap = c.ai && c.ai.solo ? 99 : gapAhead(c);
  // Leave a gap that grows with speed.
  if (gap < 99) want = Math.min(want, Math.max(0, (gap - 3) * 0.7));
  const v = c.vl;
  if (v < want - 0.3) { I.thr = clamp((want - v) * 0.35, 0.2, 1); I.brk = 0; }
  else if (v > want + 0.3) { I.thr = 0; I.brk = clamp((v - want) * 0.2, 0.08, 1); }
  else { I.thr = 0.25; I.brk = 0; }
  I.hb = want === 0 && Math.abs(v) < 0.5;
  if (gap < 6 && Math.abs(v) < 0.5 && Math.random() < dt * 0.05) honkAt(c);
}
function driveTown(c, dt, t) {
  const ai = c.ai;
  if (ai.queue.length < 3) planTurn(ai, ai.node, ai.dx, ai.dz);
  const fx = Math.sin(c.h);
  const fz = Math.cos(c.h);
  while (ai.queue.length) {
    const [qx, qz] = ai.queue[0];
    if (Math.hypot(qx - c.x, qz - c.z) < 4.5 || (qx - c.x) * fx + (qz - c.z) * fz < 0) ai.queue.shift();
    else break;
  }
  const look = clamp(Math.abs(c.vl) * 0.6, 5, 11);
  let tx = c.x + fx * look;
  let tz = c.z + fz * look;
  let acc = 0;
  let px = c.x;
  let pz = c.z;
  for (const [qx, qz] of ai.queue) {
    const seg = Math.hypot(qx - px, qz - pz);
    if (acc + seg >= look) { const k = (look - acc) / seg; tx = px + (qx - px) * k; tz = pz + (qz - pz) * k; break; }
    acc += seg;
    px = qx; pz = qz; tx = qx; tz = qz;
  }
  steerAt(c, tx, tz);
  let want = ai.cruise * (Math.abs(c.in.steer) > 0.3 ? 0.5 : 1);
  if (!ai.entry) setEntry(ai);
  const dToStop = (ai.entry[0] - c.x) * fx + (ai.entry[1] - c.z) * fz;
  const s = lightFor(ai.stopAt.n, ai.stopAt.axis, t);
  const hasLight = !ai.stopAt.n.hw && ai.stopAt.n.t.nodeAt(ai.stopAt.n.i - ai.dx, ai.stopAt.n.j - ai.dz);
  if (hasLight && dToStop > -0.5 && dToStop < 34 && (s === 2 || (s === 1 && dToStop > 6))) want = Math.min(want, Math.max(0, (dToStop - 1.2) * 0.8));
  speedTo(c, want, dt);
}
function driveRoad(c, dt) {
  const ai = c.ai;
  const S = ai.road.S;
  const N = S.length;
  const at = (k) => S[((k % N) + N) % N];
  const fx = Math.sin(c.h);
  const fz = Math.cos(c.h);
  for (let g = 0; g < 50 && (at(ai.i + ai.dir).x - c.x) * fx + (at(ai.i + ai.dir).z - c.z) * fz < 2; g++) ai.i = ((ai.i + ai.dir) % N + N) % N;
  const ahead = Math.round(clamp(Math.abs(c.vl) * 0.55, 6, 16) / 4);
  const q = at(ai.i + ai.dir * ahead);
  const [rx, rz] = rightOf(q.dx * ai.dir, q.dz * ai.dir);
  const lane = q.hw * 0.75;
  steerAt(c, q.x + rx * lane, q.z + rz * lane);
  // No faster than the tyres can hold round the bend ahead, and steadier
  // through town.
  // Look well ahead: for each bend coming, the speed it allows, plus what
  // can be braked away before reaching it.
  const p = at(ai.i);
  let want = ai.cruise;
  for (let k = 0; k <= 45; k += 5) {
    const a = at(ai.i + ai.dir * k);
    const b = at(ai.i + ai.dir * (k + 10));
    const turn = Math.acos(clamp(a.dx * b.dx + a.dz * b.dz, -1, 1));
    const radius = 40 / Math.max(turn, 1e-3);
    const vBend = Math.sqrt(c.T.grip * 1.3 * radius);
    want = Math.min(want, Math.sqrt(vBend * vBend + 2 * 7 * k * 4));
  }
  if (p.town || at(ai.i + ai.dir * 20).town) want = Math.min(want, 17);
  speedTo(c, want, dt);
}
// After a knock: back to the nearest lane and carry on.
function rejoin(c) {
  const r = roadAt(c.x, c.z, 25);
  if (r && !(townAt(c.x, c.z) && !r.road.S[r.i].town)) {
    if (!r.road.S[r.i].town || r.d < 7) {
    const fwd = Math.sin(c.h) * r.road.S[r.i].dx + Math.cos(c.h) * r.road.S[r.i].dz;
    c.ai = { kind: "road", road: r.road, i: r.i, dir: fwd >= 0 ? 1 : -1, cruise: c.ai.cruise, stunned: 0, solo: c.ai.solo };
    return;
    }
  }
  let best = null;
  for (const n of nodes) {
    if (Math.abs(n.x - c.x) > P * 1.5 || Math.abs(n.z - c.z) > P * 1.5) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!n.t.nodeAt(n.i + dx, n.j + dz)) continue;
      const along = (c.x - n.x) * dx + (c.z - n.z) * dz;
      if (along < RW + 2 || along > P - RW - 6) continue;
      const [rx, rz] = rightOf(dx, dz);
      const off = Math.abs((c.x - n.x) * rx + (c.z - n.z) * rz - LO);
      const score = off - Math.cos(c.h - Math.atan2(dx, dz)) * 3;
      if (off < 6 && (!best || score < best.score)) best = { n, dx, dz, along, score };
    }
  }
  if (!best) { c.ai.stunned = 1.5; return; }
  const [rx, rz] = rightOf(best.dx, best.dz);
  c.ai = { kind: "town", queue: [[best.n.x + best.dx * (best.along + 8) + rx * LO, best.n.z + best.dz * (best.along + 8) + rz * LO]], node: best.n.t.nodeAt(best.n.i + best.dx, best.n.j + best.dz), dx: best.dx, dz: best.dz, cruise: c.ai.cruise, stunned: 0 };
}
function updateTraffic(dt, t, px, pz) {
  for (const c of traffic) {
    if (!c.ai) continue;
    const far = Math.hypot(c.x - px, c.z - pz);
    if (far > 380 || c.drowned) {
      const spot = randomSpot(px, pz, 170, 320);
      if (spot) start(c, spot);
      continue;
    }
    if (c.ai.stunned > 0) {
      c.ai.stunned -= dt;
      Object.assign(c.in, { thr: 0, brk: 1, hb: false, steer: 0 });
      if (c.ai.stunned <= 0) rejoin(c);
      continue;
    }
    if (c.ai.kind === "road") driveRoad(c, dt);
    else driveTown(c, dt, t);
  }
}
