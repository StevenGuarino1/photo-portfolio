// ---------- Cars ----------
// Simple, chunky cars built from boxes, one mesh each (painted with vertex
// colours, so they all share one material), with every wheel in the city
// drawn in one go. The handling is arcade: grip pulls the car's motion
// toward where it points; the handbrake lets go and lets it slide.
const TYPES = {
  coupe: { L: 4.4, W: 1.86, H: 1.25, bodyH: 0.5, cabL: 0.42, cabZ: -0.07, wb: 2.6, aMax: 7, pw: 200, top: 62, grip: 12, mass: 1.25 },
  sedan: { L: 4.7, W: 1.84, H: 1.48, bodyH: 0.6, cabL: 0.46, cabZ: -0.04, wb: 2.75, aMax: 5.2, pw: 140, top: 52, grip: 10.5, mass: 1.4 },
  hatch: { L: 3.9, W: 1.74, H: 1.52, bodyH: 0.62, cabL: 0.55, cabZ: -0.1, wb: 2.45, aMax: 5.5, pw: 120, top: 48, grip: 11, mass: 1.1 },
  pickup: { L: 5.3, W: 2.0, H: 1.9, bodyH: 0.78, cabL: 0.3, cabZ: 0.1, wb: 3.2, aMax: 5, pw: 140, top: 47, grip: 9, mass: 1.9, bed: true },
  // The off-roader: high, boxy, big tyres, slower on tarmac but as sure on
  // grass and dirt as on the road.
  rover: { L: 4.5, W: 2.02, H: 2.12, bodyH: 0.78, cabL: 0.56, cabZ: -0.1, wb: 2.75, aMax: 6.2, pw: 160, top: 47, grip: 10.5, mass: 1.9, rover: true, tire: 0.5, clear: 0.58, offGrip: 1.0, offDrag: 0.04, offPower: 1.0 },
  van: { L: 5.0, W: 1.96, H: 2.2, bodyH: 0.9, cabL: 0.8, cabZ: -0.06, wb: 3.0, aMax: 4.2, pw: 110, top: 42, grip: 8.5, mass: 2.0, van: true },
};
// Air drag set so each car tops out at its top speed.
for (const T of Object.values(TYPES)) T.drag = Math.min(T.aMax, T.pw / (T.top + 6)) / (T.top * T.top) - 0.02 / T.top;
const PAINTS = [0xf4f4f0, 0xc9ced3, 0xd8352a, 0x2d6fc2, 0xf2c230, 0x2a9d8f, 0x23262b, 0xef7f2d, 0x9ad1b8, 0xd9c7a3, 0x7c2d3e, 0x5b8fd6];
const GLASS = 0x1d2a36;
const TRIM = 0x23252a;
function colored(g, col) {
  const c = new THREE.Color(col);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  g.deleteAttribute("uv");
  return g;
}
const geoCache = new Map();
function carGeo(type, paint) {
  const key = type + paint;
  if (geoCache.has(key)) return geoCache.get(key);
  const T = TYPES[type];
  const { L, W, H, bodyH } = T;
  const cl = T.clear ?? 0.3; // ground clearance
  const parts = [];
  const add = (w, h, d, col, x, y, z) => parts.push(colored(new THREE.BoxGeometry(w, h, d).translate(x, y, z), col));
  add(W, bodyH, L, paint, 0, cl + bodyH / 2, 0);
  add(W * 0.92, cl * 0.7, L * 0.94, TRIM, 0, cl * 0.5, 0);
  const cabL = T.cabL * L;
  const cabZ = T.cabZ * L;
  const ch = H - cl - bodyH;
  const cy = cl + bodyH + ch / 2;
  if (T.van) {
    add(W * 0.98, ch, cabL, paint, 0, cy, cabZ);
    add(W * 0.995, ch * 0.45, cabL * 0.84, GLASS, 0, cy + ch * 0.12, cabZ - cabL * 0.04);
    add(W * 0.86, ch * 0.5, 0.05, GLASS, 0, cy + ch * 0.12, cabZ + cabL / 2 + 0.01);
  } else {
    add(W * 0.84, ch, cabL, GLASS, 0, cy, cabZ);
    add(W * 0.86, 0.07, cabL * 0.8, paint, 0, cl + bodyH + ch, cabZ);
    add(W * 0.85, ch, 0.12, paint, 0, cy, cabZ);
  }
  if (T.bed) {
    for (const s of [-1, 1]) add(0.08, 0.35, L * 0.42, paint, s * (W / 2 - 0.04), cl + bodyH + 0.17, -L * 0.27);
    add(W, 0.35, 0.08, paint, 0, cl + bodyH + 0.17, -L / 2 + 0.04);
  }
  add(W * 1.02, 0.22, 0.2, TRIM, 0, cl + 0.12, L / 2);
  add(W * 1.02, 0.22, 0.2, TRIM, 0, cl + 0.12, -L / 2);
  add(W * 0.5, 0.16, 0.04, TRIM, 0, cl + bodyH - 0.2, L / 2 + 0.01);
  for (const s of [-1, 1]) {
    add(0.36, 0.13, 0.05, 0xfff4cf, s * (W / 2 - 0.28), cl + bodyH - 0.17, L / 2 + 0.02);
    add(0.34, 0.12, 0.05, 0xd02a1f, s * (W / 2 - 0.26), cl + bodyH - 0.15, -L / 2 - 0.02);
    add(0.06, 0.12, 0.18, paint, s * (W / 2 + 0.05), cl + bodyH + 0.12, cabZ + cabL / 2 - 0.1);
  }
  const g = mergeGeometries(parts);
  geoCache.set(key, g);
  return g;
}
const carMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const MAXCARS = 150;
const tires = new THREE.InstancedMesh(tireGeo, new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.85 }), MAXCARS * 4);
const rims = new THREE.InstancedMesh(rimGeo, new THREE.MeshStandardMaterial({ map: rimTex, metalness: 0.9, roughness: 0.25 }), MAXCARS * 4);
for (const m of [tires, rims]) { m.castShadow = true; m.frustumCulled = false; scene.add(m); }

const cars = [];
function makeCar(type, paint, x, z, h) {
  const T = TYPES[type];
  const mesh = new THREE.Mesh(carGeo(type, paint), carMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.order = "YXZ";
  scene.add(mesh);
  const detail = buildDetail(type, paint);
  const c = { detail, type, T, paint, x, z, y: groundAt(x, z), h, vx: 0, vz: 0, vl: 0, vy: 0, gear: 1, rpm: 900, shift: 0, land: 0, steer: 0, spin: 0, in: { thr: 0, brk: 0, steer: 0, hb: true }, mesh, ai: null, awake: false, pitch: 0, roll: 0, slip: 0, prevVl: 0, skidT: 0 };
  cars.push(c);
  return c;
}
// Turn a car into another kind, where it stands (keeping its speed).
function setCarType(c, type, paint = c.paint) {
  scene.remove(c.mesh);
  scene.remove(c.detail.grp);
  c.type = type;
  c.T = TYPES[type];
  c.paint = paint;
  c.mesh = new THREE.Mesh(carGeo(type, paint), carMat);
  c.mesh.castShadow = true;
  c.mesh.receiveShadow = true;
  c.mesh.rotation.order = "YXZ";
  scene.add(c.mesh);
  c.detail = buildDetail(type, paint);
  c.gear = Math.min(c.gear, 5);
}
function placeCar(c, x, z, h) {
  Object.assign(c, { x, z, h, vx: 0, vz: 0, vy: 0, vl: 0, steer: 0, pitch: 0, roll: 0, prevVl: 0, gear: 1, drowned: false, y: groundAt(x, z) });
}

// Handling, made to feel heavy: power that fades as speed builds, gears
// that cut the power for a moment as they change, grip that gives way when
// a corner is taken too fast, gravity on hills, and air over crests.
const GEARS = [0, 13, 23, 33, 43, 52, 999];
function stepCar(c, dt) {
  const T = c.T;
  const I = c.in;
  let fx = Math.sin(c.h);
  let fz = Math.cos(c.h);
  // The ground under each end of the car.
  const hb = T.wb / 2;
  const gF = groundAt(c.x + fx * hb, c.z + fz * hb);
  const sF = surface;
  const gB = groundAt(c.x - fx * hb, c.z - fz * hb);
  const sB = surface;
  const gL = groundAt(c.x + fz * T.W * 0.45, c.z - fx * T.W * 0.45);
  const gR = groundAt(c.x - fz * T.W * 0.45, c.z + fx * T.W * 0.45);
  const g = (gF + gB) / 2;
  const onRoad = sF === "road" || sB === "road";
  c.offroad = !onRoad;
  const grounded = c.y <= g + 0.25;
  c.grounded = grounded;
  let vl = c.vx * fx + c.vz * fz;
  let vt = c.vx * -fz + c.vz * fx;
  if (grounded) {
    // Engine, with a gearbox.
    const sp = Math.abs(vl);
    if (c.gear < 6 && vl > GEARS[c.gear] && !c.shift) { c.gear++; c.shift = 0.22; }
    else if (c.gear > 1 && vl < GEARS[c.gear - 1] * 0.82) c.gear--;
    if (vl < 0.5) c.gear = 1;
    if (c.shift) { c.shift = Math.max(0, c.shift - dt); }
    const lo = GEARS[c.gear - 1];
    const hi = Math.min(GEARS[c.gear], T.top);
    c.rpm = 900 + clamp((sp - lo) / Math.max(1, hi - lo), 0, 1.05) * 5800;
    if (I.thr > 0) {
      if (vl > -0.5) {
        const a = Math.min(T.aMax, T.pw / (Math.max(0, vl) + 6));
        if (!c.shift) vl += I.thr * a * (onRoad ? 1 : T.offPower ?? 0.75) * dt;
      } else vl += I.thr * 12 * dt;
    }
    if (I.brk > 0) {
      if (vl > 0.3) vl -= I.brk * (onRoad ? 12 : 8) * dt;
      else if (vl > -9) vl -= I.brk * 3.5 * dt;
    }
    if (I.hb) vl -= Math.sign(vl) * Math.min(Math.abs(vl), 4.5 * dt);
    // Air, rolling, and the extra drag of grass.
    vl -= (T.drag * vl * Math.abs(vl) + vl * (I.thr ? 0.02 : 0.09) + (onRoad ? 0 : vl * (T.offDrag ?? 0.25))) * dt;
    if (!I.thr && !I.brk && Math.abs(vl) < 0.3) vl *= 0.85;
    // Gravity along the slope.
    vl -= 9.8 * ((gF - gB) / T.wb) * 0.85 * dt;
    // Steering: quick when slow, gentle at speed; the turn is limited by
    // what the tyres can hold, so too fast into a bend means a slide.
    const maxA = 0.58 / (1 + Math.abs(vl) / 11);
    c.steer += (I.steer * maxA - c.steer) * Math.min(1, dt * 6);
    // Grip, with a little arcade downforce: the faster you go on tarmac, the
    // harder the tyres hold, so the long bends can be taken flat out.
    const gripA = T.grip * (onRoad ? 1 + Math.min(1, Math.abs(vl) / 55) * 0.9 : T.offGrip ?? 0.62) * (I.hb ? 0.3 : 1);
    let yaw = (vl / T.wb) * Math.tan(c.steer);
    const yawMax = (gripA * (I.hb ? 2.6 : 1.25)) / Math.max(3, Math.abs(vl));
    yaw = clamp(yaw, -yawMax, yawMax);
    c.vx = fx * vl - fz * vt;
    c.vz = fz * vl + fx * vt;
    c.h -= yaw * dt;
    fx = Math.sin(c.h);
    fz = Math.cos(c.h);
    vl = c.vx * fx + c.vz * fz;
    vt = c.vx * -fz + c.vz * fx;
    // The tyres pull the sideways motion back, up to what they can grip.
    const pull = Math.min(Math.abs(vt), gripA * dt * (Math.abs(vt) > 4 ? 0.8 : 1.6));
    vt -= Math.sign(vt) * pull;
    vl -= Math.sign(vl) * Math.min(Math.abs(vl), Math.abs(vt) * 0.35 * dt);
    c.slip = Math.abs(vt);
  } else {
    c.slip = 0;
    c.h -= ((c.vl / T.wb) * Math.tan(c.steer) * 0.15) * dt;
  }
  c.vx = fx * vl - fz * vt;
  c.vz = fz * vl + fx * vt;
  c.x += c.vx * dt;
  c.z += c.vz * dt;
  c.vl = vl;
  // Up and down: follow the ground, or fly off a crest and come down hard.
  if (c.y <= g + 0.02 || (grounded && c.vy <= 0 && c.y - g < 0.12)) {
    if (c.vy < -5) { c.land = Math.min(1, -c.vy / 14); }
    const climb = (g - c.y) / Math.max(dt, 1e-3);
    c.y = g;
    c.vy = Math.max(0, Math.min(climb, 14));
  } else {
    c.vy -= 16 * dt;
    c.y += c.vy * dt;
    if (c.y < g) { if (c.vy < -5) c.land = Math.min(1, -c.vy / 14); c.y = g; c.vy = 0; }
  }
  // How the body sits: the lie of the ground, plus lean under braking,
  // power and cornering, plus the bounce of a landing.
  const acc = (vl - c.prevVl) / Math.max(dt, 1e-3);
  c.prevVl = vl;
  const tp = Math.atan2(gB - gF, T.wb) + clamp(-acc * 0.006, -0.06, 0.06);
  const tr = Math.atan2(gL - gR, T.W * 0.9) + clamp(((vl * vl) / 30) * -c.steer * 0.05, -0.07, 0.07);
  c.pitch += (tp - c.pitch) * Math.min(1, dt * (c.grounded ? 7 : 1.5));
  c.roll += (tr - c.roll) * Math.min(1, dt * 6);
  c.land = Math.max(0, (c.land || 0) - dt * 2.5);
  c.spin += (vl / 0.34) * dt;
  // Into the sea: a splash and you're put back on the nearest road.
  if (c.y < SEA - 0.6) c.drowned = true;
}

// Each car is three circles down its length, for bumping into things.
function circles(c) {
  const k = c.T.L / 2 - c.T.W / 2;
  const fx = Math.sin(c.h);
  const fz = Math.cos(c.h);
  return [[c.x - fx * k, c.z - fz * k, -k], [c.x, c.z, 0], [c.x + fx * k, c.z + fz * k, k]];
}
function hitStatics(c) {
  let impact = 0;
  const r = c.T.W / 2;
  for (const [px0, pz0] of circles(c)) {
    let px = px0;
    let pz = pz0;
    for (const o of nearStatics(px, pz, r + 1.5)) {
      let nx;
      let nz;
      let depth;
      if (o.box) {
        const cx = clamp(px, o.x0, o.x1);
        const cz = clamp(pz, o.z0, o.z1);
        const dx = px - cx;
        const dz = pz - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; depth = r - d; }
        else {
          const opts = [[px - o.x0, -1, 0], [o.x1 - px, 1, 0], [pz - o.z0, 0, -1], [o.z1 - pz, 0, 1]].sort((a, b) => a[0] - b[0]);
          [depth, nx, nz] = opts[0];
          depth += r;
        }
      } else {
        const dx = px - o.x;
        const dz = pz - o.z;
        const d = Math.hypot(dx, dz);
        if (d >= r + o.r || d < 1e-6) continue;
        nx = dx / d; nz = dz / d; depth = r + o.r - d;
      }
      c.x += nx * depth;
      c.z += nz * depth;
      px += nx * depth;
      pz += nz * depth;
      const vn = c.vx * nx + c.vz * nz;
      if (vn < 0) {
        c.vx -= 1.25 * vn * nx;
        c.vz -= 1.25 * vn * nz;
        c.vx *= 0.94;
        c.vz *= 0.94;
        impact = Math.max(impact, -vn);
      }
    }
  }
  return impact;
}
function hitCars(a, b) {
  const reach = (a.T.L + b.T.L) / 2 + 0.3;
  if (Math.abs(a.x - b.x) > reach || Math.abs(a.z - b.z) > reach) return 0;
  let impact = 0;
  const ra = a.T.W / 2;
  const rb = b.T.W / 2;
  for (const [ax, az] of circles(a)) for (const [bx, bz] of circles(b)) {
    const dx = ax - bx;
    const dz = az - bz;
    const d = Math.hypot(dx, dz);
    if (d >= ra + rb || d < 1e-6) continue;
    const nx = dx / d;
    const nz = dz / d;
    const depth = ra + rb - d;
    const ma = a.T.mass;
    const mb = b.T.mass;
    a.x += nx * depth * (mb / (ma + mb));
    a.z += nz * depth * (mb / (ma + mb));
    b.x -= nx * depth * (ma / (ma + mb));
    b.z -= nz * depth * (ma / (ma + mb));
    const vn = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (vn < 0) {
      const j = (-1.3 * vn) / (1 / ma + 1 / mb);
      a.vx += (j / ma) * nx; a.vz += (j / ma) * nz;
      b.vx -= (j / mb) * nx; b.vz -= (j / mb) * nz;
      // A knock off-centre turns the car a little.
      a.h += (Math.random() - 0.5) * Math.min(0.3, -vn * 0.02);
      b.h += (Math.random() - 0.5) * Math.min(0.3, -vn * 0.02);
      impact = Math.max(impact, -vn);
      a.awake = b.awake = true;
    }
  }
  return impact;
}

// Skid marks where the tyres slide.
const SKIDS = 700;
const skidMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.24, 0.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SKIDS);
skidMesh.frustumCulled = false;
for (let i = 0; i < SKIDS; i++) skidMesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
scene.add(skidMesh);
let skidAt = 0;
function skid(c) {
  const fx = Math.sin(c.h);
  const fz = Math.cos(c.h);
  for (const s of [-1, 1]) {
    const x = c.x - fx * c.T.wb / 2 + -fz * s * (c.T.W / 2 - 0.15);
    const z = c.z - fz * c.T.wb / 2 + fx * s * (c.T.W / 2 - 0.15);
    tmpM.compose(tmpV.set(x, c.y + 0.03, z), tmpQ.setFromEuler(tmpE.set(0, c.h, 0)), ONE);
    skidMesh.setMatrixAt(skidAt++ % SKIDS, tmpM);
  }
  skidMesh.instanceMatrix.needsUpdate = true;
}

const _wm = new THREE.Matrix4();
const tmpS = new THREE.Vector3();
const _wq = new THREE.Quaternion();
const _we = new THREE.Euler(0, 0, 0, "YXZ");
function drawCars(camX, camZ) {
  let w = 0;
  for (const c of cars) {
    c.mesh.position.set(c.x, c.y - (c.land || 0) * 0.12, c.z);
    c.mesh.rotation.set(c.pitch, c.h, c.roll);
    const dist = Math.hypot(c.x - camX, c.z - camZ);
    const far = dist > 260;
    // Close up, the proper model; further off, the plain one.
    const near = dist < 120;
    c.mesh.visible = !far && !near;
    c.detail.grp.visible = near;
    if (far) continue;
    c.mesh.updateMatrix();
    if (near) {
      c.detail.grp.position.copy(c.mesh.position);
      c.detail.grp.rotation.copy(c.mesh.rotation);
      const braking = c.in.brk > 0 && c.vl > 0.5;
      c.detail.tail.material = braking || (c.ai && c.in.hb) ? CM.tailOn : CM.tailOff;
    }
    const T = c.T;
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      _we.set(c.spin, sz > 0 ? -c.steer : 0, 0);
      const tr = T.tire ?? TIRE_R;
      tmpM.compose(tmpV.set(sx * (T.W / 2 - 0.16), tr, sz * T.wb / 2), _wq.setFromEuler(_we), tmpS.setScalar(tr / TIRE_R));
      _wm.multiplyMatrices(c.mesh.matrix, tmpM);
      tires.setMatrixAt(w, _wm);
      // The rim's face points outward on both sides.
      if (sx < 0) { tmpM.makeRotationY(Math.PI); _wm.multiply(tmpM); }
      rims.setMatrixAt(w++, _wm);
    }
  }
  tires.count = rims.count = Math.max(w, 1);
  tires.instanceMatrix.needsUpdate = true;
  rims.instanceMatrix.needsUpdate = true;
}
