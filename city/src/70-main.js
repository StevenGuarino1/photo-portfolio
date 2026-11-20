// ---------- Playing ----------
const keys = new Set();
const state = { mode: "drive", car: null, time: 0, camMode: 0, ready: false, started: false };
let camYaw = 0; // which way the camera faces (same sense as a car's heading)
let camPitch = 0.12;
let lookOff = 0; // how far the mouse has turned the view from straight behind
let lookIdle = 9;
let shake = 0;
let steerIn = 0;

// Your car to start: a coupe on Juniper Avenue, pointing north.
const START = { x: 5 * P - LO, z: 2 * P + 30, h: 0 };
state.car = makeCar("coupe", 0xd8352a, START.x, START.z, START.h);
state.car.awake = true;
camYaw = START.h;
spawnTraffic(START.x, START.z);

// ---------- The map ----------
const MAP = { x0: ISLE.cx - ISLE.rx * 1.08, z0: ISLE.cz - ISLE.rz * 1.08, s: 0.25 };
const worldMap = document.createElement("canvas");
{
  const w = Math.ceil(ISLE.rx * 2.16 * MAP.s);
  const h = Math.ceil(ISLE.rz * 2.16 * MAP.s);
  worldMap.width = w;
  worldMap.height = h;
  const g = worldMap.getContext("2d");
  const step = 4;
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const wx = MAP.x0 + x / MAP.s;
    const wz = MAP.z0 + y / MAP.s;
    const e = natH(wx, wz);
    g.fillStyle = e < 0 ? "#7cc3dd" : e < 3 ? "#eadcae" : e > 60 ? "#7fa86a" : "#9cc77e";
    g.fillRect(x, y, step, step);
  }
  const X = (x) => (x - MAP.x0) * MAP.s;
  const Z = (z) => (z - MAP.z0) * MAP.s;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const road of roads) {
    for (const [w, c] of [[5, "#ffffff"], [3, "#f2b13c"]]) {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      road.S.forEach((p, i) => (i ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z))));
      g.stroke();
    }
  }
  for (const t of TOWNS) {
    g.fillStyle = "#e7e1d3";
    g.fillRect(X(t.ox - RW), Z(t.oz - RW), (t.size + 2 * RW) * MAP.s, (t.size + 2 * RW) * MAP.s);
    for (const b of t.blocks) {
      g.fillStyle = b.kind === "park" ? "#8cc56c" : b.kind === "house" ? "#cfe0b4" : "#c9bfae";
      g.fillRect(X(b.x0 - SW), Z(b.z0 - SW), (b.x1 - b.x0 + 2 * SW) * MAP.s, (b.z1 - b.z0 + 2 * SW) * MAP.s);
    }
  }
}
const mapEl = $("map").querySelector("canvas");
const mapG = mapEl.getContext("2d");
function drawMap(x, z, heading) {
  const W = mapEl.width;
  mapG.save();
  mapG.fillStyle = "#7cc3dd";
  mapG.fillRect(0, 0, W, W);
  mapG.translate(W / 2, W / 2);
  mapG.rotate(heading + Math.PI);
  const k = 2.2; // canvas pixels per map pixel
  mapG.scale(k, k);
  mapG.drawImage(worldMap, -(x - MAP.x0) * MAP.s, -(z - MAP.z0) * MAP.s);
  mapG.fillStyle = "#3a7bd5";
  for (const c of traffic) {
    const dx = (c.x - x) * MAP.s;
    const dz = (c.z - z) * MAP.s;
    if (Math.abs(dx) < 90 && Math.abs(dz) < 90) mapG.fillRect(dx - 1.2, dz - 1.2, 2.4, 2.4);
  }
  mapG.restore();
  mapG.fillStyle = "#0f1d2b";
  mapG.beginPath();
  mapG.moveTo(W / 2, W / 2 - 13);
  mapG.lineTo(W / 2 + 9, W / 2 + 10);
  mapG.lineTo(W / 2, W / 2 + 5);
  mapG.lineTo(W / 2 - 9, W / 2 + 10);
  mapG.closePath();
  mapG.fill();
  // The towns, as labels at the edge when they're off the map.
  mapG.font = "600 20px Inter, sans-serif";
  mapG.textAlign = "center";
  mapG.textBaseline = "middle";
  for (const t of TOWNS) {
    const cx = t.ox + t.size / 2;
    const cz = t.oz + t.size / 2;
    const dx = (cx - x) * MAP.s * k;
    const dz = (cz - z) * MAP.s * k;
    const a = heading + Math.PI;
    let sx = dx * Math.cos(a) - dz * Math.sin(a);
    let sy = dx * Math.sin(a) + dz * Math.cos(a);
    const d = Math.hypot(sx, sy);
    const lim = W / 2 - 70;
    if (d > lim) { sx *= lim / d; sy *= lim / d; }
    const label = d > lim ? `${t.name} ${(Math.hypot(cx - x, cz - z) / 1000).toFixed(1)} km` : t.name;
    mapG.font = `600 ${d > lim ? 17 : 20}px Inter, sans-serif`;
    const tw = mapG.measureText(label).width;
    mapG.fillStyle = "rgba(255,255,255,0.85)";
    mapG.fillRect(W / 2 + sx - tw / 2 - 6, W / 2 + sy - 13, tw + 12, 26);
    mapG.fillStyle = "#0f1d2b";
    mapG.fillText(label, W / 2 + sx, W / 2 + sy + 1);
  }
}

// ---------- Getting in and out ----------
function nearestCar(x, z, reach = 3.4) {
  let best = null;
  let bd = reach;
  for (const c of cars) {
    if (c === state.car && state.mode === "drive") continue;
    // Distance to the car's side, roughly.
    const fx = Math.sin(c.h);
    const fz = Math.cos(c.h);
    const dx = x - c.x;
    const dz = z - c.z;
    const along = clamp(dx * fx + dz * fz, -c.T.L / 2, c.T.L / 2);
    const d = Math.hypot(dx - fx * along, dz - fz * along) - c.T.W / 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function toggleCar() {
  if (state.mode === "drive") {
    const c = state.car;
    if (Math.hypot(c.vx, c.vz) > 4) return;
    const lx = Math.cos(c.h);
    const lz = -Math.sin(c.h);
    me.x = c.x + lx * (c.T.W / 2 + 0.6);
    me.z = c.z + lz * (c.T.W / 2 + 0.6);
    me.y = groundAt(me.x, me.z);
    me.h = c.h;
    me.vx = me.vz = 0;
    me.g.visible = true;
    Object.assign(c.in, { thr: 0, brk: 0, steer: 0, hb: true });
    state.mode = "foot";
    sfx.door();
  } else {
    const c = nearestCar(me.x, me.z);
    if (!c) return;
    if (c.ai) {
      // Someone's driving it: they get out and run.
      const p = peds.reduce((a, b) => (Math.hypot(a.x - me.x, a.z - me.z) > Math.hypot(b.x - me.x, b.z - me.z) ? a : b));
      p.x = c.x + Math.cos(c.h) * (c.T.W / 2 + 0.7);
      p.z = c.z - Math.sin(c.h) * (c.T.W / 2 + 0.7);
      p.mode = "run";
      p.t = 0;
      p.h = Math.atan2(p.x - me.x, p.z - me.z);
      if (!p.loop) placePed(p, p.x, p.z);
      sfx.shout(p);
      const k = traffic.indexOf(c);
      if (k >= 0) traffic.splice(k, 1);
      c.ai = null;
    }
    c.parked = false;
    c.awake = true;
    state.car = c;
    state.mode = "drive";
    me.g.visible = false;
    camYaw = c.h;
    lookOff = 0;
    sfx.door();
  }
}
// Back onto the nearest road (after a swim).
function rescue(c) {
  let best = null;
  let bd = 1e9;
  for (const road of roads) for (let i = 40; i < road.S.length - 40; i += 5) {
    const p = road.S[i];
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    if (d < bd) { bd = d; best = { x: p.x - p.dz * HW_LANE, z: p.z + p.dx * HW_LANE, h: Math.atan2(p.dx, p.dz) }; }
  }
  for (const n of nodes) {
    const d = Math.hypot(n.x - c.x, n.z - c.z);
    if (d < bd) { bd = d; best = { x: n.x - LO, z: n.z + RW + 6, h: 0 }; }
  }
  placeCar(c, best.x, best.z, best.h);
  camYaw = best.h;
}

// ---------- Input ----------
let locked = false;
canvas.addEventListener("mousedown", () => { if (state.started && !locked) { try { const r = canvas.requestPointerLock?.(); if (r?.catch) r.catch(() => {}); } catch { /* fine */ } } });
document.addEventListener("pointerlockchange", () => (locked = document.pointerLockElement === canvas));
document.addEventListener("mousemove", (e) => {
  if (!locked) return;
  if (state.mode === "foot") camYaw -= e.movementX * 0.0025;
  else lookOff -= e.movementX * 0.0025;
  camPitch = clamp(camPitch + e.movementY * 0.002, -0.35, 0.9);
  lookIdle = 0;
});
addEventListener("keydown", (e) => {
  if (!state.started) return;
  if (e.repeat && e.code !== "KeyH") return;
  keys.add(e.code);
  if (e.code === "KeyF" || e.code === "Enter") toggleCar();
  if (e.code === "KeyC") state.camMode = (state.camMode + 1) % 3;
  if (e.code === "KeyP") $("fps").hidden = !$("fps").hidden;
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

// ---------- Quality ----------
let quality = 1;
function applySize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75, Math.sqrt(3.2e6 / (innerWidth * innerHeight))) * quality);
  renderer.setSize(innerWidth, innerHeight);
}
applySize();
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); applySize(); });
const perf = { acc: 0, n: 0 };
function watchSpeed(raw) {
  perf.acc += raw;
  perf.n++;
  if (perf.acc < 1.5) return;
  const ms = (perf.acc / perf.n) * 1000;
  perf.acc = perf.n = 0;
  if (!$("fps").hidden) $("fps").textContent = `${Math.round(1000 / ms)} fps · ${Math.round(quality * 100)}% · ${renderer.info.render.calls} draws`;
  if (document.hidden) return;
  let q = quality;
  if (ms > 21) q = Math.max(0.5, q * (ms > 30 ? 0.82 : 0.9));
  else if (ms < 13 && q < 1) q = Math.min(1, q * 1.08);
  if (Math.abs(q - quality) > 0.01) { quality = q; applySize(); }
}

// ---------- Each frame ----------
const hud = { speed: $("speed"), speedB: $("speed").querySelector("b"), gear: $("speed").querySelector(".gear"), street: $("street"), hint: $("hint") };
let last = {};
const setText = (el, k, v) => { if (last[k] !== v) { last[k] = v; el.textContent = v; } };
function hint(html) {
  if (last.hint === html) return;
  last.hint = html;
  if (html) hud.hint.innerHTML = html;
  hud.hint.classList.toggle("on", !!html);
}
let skidT = 0;
let mapT = 0;
const _look = new THREE.Vector3();
const _want = new THREE.Vector3();
function physics(dt) {
  const px = state.mode === "drive" ? state.car.x : me.x;
  const pz = state.mode === "drive" ? state.car.z : me.z;
  const active = cars.filter((c) => c === state.car || c.ai || c.awake);
  for (const c of active) {
    if (Math.abs(c.x - px) > 420 || Math.abs(c.z - pz) > 420) continue;
    stepCar(c, dt);
    const hit = hitStatics(c);
    if (hit > 3 && c === state.car && state.mode === "drive") { sfx.crash(hit, c.x, c.z); shake = Math.min(1, shake + hit / 14); }
    if (!c.ai && c !== state.car && Math.hypot(c.vx, c.vz) < 0.05) c.awake = false;
  }
  // Cars against cars (including parked ones you run into).
  const near = cars.filter((c) => Math.abs(c.x - px) < 160 && Math.abs(c.z - pz) < 160);
  for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
    const a = near[i];
    const b = near[j];
    const imp = hitCars(a, b);
    if (imp > 1.5) {
      if (a === state.car || b === state.car) { if (state.mode === "drive") { sfx.crash(imp, a.x, a.z); shake = Math.min(1, shake + imp / 14); } }
      for (const c of [a, b]) if (c.ai && imp > 2.5) { c.ai.stunned = 1.5 + Math.random() * 2; if (Math.random() < 0.7) setTimeout(() => honkAt(c), 300 + Math.random() * 500); }
    }
  }
}
function step(dt) {
  state.time += dt;
  const car = state.car;
  if (state.mode === "drive") {
    const target = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const rate = target === 0 ? 5 : Math.sign(target) !== Math.sign(steerIn) ? 6 : 2.6;
    steerIn += clamp(target - steerIn, -rate * dt, rate * dt);
    car.in.thr = keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
    car.in.brk = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
    car.in.steer = steerIn;
    car.in.hb = keys.has("Space");
  }
  updateTraffic(dt, state.time, car.x, car.z);
  // Two physics steps a frame: steadier at speed.
  physics(dt / 2);
  physics(dt / 2);
  if (car.land > 0.5 && state.mode === "drive" && !car.landed) { sfx.land(car.land); shake = Math.min(1, shake + car.land * 0.6); car.landed = true; }
  if (car.land <= 0.1) car.landed = false;
  if (car.drowned) { sfx.splash(); rescue(car); if (state.mode === "foot") { me.x = car.x + 3; me.z = car.z; } }
  if (state.mode === "foot") updateMe(dt, camYaw);
  const px = state.mode === "drive" ? car.x : me.x;
  const pz = state.mode === "drive" ? car.z : me.z;
  if (townAt(px, pz, 300)) { for (const p of peds) p.g.visible = true; updatePeds(dt, px, pz); }
  else for (const p of peds) p.g.visible = false;
  streamLand(px, pz, state.started ? 3 : 6);
  updateLights(state.time);
  updateLandmarks(dt);
  skidT -= dt;
  for (const c of cars) {
    if (c.grounded && (c.slip > 3.2 || (c.in.hb && Math.abs(c.vl) > 6) || (c.in.brk && c.vl > 12 && c === car)) && skidT <= 0 && Math.abs(c.x - px) < 120 && Math.abs(c.z - pz) < 120) skid(c);
  }
  if (skidT <= 0) skidT = 0.035;
  drawCars(camera.position.x, camera.position.z);
  aimSun(px, pz);
  placeCamera(dt);
  // HUD.
  const sp = Math.hypot(car.vx, car.vz) * 3.6;
  hud.speed.hidden = state.mode !== "drive";
  setText(hud.speedB, "sp", String(Math.round(state.mode === "drive" ? sp : 0)));
  setText(hud.gear, "gear", car.vl < -0.5 ? "R" : String(car.gear));
  setText(hud.street, "street", placeName(px, pz));
  if (state.mode === "foot") {
    const c = nearestCar(me.x, me.z);
    hint(c ? `<kbd>F</kbd> ${c.ai ? "Take this car" : "Get in"}` : "");
  } else hint(sp < 14 ? "<kbd>F</kbd> Get out" : "");
  mapT -= dt;
  if (mapT <= 0) { mapT = 0.05; drawMap(px, pz, state.mode === "drive" ? car.h : camYaw); }
  updateAudio(dt, state.mode === "drive" ? car : null, keys.has("KeyH"));
}
function placeCamera(dt) {
  lookIdle += dt;
  shake = Math.max(0, shake - dt * 1.6);
  const car = state.car;
  let tx;
  let ty;
  let tz;
  let dist;
  let height;
  if (state.mode === "drive") {
    const sp = Math.hypot(car.vx, car.vz);
    if (lookIdle > 1.2) lookOff *= Math.pow(0.04, dt);
    // The camera swings round behind the car a little late, so you feel it turn.
    const behind = car.vl < -2 ? car.h : car.h;
    let d = behind + lookOff - camYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    camYaw += d * Math.min(1, dt * (2.8 + sp * 0.02));
    if (lookIdle > 1.2) camPitch += (0.12 - camPitch) * Math.min(1, dt * 1.5);
    tx = car.x;
    ty = car.y + 1.1;
    tz = car.z;
    if (state.camMode === 2) {
      // From the bonnet.
      camera.position.set(car.x + Math.sin(car.h) * 0.6, car.y + car.T.H - 0.05, car.z + Math.cos(car.h) * 0.6);
      camera.rotation.set(-car.pitch * 0.6 - camPitch * 0.3 + 0.02, car.h + Math.PI + lookOff, car.roll * 0.6);
      camera.fov += (66 + clamp(sp * 0.3, 0, 18) - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
      return;
    }
    dist = (state.camMode === 1 ? 10.5 : 6.6) + sp * 0.022;
    height = (state.camMode === 1 ? 3.6 : 2.2) + sp * 0.006;
    camera.fov += (60 + clamp(sp * 0.33, 0, 20) - camera.fov) * Math.min(1, dt * 3);
  } else {
    tx = me.x;
    ty = me.y + 1.55;
    tz = me.z;
    dist = 4.4;
    height = 0.8;
    camera.fov += (60 - camera.fov) * Math.min(1, dt * 3);
  }
  camera.updateProjectionMatrix();
  const cp = Math.cos(camPitch);
  _want.set(tx - Math.sin(camYaw) * dist * cp, ty + height * 0.6 + Math.sin(camPitch) * dist, tz - Math.cos(camYaw) * dist * cp);
  // Don't put the camera inside a building: pull in until it's clear.
  for (let k = 1; k <= 8; k++) {
    const f = k / 8;
    const x = tx + (_want.x - tx) * f;
    const z = tz + (_want.z - tz) * f;
    let blocked = false;
    for (const s of nearStatics(x, z, 0.5)) if (s.box && s.h > 3 && x > s.x0 - 0.3 && x < s.x1 + 0.3 && z > s.z0 - 0.3 && z < s.z1 + 0.3) blocked = true;
    if (blocked) { _want.x = tx + (_want.x - tx) * (f - 0.14); _want.z = tz + (_want.z - tz) * (f - 0.14); break; }
  }
  _want.y = Math.max(_want.y, groundAt(_want.x, _want.z) + 0.5);
  camera.position.lerp(_want, Math.min(1, dt * 12));
  const s = shake * 0.12;
  _look.set(tx + (Math.random() - 0.5) * s, ty + (Math.random() - 0.5) * s, tz);
  camera.lookAt(_look);
  skyGroup.position.copy(camera.position);
}
const clock = new THREE.Clock();
function frame() {
  const raw = clock.getDelta();
  const dt = Math.min(raw, 0.05);
  if (state.started) watchSpeed(raw);
  step(dt);
  renderer.render(scene, camera);
}
// Build the ground round the start before letting you drive.
{
  const btn = $("go");
  btn.disabled = true;
  btn.textContent = "Building the island…";
  let ticks = 0;
  const pre = () => {
    // Just the near ground first; the rest fills in once you're driving.
    const left = streamLand(START.x, START.z, 10, 1000);
    if (left > 0 && ticks++ < 400) { requestAnimationFrame(pre); return; }
    state.ready = true;
    btn.disabled = false;
    btn.textContent = "Drive";
  };
  requestAnimationFrame(pre);
  btn.addEventListener("click", () => {
    if (!state.ready) return;
    audioStart();
    state.started = true;
    $("intro").classList.add("gone");
    canvas.focus();
  });
}
renderer.setAnimationLoop(frame);
window.__city = { render: () => renderer.render(scene, camera), state, cars, traffic, peds, me, keys, step, camera, renderer, streamLand, roads, TOWNS, toggleCar, rescue, get camYaw() { return camYaw; } };
