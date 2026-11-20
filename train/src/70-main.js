// ---------- The run ----------
let state = "intro"; // play, paused, dead, end
let cur = cars[0];
let checkpoint = { x: 0, z: 2.2 };
let trainSway = 0;
const stats = { kills: 0, falls: 0, time: 0 };

// ---------- HUD ----------
const hud = { hp: $("hp"), hpB: $("hp").querySelector("b"), hpBar: $("hp").querySelector(".bar span"), ammoB: $("ammo").querySelector("b"), ammoS: $("ammo").querySelector("small"), where: $("where").querySelector("span"), whereEm: $("where").querySelector("em"), hurt: $("hurt"), msg: $("msg"), card: $("card") };
let last = {};
function setText(el, key, v) { if (last[key] !== v) { last[key] = v; el.textContent = v; } }
function updateHud() {
  setText(hud.hpB, "hp", String(Math.ceil(P.hp)));
  if (last.hpw !== Math.ceil(P.hp)) { last.hpw = Math.ceil(P.hp); hud.hpBar.style.width = `${P.hp}%`; hud.hp.classList.toggle("low", P.hp <= 30); }
  const G = GUNS[W.cur];
  setText(hud.ammoB, "ammo", W.reloading > 0 ? "··" : `${W.ammo[W.cur]}`);
  setText(hud.ammoS, "gun", `${G.name}${W.have.repeater ? (W.cur === "scatter" ? "  ·  2 Repeater" : "  ·  1 Scattergun") : ""}`);
  setText(hud.where, "where", `Car ${cur.i + 1} of ${cars.length} · ${cur.title.replace(/^The /, "")}`);
  const left = cur.enemies.filter((e) => e.state !== "dead" && e.state !== "dying").length;
  const em = cur.frontDoor ? (left ? `${left} guard${left > 1 ? "s" : ""}` : "clear · go forward") : "";
  setText(hud.whereEm, "em", em);
  if (last.clear !== !left) { last.clear = !left; hud.whereEm.classList.toggle("clear", !left); }
  hud.hurt.style.opacity = String(Math.min(1, P.hurt * 0.9 + (P.hp <= 30 ? 0.25 + Math.sin(performance.now() / 300) * 0.08 : 0)));
}
let msgT = 0;
function say(text, secs = 2.6) {
  hud.msg.textContent = text;
  hud.msg.classList.add("on");
  msgT = secs;
}
let cardT = 0;
function showCard(c) {
  hud.card.querySelector("small").textContent = `Car ${c.i + 1}`;
  hud.card.querySelector("h2").textContent = c.title;
  hud.card.querySelector("p").textContent = c.sub;
  hud.card.classList.add("on");
  cardT = 3.6;
}

// ---------- Cars, doors, progress ----------
function checkCleared(c) {
  if (c.cleared || c.enemies.some((e) => e.state !== "dead" && e.state !== "dying")) return;
  c.cleared = true;
  if (c.frontDoor) {
    setTimeout(() => {
      if (c !== cur || !P.alive) return;
      sfx.unlock();
      setDoorLamp(c.frontDoor, true);
      say(c.i === cars.length - 2 ? "The way to the engine is open" : "Car clear. The door ahead is open");
    }, 700);
  }
}
function enterCar(c) {
  const prev = cur;
  cur = c;
  c.entered = true;
  checkpoint = { x: 0, z: c.z0 + 1.6 };
  // The way back shuts behind you.
  if (prev.frontDoor) prev.frontDoor.sealed = true;
  c.back.sealed = true;
  showCard(c);
  if (!c.enemies.length) c.cleared = true;
  if (c.i === 2 && !W.have.repeater) setTimeout(() => { if (cur === c && !W.have.repeater) say("Something on the counter, in the middle"); }, 4200);
}
function updateDoors(dt) {
  for (const d of doors) {
    const c = d.c;
    let open = false;
    if (!d.sealed) {
      // A front door opens once its car is clear; the next car's back door
      // opens for you as you come through the vestibule.
      const ok = d.front ? c.cleared : cars[c.i - 1]?.cleared && c.i > 0;
      if (ok && P.alive && Math.abs(P.z - d.z) < 3.4 && Math.abs(P.x) < 2.6) open = true;
    }
    const target = open ? 1 : 0;
    if (target === 1 && d.target === 0) sfx.door();
    d.target = target;
    d.open += (target - d.open) * Math.min(1, dt * (target ? 5 : 3.5));
    d.leaves[0].position.x = -DW / 2 - d.open * DW * 0.98;
    d.leaves[1].position.x = DW / 2 + d.open * DW * 0.98;
    // Don't shut on someone standing in the doorway.
    if (!open && Math.abs(P.z - d.z) < 0.6) { d.open = Math.max(d.open, 0.9); }
    d.col.on = d.open < 0.85;
    const green = !d.sealed && (d.front ? c.cleared : (cars[c.i - 1]?.cleared && c.i > 0));
    if (d.green !== green) { d.green = green; setDoorLamp(d, green); }
  }
}
function visibleCars() {
  const out = [];
  for (const c of cars) {
    let v = false;
    if (c === cur) v = true;
    else if (c.i === cur.i + 1) v = cur.frontDoor && (cur.frontDoor.open > 0.01 || P.z > cur.z0 + CL);
    else if (c.i === cur.i - 1) v = cur.back.open > 0.01 || P.z < cur.z0 + 2;
    c.visible = !!v;
    c.group.visible = c.visible;
    if (c.visible) out.push(c);
  }
  return out;
}

// ---------- Down, and up again ----------
function playerDown() {
  P.alive = false;
  P.dropT = 0;
  stats.falls++;
  sfx.down();
  setTimeout(() => {
    if (state !== "play") return;
    state = "dead";
    $("deadWhere").textContent = `Down in ${cur.title.toLowerCase().startsWith("the") ? cur.title.toLowerCase() : "the " + cur.title.toLowerCase() + " car"}. The guards are back where they were.`;
    $("dead").classList.remove("gone");
    document.exitPointerLock?.();
  }, 1500);
}
function retry() {
  for (const e of cur.enemies) resetEnemy(e);
  cur.cleared = false;
  if (cur.frontDoor) { cur.frontDoor.sealed = false; setDoorLamp(cur.frontDoor, false); }
  for (const pk of cur.pickups) pk.taken = false;
  Object.assign(P, { x: checkpoint.x, z: checkpoint.z, yaw: Math.PI, pitch: 0, vx: 0, vz: 0, hp: 100, alive: true, hurt: 0, dropT: 0 });
  W.ammo.scatter = GUNS.scatter.mag;
  W.ammo.repeater = GUNS.repeater.mag;
  W.reloading = 0;
  $("dead").classList.add("gone");
  state = "play";
  lockPointer();
  showCard(cur);
}
function finish() {
  state = "end";
  sfx.end();
  const t = Math.round(stats.time);
  $("sTime").textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  $("sKills").textContent = String(stats.kills);
  $("sFalls").textContent = String(stats.falls);
  setTimeout(() => { $("end").classList.remove("gone"); document.exitPointerLock?.(); }, 1200);
}

// ---------- Input ----------
let locked = false;
function lockPointer() {
  if (TOUCH) return;
  try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch { /* fine */ }
}
document.addEventListener("pointerlockchange", () => {
  const was = locked;
  locked = document.pointerLockElement === canvas;
  if (was && !locked && state === "play") { state = "paused"; $("paused").classList.remove("gone"); keys.clear(); W.trigger = false; }
});
document.addEventListener("mousemove", (e) => {
  if (!locked || state !== "play" || !P.alive) return;
  P.yaw -= e.movementX * 0.0022;
  P.pitch = clamp(P.pitch - e.movementY * 0.0022, -1.35, 1.35);
});
canvas.addEventListener("mousedown", (e) => {
  if (state !== "play") return;
  if (!locked) lockPointer();
  if (e.button === 0) { W.trigger = true; W.fired = false; }
});
addEventListener("mouseup", (e) => { if (e.button === 0) { W.trigger = false; W.fired = false; } });
addEventListener("keydown", (e) => {
  if (state !== "play") return;
  keys.add(e.code);
  if (e.code === "KeyR") startReload();
  if (e.code === "Digit1") switchTo("scatter");
  if (e.code === "Digit2") switchTo("repeater");
  if (e.code === "KeyQ") switchTo(W.cur === "scatter" ? "repeater" : "scatter");
  if (e.code === "KeyP") $("fps").hidden = !$("fps").hidden;
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => { keys.clear(); W.trigger = false; });
addEventListener("wheel", (e) => { if (state === "play" && W.have.repeater) switchTo(W.cur === "scatter" ? "repeater" : "scatter"); }, { passive: true });
function begin() {
  audioStart();
  $("intro").classList.add("gone");
  state = "play";
  lockPointer();
  showCard(cur);
  setTimeout(() => say("They'll come once they see you. Use the bunks and crates for cover", 4), 3800);
}
$("board").addEventListener("click", begin);
$("retry").addEventListener("click", () => { audioStart(); retry(); });
$("resume").addEventListener("click", () => { $("paused").classList.add("gone"); state = "play"; lockPointer(); });
$("again").addEventListener("click", () => location.reload());

// ---------- Quality ----------
// Sharp within a budget of pixels, and less sharp while frames run slow.
let quality = 1;
function applySize() {
  const ratio = Math.min(devicePixelRatio, 1.75, Math.sqrt(3.4e6 / (innerWidth * innerHeight))) * quality;
  renderer.setPixelRatio(ratio);
  renderer.setSize(innerWidth, innerHeight);
}
applySize();
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  applySize();
});
const perf = { acc: 0, n: 0 };
function watchSpeed(raw) {
  perf.acc += raw;
  perf.n++;
  if (perf.acc < 1.2) return;
  const ms = (perf.acc / perf.n) * 1000;
  perf.acc = perf.n = 0;
  if (!$("fps").hidden) $("fps").textContent = `${Math.round(1000 / ms)} fps · ${Math.round(quality * 100)}%`;
  if (document.hidden) return;
  let q = quality;
  if (ms > 21) q = Math.max(0.5, q * (ms > 30 ? 0.8 : 0.9));
  else if (ms < 13 && q < 1) q = Math.min(1, q * 1.08);
  if (Math.abs(q - quality) > 0.01) { quality = q; applySize(); }
}

// ---------- Each frame ----------
const clock = new THREE.Clock();
let simT = 0;
const hemiTo = { sky: new THREE.Color(), ground: new THREE.Color() };
function step(dt) {
  simT += dt;
  const t = simT;
  trainSway = Math.sin(t * 1.1) * 0.6 + Math.sin(t * 2.7 + 1) * 0.25 + Math.sin(t * 0.37) * 0.3;
  if (state === "play") {
    stats.time += dt;
    updatePlayer(dt);
    // Into the next car?
    const next = cars[cur.i + 1];
    if (next && P.z > next.z0 + 2.2) enterCar(next);
    if (cur.i === cars.length - 1 && P.z > cur.z0 + 10 && state === "play") finish();
  }
  if (!P.alive) P.dropT += dt;
  const vis = visibleCars();
  updateDoors(dt);
  if (state === "play" || state === "dead") updateEnemies(dt, cur);
  updatePickups(t);
  updateFx(dt);
  updateWorld(dt, t, P.z);
  updateLights(dt, t, P.z, vis);
  for (const c of vis) {
    for (const p of c.pools) {
      // A telegraph pole's shadow flicks across each pool as it passes.
      const ph = ((((scroll + c.z0 + p.a) % 44) + 44) % 44) / 44;
      p.mat.opacity = p.base * (1 - 0.7 * Math.exp(-Math.pow((ph - 0.5) * 28, 2)));
    }
    if (c.fires) for (const f of c.fires) f.scale.setScalar(0.85 + Math.random() * 0.3);
  }
  // The car's own air: its fog and its fill light, eased between cars.
  const k = Math.min(1, dt * 1.5);
  hemi.color.lerp(hemiTo.sky.set(cur.hemi[0]), k);
  hemi.groundColor.lerp(hemiTo.ground.set(cur.hemi[1]), k);
  hemi.intensity += (cur.hemi[2] - hemi.intensity) * k;
  scene.fog.color.lerp(fogCol.set(cur.fog), k);
  // The camera: your eyes, the train's sway, the shake of being hit.
  const speed = Math.hypot(P.vx, P.vz);
  const bob = Math.sin(P.stride * 7.4) * 0.03 * Math.min(1, speed / 4);
  const drop = P.alive ? 0 : Math.min(1, P.dropT / 0.9);
  camera.position.set(P.x, EYE + bob - drop * 1.25, P.z);
  const sh = P.shake * 0.05;
  camera.rotation.set(P.pitch + P.kick + (Math.random() - 0.5) * sh, P.yaw + (Math.random() - 0.5) * sh, trainSway * 0.006 + drop * 0.6);
  const inVest = P.z > cur.z0 + CL || P.z < cur.z0;
  updateAudio(dt, inVest, cur);
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) hud.msg.classList.remove("on"); }
  if (cardT > 0) { cardT -= dt; if (cardT <= 0) hud.card.classList.remove("on"); }
  if (crossT > 0) { crossT -= dt; if (crossT <= 0) $("cross").className = ""; }
  updateHud();
}
function render() {
  renderer.render(scene, camera);
  drawGun(simT);
}
function frame() {
  const raw = clock.getDelta();
  const dt = Math.min(raw, 0.05);
  if (state === "play") watchSpeed(raw);
  if (state !== "paused") step(dt);
  render();
}
renderer.setAnimationLoop(frame);
window.__train = { enterCar, checkCleared, P, W, GUNS, cars, enemies, doors, step, render, camera, renderer, begin, retry, get state() { return state; }, set state(v) { state = v; }, get cur() { return cur; }, fire, switchTo, keys };
