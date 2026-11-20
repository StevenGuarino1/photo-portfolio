// ---------- You ----------
const P = { x: 0, z: 2.2, yaw: Math.PI, pitch: 0, vx: 0, vz: 0, hp: 100, alive: true, stride: 0, hurt: 0, shake: 0, kick: 0, dropT: 0 };
const keys = new Set();

// ---------- Guns ----------
const GUNS = {
  scatter: { name: "Scattergun", mag: 2, reload: 1.3, delay: 0.26, pellets: 9, spread: 0.07, dmg: 13, range: 26, kick: 0.06, auto: false },
  repeater: { name: "Repeater", mag: 30, reload: 1.7, delay: 0.1, pellets: 1, spread: 0.014, dmg: 17, range: 40, kick: 0.014, auto: true },
};
const W = { have: { scatter: true, repeater: false }, cur: "scatter", ammo: { scatter: 2, repeater: 30 }, cool: 0, reloading: 0, trigger: false, flash: 0, swap: 0 };

// The gun in your hands, drawn as pixel art once and moved about.
function crisp(c) {
  const g = c.getContext("2d");
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
  g.putImageData(img, 0, 0);
  return c;
}
function gunCanvas(draw) {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 100;
  draw(c.getContext("2d"));
  return crisp(c);
}
const poly = (g, col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
const oval = (g, col, x, y, rx, ry, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
function flashArt(g, x, y, s) {
  poly(g, "#ff8a2a", [[x, y - 26 * s], [x + 7 * s, y - 6 * s], [x + 26 * s, y], [x + 7 * s, y + 6 * s], [x, y + 18 * s], [x - 7 * s, y + 6 * s], [x - 26 * s, y], [x - 7 * s, y - 6 * s]]);
  poly(g, "#ffd27a", [[x, y - 16 * s], [x + 5 * s, y - 4 * s], [x + 16 * s, y], [x + 5 * s, y + 4 * s], [x, y + 11 * s], [x - 5 * s, y + 4 * s], [x - 16 * s, y], [x - 5 * s, y - 4 * s]]);
  oval(g, "#fff6d8", x, y, 7 * s, 5 * s);
}
function hands(g, left = [60, 62], right = [120, 90]) {
  poly(g, "#2a2622", [[0, 100], [18, 100], [left[0] + 4, left[1] + 6], [left[0] - 8, left[1] - 4]]);
  oval(g, "#3b3029", left[0], left[1], 15, 10, -0.5);
  for (let k = 0; k < 4; k++) oval(g, "#4a3b31", left[0] + 7 + k * 2, left[1] - 7 + k * 4, 4, 2.5, -0.3);
  poly(g, "#2a2622", [[160, 100], [138, 100], [right[0] - 6, right[1] + 4], [right[0] + 12, right[1] - 6], [160, 74]]);
  oval(g, "#3b3029", right[0], right[1], 16, 11, 0.4);
  for (let k = 0; k < 4; k++) oval(g, "#4a3b31", right[0] - 12 + k * 4, right[1] - 8 + k, 3, 2.5, 0.2);
}
function scatterArt(g, fire) {
  if (fire) flashArt(g, 80, 9, 1.1);
  poly(g, "#5a3a1f", [[66, 40], [94, 40], [104, 80], [56, 80]]); // fore-end
  poly(g, "#6e4826", [[68, 40], [78, 40], [72, 80], [60, 80]]);
  poly(g, "#22252b", [[71, 11], [79.5, 11], [78, 76], [61, 76]]); // barrels
  poly(g, "#22252b", [[80.5, 11], [89, 11], [99, 76], [82, 76]]);
  poly(g, "#4a505a", [[72, 11], [75, 11], [69, 76], [64, 76]]);
  poly(g, "#4a505a", [[82, 11], [85, 11], [87, 76], [84, 76]]);
  oval(g, "#5d636e", 75.3, 12, 5, 3.2); oval(g, "#5d636e", 84.7, 12, 5, 3.2);
  oval(g, "#050506", 75.3, 12, 3.2, 2); oval(g, "#050506", 84.7, 12, 3.2, 2);
  poly(g, "#31353d", [[60, 74], [102, 74], [114, 100], [54, 100]]); // receiver
  poly(g, "#8a6a32", [[66, 80], [98, 80], [100, 84], [64, 84]]);
  poly(g, "#4e3018", [[96, 84], [130, 88], [140, 100], [100, 100]]); // stock
  hands(g, [60, 64], [122, 92]);
}
function repeaterArt(g, fire) {
  if (fire) flashArt(g, 80, 13, 0.8);
  poly(g, "#202329", [[77.5, 12], [82.5, 12], [84, 40], [76, 40]]); // barrel
  oval(g, "#050506", 80, 13, 2.4, 1.6);
  poly(g, "#2a2e35", [[70, 38], [90, 38], [100, 86], [60, 86]]); // body
  poly(g, "#454b55", [[71, 38], [76, 38], [67, 86], [61, 86]]);
  poly(g, "#5a3a1f", [[64, 54], [96, 54], [99, 70], [61, 70]]); // grip guard
  oval(g, "#1a1c21", 56, 66, 15, 15); oval(g, "#2e323a", 56, 66, 11, 11); oval(g, "#1a1c21", 56, 66, 4, 4); // drum
  poly(g, "#16181c", [[76, 30], [84, 30], [84, 38], [76, 38]]); // sight
  poly(g, "#4e3018", [[92, 84], [128, 88], [138, 100], [96, 100]]);
  hands(g, [66, 76], [122, 92]);
}
const GUN_ART = {
  scatter: [gunCanvas((g) => scatterArt(g, false)), gunCanvas((g) => scatterArt(g, true))],
  repeater: [gunCanvas((g) => repeaterArt(g, false)), gunCanvas((g) => repeaterArt(g, true))],
};
const gunEl = $("gun");
const gunG = gunEl.getContext("2d");
gunG.imageSmoothingEnabled = false;
const muzzle = new THREE.PointLight(0xffc070, 0, 10, 1.6);
camera.add(muzzle);
muzzle.position.set(0.1, -0.15, -0.8);
function drawGun(t) {
  gunG.clearRect(0, 0, 160, 100);
  const speed = Math.hypot(P.vx, P.vz);
  const bobX = Math.sin(P.stride * 3.7) * Math.min(1, speed / 4) * 4;
  const bobY = Math.abs(Math.cos(P.stride * 3.7)) * Math.min(1, speed / 4) * 3 + Math.sin(t * 1.6) * 0.8;
  let ox = bobX;
  let oy = bobY + P.kick * 160;
  let rot = 0;
  const G = GUNS[W.cur];
  if (W.reloading > 0) {
    const k = 1 - W.reloading / G.reload;
    const dip = Math.sin(Math.min(1, k) * Math.PI);
    oy += dip * 34;
    rot = -dip * 0.32;
  }
  if (W.swap > 0) oy += W.swap * 120;
  if (!P.alive) oy += 200;
  gunG.save();
  gunG.translate(80 + Math.round(ox), 100 + Math.round(oy));
  gunG.rotate(rot);
  gunG.drawImage(GUN_ART[W.cur][W.flash > 0 ? 1 : 0], -80, -100);
  gunG.restore();
}

// ---------- Shooting ----------
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
const _hit = new THREE.Vector3();
let crossT = 0;
function fire() {
  const G = GUNS[W.cur];
  if (!P.alive || W.reloading > 0 || W.cool > 0 || W.swap > 0) return;
  if (W.ammo[W.cur] <= 0) { startReload(); return; }
  W.ammo[W.cur]--;
  W.cool = G.delay;
  W.flash = 0.06;
  P.kick = Math.min(0.2, P.kick + G.kick);
  P.pitch = Math.min(1.35, P.pitch + G.kick * 0.5);
  muzzle.intensity = W.cur === "scatter" ? 26 : 14;
  sfx.shot(W.cur);
  camera.getWorldDirection(_f);
  _r.set(1, 0, 0).applyQuaternion(camera.quaternion);
  _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
  const o = camera.position;
  let hitAny = false;
  let killed = false;
  for (let k = 0; k < G.pellets; k++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * G.spread * (W.cur === "repeater" && Math.hypot(P.vx, P.vz) > 3 ? 2.2 : 1);
    _d.copy(_f).addScaledVector(_r, Math.cos(a) * r).addScaledVector(_u, Math.sin(a) * r).normalize();
    const wallT = rayWalls(o, _d, G.range);
    const h = rayEnemies(o, _d, wallT);
    if (h) {
      let dmg = G.dmg * (W.cur === "scatter" ? clamp(1.25 - h.t / 16, 0.3, 1) : 1);
      if (h.y > h.e.T.h * 0.8) dmg *= 1.7;
      _hit.copy(o).addScaledVector(_d, h.t);
      if (damageEnemy(h.e, dmg, _hit)) killed = true;
      hitAny = true;
    } else if (wallT < G.range) {
      _hit.copy(o).addScaledVector(_d, wallT - 0.05);
      puff(_hit, 0xffc890, 0.22, 0.16);
      if (k % 3 === 0) puff(_hit, 0x55504a, 0.4, 0.5, 0.25);
    }
  }
  if (hitAny) {
    const cr = $("cross");
    cr.className = killed ? "kill" : "hit";
    crossT = 0.12;
  }
  alertCar(cur, P.x, P.z, 24);
  if (W.ammo[W.cur] === 0) setTimeout(() => { if (W.ammo[W.cur] === 0) startReload(); }, G.delay * 1000 + 60);
}
function startReload() {
  const G = GUNS[W.cur];
  if (W.reloading > 0 || W.ammo[W.cur] === G.mag || !P.alive) return;
  W.reloading = G.reload;
  sfx.reload(W.cur, G.reload);
}
function switchTo(name) {
  if (!W.have[name] || W.cur === name || !P.alive) return;
  W.cur = name;
  W.reloading = 0;
  W.swap = 0.35;
  sfx.swap();
}

function hurtPlayer(dmg, from) {
  if (!P.alive || state !== "play") return;
  P.hp = Math.max(0, P.hp - dmg);
  P.hurt = Math.min(1, P.hurt + dmg / 30 + 0.25);
  P.shake = 0.25;
  sfx.hurt();
  if (P.hp <= 0) playerDown();
}

// ---------- Moving ----------
function updatePlayer(dt) {
  W.cool -= dt;
  W.flash -= dt;
  W.swap = Math.max(0, W.swap - dt);
  P.kick *= Math.pow(0.002, dt);
  muzzle.intensity *= Math.pow(0.00001, dt);
  P.hurt = Math.max(0, P.hurt - dt * 0.9);
  P.shake = Math.max(0, P.shake - dt);
  if (W.reloading > 0) {
    W.reloading -= dt;
    if (W.reloading <= 0) { W.reloading = 0; W.ammo[W.cur] = GUNS[W.cur].mag; }
  }
  if (!P.alive) { P.vx = P.vz = 0; return; }
  if (W.trigger && (GUNS[W.cur].auto || !W.fired)) { fire(); W.fired = true; }
  let fx = 0;
  let fz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) fz += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) fz -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) fx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) fx += 1;
  const len = Math.hypot(fx, fz) || 1;
  const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const sp = run ? 7.0 : 4.5;
  // Forward is where you're facing (yaw 0 looks down -z).
  const sx = -Math.sin(P.yaw);
  const sz = -Math.cos(P.yaw);
  const wx = ((sx * fz + Math.cos(P.yaw) * fx) / len) * sp;
  const wz = ((sz * fz - Math.sin(P.yaw) * fx) / len) * sp;
  const k = Math.min(1, dt * 10);
  P.vx += (wx - P.vx) * k;
  P.vz += (wz - P.vz) * k;
  moveCircle(P, P.vx * dt, P.vz * dt, 0.35);
  P.stride += Math.hypot(P.vx, P.vz) * dt;
}

// ---------- Things to pick up ----------
const tinTex = pixelTex(16, 16, (g) => {
  speckle(g, 16, 16, 0xc8c2b0, 0.06, 81);
  px(g, "#b3241c", 6, 3, 4, 10); px(g, "#b3241c", 3, 6, 10, 4);
  px(g, "#6a655a", 0, 0, 16, 1); px(g, "#6a655a", 0, 15, 16, 1);
}, { repeat: false });
const tinMat = new THREE.MeshLambertMaterial({ map: tinTex, emissive: 0x302820 });
const gunPickMat = new THREE.MeshLambertMaterial({ map: T.dark, color: 0x9aa0aa, emissive: 0x202020 });
for (const c of cars) for (const pk of c.pickups) {
  const g = new THREE.Group();
  if (pk.kind === "health") g.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.34), tinMat));
  else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.9), gunPickMat);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), gunPickMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, -0.08, 0.05);
    g.add(body, drum);
  }
  const glow = glowSprite(pk.kind === "health" ? 0xff7060 : 0xffd27a, pk.kind === "health" ? 1.0 : 1.6, 0.45);
  g.add(glow);
  g.position.set(pk.x, pk.y + 0.35, c.z0 + pk.a);
  scene.add(g);
  pk.mesh = g;
  pk.c = c;
  pk.taken = false;
}
function updatePickups(t) {
  for (const c of cars) {
    if (!c.visible) { for (const pk of c.pickups) pk.mesh.visible = false; continue; }
    for (const pk of c.pickups) {
      const gone = pk.taken || (pk.kind === "repeater" && W.have.repeater);
      pk.mesh.visible = !gone;
      if (gone) continue;
      pk.mesh.rotation.y = t * 1.4;
      pk.mesh.position.y = pk.y + 0.35 + Math.sin(t * 2.2 + pk.a) * 0.06;
      if (!P.alive || Math.hypot(P.x - pk.mesh.position.x, P.z - pk.mesh.position.z) > 1.1) continue;
      if (pk.kind === "health") {
        if (P.hp >= 100) continue;
        P.hp = Math.min(100, P.hp + 35);
        pk.taken = true;
        sfx.pickup();
        say("Rations. +35");
      } else {
        W.have.repeater = true;
        W.ammo.repeater = GUNS.repeater.mag;
        switchTo("repeater");
        sfx.pickup();
        say("The Repeater. Hold to fire · 1 and 2 to switch", 3.6);
      }
    }
  }
}
