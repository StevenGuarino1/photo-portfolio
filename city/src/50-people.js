// ---------- People ----------
// Blocky figures who walk round the blocks on the sidewalks of whichever
// town you're in. They jump out of the way of a car coming at them; if one
// hits them anyway they go flying, lie there a moment, then get up and run.
// You're one of them when you're out of the car.
const figMat = new THREE.MeshLambertMaterial({ vertexColors: true });
function figure(shirt, pants, skin, hair) {
  const parts = [];
  const add = (w, h, d, col, x, y, z) => parts.push(colored(new THREE.BoxGeometry(w, h, d).translate(x, y, z), col));
  add(0.46, 0.62, 0.26, shirt, 0, 1.2, 0);
  add(0.13, 0.56, 0.14, shirt, -0.3, 1.2, 0);
  add(0.13, 0.56, 0.14, shirt, 0.3, 1.2, 0);
  add(0.11, 0.12, 0.12, skin, -0.3, 0.86, 0);
  add(0.11, 0.12, 0.12, skin, 0.3, 0.86, 0);
  add(0.1, 0.08, 0.1, skin, 0, 1.55, 0);
  add(0.26, 0.28, 0.26, skin, 0, 1.73, 0);
  add(0.28, 0.1, 0.28, hair, 0, 1.88, -0.01);
  add(0.28, 0.16, 0.06, hair, 0, 1.8, -0.13);
  const g = new THREE.Group();
  const body = new THREE.Mesh(mergeGeometries(parts), figMat);
  body.castShadow = true;
  g.add(body);
  const legGeo = mergeGeometries([colored(new THREE.BoxGeometry(0.17, 0.82, 0.19).translate(0, -0.41, 0), pants), colored(new THREE.BoxGeometry(0.18, 0.1, 0.28).translate(0, -0.84, 0.04), 0x26221f)]);
  const legs = [-0.12, 0.12].map((x) => {
    const m = new THREE.Mesh(legGeo, figMat);
    m.position.set(x, 0.9, 0);
    m.castShadow = true;
    g.add(m);
    return m;
  });
  g.rotation.order = "YXZ";
  scene.add(g);
  return { g, legs };
}
const SHIRTS = [0xe85d4a, 0x3a7bd5, 0xf4f4f0, 0x2a9d8f, 0xf2c230, 0x8a5bb5, 0xf08a5d, 0x6bb36b, 0x23262b, 0xd94f7a];
const PANTS = [0x2d3a55, 0x3b3b3b, 0xc9b896, 0x5b4636, 0x1f2833, 0x6a7d8f];
const SKINS = [0xf1c9a5, 0xd9a47c, 0xb57a52, 0x8a5636, 0x5f3b26, 0xf5d6c0];
const HAIRS = [0x2b1d14, 0x5a3a20, 0xc9a25a, 0x111111, 0x8a8a8a, 0xa0522d];
const PEDS = TOUCH ? 24 : 40;
const peds = [];
function pedLoop(p, b) {
  // Round the block on the middle of its sidewalk.
  p.b = b;
  p.t0 = TOWNS.find((t) => t.blocks.includes(b));
  const x0 = b.x0 - SW / 2;
  const z0 = b.z0 - SW / 2;
  const x1 = b.x1 + SW / 2;
  const z1 = b.z1 + SW / 2;
  p.loop = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  if (p.dir < 0) p.loop.reverse();
}
function nearestLoopPoint(p) {
  let best = 1e9;
  let bi = 0;
  p.loop.forEach(([x, z], k) => { const d = Math.hypot(x - p.x, z - p.z); if (d < best) { best = d; bi = k; } });
  p.seg = bi;
}
function placePed(p, px, pz) {
  const t = townAt(px, pz, 400) || TOWNS.reduce((a, b) => (Math.hypot(a.ox - px, a.oz - pz) < Math.hypot(b.ox - px, b.oz - pz) ? a : b));
  const near = t.blocks.filter((b) => Math.hypot((b.x0 + b.x1) / 2 - px, (b.z0 + b.z1) / 2 - pz) < 170);
  const b = (near.length ? near : t.blocks)[Math.floor(Math.random() * (near.length || t.blocks.length))];
  p.dir = Math.random() < 0.5 ? 1 : -1;
  pedLoop(p, b);
  const k = Math.floor(Math.random() * 4);
  const [ax, az] = p.loop[k];
  const [bx, bz] = p.loop[(k + 1) % 4];
  const f = Math.random();
  Object.assign(p, { x: ax + (bx - ax) * f, z: az + (bz - az) * f, seg: (k + 1) % 4, mode: "walk", t: 0, vy: 0, y: t.y + CURB, speed: 1.1 + Math.random() * 0.5, walk: Math.random() * 10 });
  p.g.rotation.set(0, 0, 0);
}
for (let k = 0; k < PEDS; k++) {
  const f = figure(SHIRTS[k % SHIRTS.length], PANTS[(k * 3) % PANTS.length], SKINS[(k * 5) % SKINS.length], HAIRS[(k * 7) % HAIRS.length]);
  const p = { ...f, x: 0, z: 0, y: 0, h: 0, dir: 1, mode: "walk", t: 0, vx: 0, vz: 0, vy: 0 };
  peds.push(p);
}
function pushOut(o, r) {
  for (const s of nearStatics(o.x, o.z, r + 1)) {
    if (s.box) {
      if (s.h < 0.5) continue;
      const cx = clamp(o.x, s.x0, s.x1);
      const cz = clamp(o.z, s.z0, s.z1);
      const dx = o.x - cx;
      const dz = o.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r && d > 1e-6) { o.x += (dx / d) * (r - d); o.z += (dz / d) * (r - d); }
    } else {
      const dx = o.x - s.x;
      const dz = o.z - s.z;
      const d = Math.hypot(dx, dz);
      if (d < r + s.r && d > 1e-6) { o.x += (dx / d) * (r + s.r - d); o.z += (dz / d) * (r + s.r - d); }
    }
  }
}
function animateLegs(f, walk, amount) {
  const a = Math.sin(walk) * 0.6 * amount;
  f.legs[0].rotation.x = a;
  f.legs[1].rotation.x = -a;
}
function updatePeds(dt, px, pz) {
  for (const p of peds) {
    if (Math.hypot(p.x - px, p.z - pz) > 200 && p.mode !== "air") { placePed(p, px, pz); continue; }
    p.t += dt;
    if (p.mode === "air") {
      p.vy -= 16 * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;
      p.g.rotation.x += p.spin * dt;
      pushOut(p, 0.3);
      const gy = groundAt(p.x, p.z);
      if (p.y <= gy && p.vy < 0) { p.y = gy; p.mode = "down"; p.t = 0; p.g.rotation.x = -Math.PI / 2; sfx.thud(p, 0.4); }
    } else if (p.mode === "down") {
      if (p.t > 2.2) { p.mode = "run"; p.t = 0; p.g.rotation.x = 0; p.h = Math.atan2(p.x - px, p.z - pz); sfx.shout(p); }
    } else if (p.mode === "dodge" || p.mode === "run") {
      const sp = p.mode === "dodge" ? 5.5 : 4.2;
      p.x += Math.sin(p.h) * sp * dt;
      p.z += Math.cos(p.h) * sp * dt;
      pushOut(p, 0.3);
      p.walk += sp * dt * 3.2;
      animateLegs(p, p.walk, 1.4);
      if (p.t > (p.mode === "dodge" ? 0.6 : 5)) { p.mode = "walk"; nearestLoopPoint(p); }
    } else {
      const [tx, tz] = p.loop[p.seg];
      const dx = tx - p.x;
      const dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) p.seg = (p.seg + 1) % 4;
      else {
        const want = Math.atan2(dx, dz);
        let dh = want - p.h;
        dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        p.h += dh * Math.min(1, dt * 8);
        const sp = Math.min(p.speed, d / Math.max(dt, 1e-3));
        p.x += Math.sin(p.h) * sp * dt;
        p.z += Math.cos(p.h) * sp * dt;
      }
      p.walk += p.speed * dt * 3.2;
      animateLegs(p, p.walk, 1);
    }
    if (p.mode !== "air") p.y += (groundAt(p.x, p.z) - p.y) * Math.min(1, dt * 12);
    // Cars: jump clear of one coming, or go flying.
    if (p.mode === "walk" || p.mode === "run") {
      for (const c of cars) {
        const sp = Math.hypot(c.vx, c.vz);
        if (sp < 6 || Math.abs(c.x - p.x) > 14 || Math.abs(c.z - p.z) > 14) continue;
        const rx = p.x - c.x;
        const rz = p.z - c.z;
        const along = (rx * c.vx + rz * c.vz) / sp;
        const side = (rx * -c.vz + rz * c.vx) / sp;
        if (along > 0 && along < 13 && Math.abs(side) < 2.6 && Math.random() < dt * 6) {
          p.mode = "dodge";
          p.t = 0;
          p.h = Math.atan2(-c.vz * Math.sign(side || 1), c.vx * Math.sign(side || 1));
          if (Math.random() < 0.5) sfx.shout(p);
          break;
        }
      }
    }
    if (p.mode !== "air" && p.mode !== "down") {
      for (const c of cars) {
        if (Math.abs(c.x - p.x) > 4 || Math.abs(c.z - p.z) > 4) continue;
        for (const [cx, cz] of circles(c)) {
          const dx = p.x - cx;
          const dz = p.z - cz;
          const d = Math.hypot(dx, dz);
          const min = c.T.W / 2 + 0.3;
          if (d >= min || d < 1e-6) continue;
          const sp = Math.hypot(c.vx, c.vz);
          if (sp > 3) {
            p.mode = "air";
            p.t = 0;
            p.vx = c.vx * 0.7 + (dx / d) * 2;
            p.vz = c.vz * 0.7 + (dz / d) * 2;
            p.vy = 3 + sp * 0.14;
            p.spin = (Math.random() < 0.5 ? -1 : 1) * (4 + sp * 0.2);
            c.vx *= 0.96;
            c.vz *= 0.96;
            sfx.thud(p, 0.8);
          } else { p.x = cx + (dx / d) * min; p.z = cz + (dz / d) * min; }
          break;
        }
      }
    }
    p.g.position.set(p.x, p.y + (p.mode === "down" ? 0.18 : 0), p.z);
    p.g.rotation.y = p.h;
  }
}

// ---------- You, on foot ----------
const me = { ...figure(0xff8a3d, 0x2d3a55, 0xe0b090, 0x3a2414), x: 0, z: 0, y: 0, h: 0, vx: 0, vz: 0, walk: 0 };
me.g.visible = false;
function updateMe(dt, camYaw) {
  let fx = 0;
  let fz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) fz += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) fz -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) fx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) fx += 1;
  const len = Math.hypot(fx, fz);
  const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const sp = run ? 7.5 : 4.2;
  // Forward is away from the camera.
  const ax = Math.sin(camYaw);
  const az = Math.cos(camYaw);
  let wx = 0;
  let wz = 0;
  if (len) {
    wx = ((ax * fz - az * fx) / len) * sp;
    wz = ((az * fz + ax * fx) / len) * sp;
    const want = Math.atan2(wx, wz);
    let dh = want - me.h;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    me.h += dh * Math.min(1, dt * 10);
  }
  const k = Math.min(1, dt * 10);
  me.vx += (wx - me.vx) * k;
  me.vz += (wz - me.vz) * k;
  me.x += me.vx * dt;
  me.z += me.vz * dt;
  pushOut(me, 0.35);
  for (const c of cars) {
    if (Math.abs(c.x - me.x) > 5 || Math.abs(c.z - me.z) > 5) continue;
    for (const [cx, cz] of circles(c)) {
      const dx = me.x - cx;
      const dz = me.z - cz;
      const d = Math.hypot(dx, dz);
      const min = c.T.W / 2 + 0.35;
      if (d < min && d > 1e-6) { me.x = cx + (dx / d) * min; me.z = cz + (dz / d) * min; }
    }
  }
  me.y += (groundAt(me.x, me.z) - me.y) * Math.min(1, dt * 12);
  if (me.y < SEA - 0.3) { me.y = SEA - 0.3; }
  const v = Math.hypot(me.vx, me.vz);
  me.walk += v * dt * 2.6;
  animateLegs(me, me.walk, Math.min(1.4, v / 3));
  me.g.position.set(me.x, me.y, me.z);
  me.g.rotation.y = me.h;
}
