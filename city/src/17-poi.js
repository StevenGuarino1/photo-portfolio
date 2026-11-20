// ---------- Places worth driving to ----------
// One of each, spread over the island: a ruined castle and an observatory
// on the highland tops, a radio mast, a windmill and a farm among the
// fields, a stone circle in the meadow, a campsite deep in the forest, a
// boathouse on the lake, the island's name in giant letters on a hillside,
// a pier with a big wheel at Saltmarsh, a petrol station, a roadside diner
// and a scenic lookout. Built from simple shapes, painted with vertex
// colours and merged into one mesh; the things that turn are kept apart.
const poiParts = [];
const _ppE = new THREE.Euler(0, 0, 0, "YXZ");
const poiParked = []; // cars to leave parked at places: [x, z, heading]
const spinners = []; // {obj, axis, speed}
function pp(geo, col, x, y, z, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const g = colored(geo.index ? geo.toNonIndexed() : geo, col);
  g.applyMatrix4(tmpM.compose(tmpV.set(x, y, z), tmpQ.setFromEuler(_ppE.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  poiParts.push(g);
}
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CYL = (rt, rb, h, n = 12) => new THREE.CylinderGeometry(rt, rb, h, n);
// The lowest ground under a footprint, so a building never floats.
function footY(x, z, r) {
  let y = 1e9;
  for (const [dx, dz] of [[0, 0], [-r, -r], [r, -r], [-r, r], [r, r]]) y = Math.min(y, landH(x + dx, z + dz));
  return y;
}
// The highest ground near (x, z), at least `away` from any road.
function summit(x, z, radius, away = 60) {
  let best = null;
  for (let k = 0; k < 400; k++) {
    const a = hash2(k, Math.round(x)) * Math.PI * 2;
    const d = Math.sqrt(hash2(k, Math.round(z))) * radius;
    const px = x + Math.cos(a) * d;
    const pz = z + Math.sin(a) * d;
    if (roadAt(px, pz, away) || townAt(px, pz, 80) || nearPOI(px, pz)) continue;
    const h = natH(px, pz);
    if (!best || h > best[2]) best = [px, pz, h];
  }
  return best;
}
// A spot near (x, z) a set distance off the nearest road, facing it.
function roadside(road, frac, side, off) {
  const S = road.S;
  const i = Math.round(S.length * frac);
  const p = S[i];
  const rx = -p.dz * side;
  const rz = p.dx * side;
  return { x: p.x + rx * off, z: p.z + rz * off, face: Math.atan2(-rx, -rz), along: Math.atan2(p.dx, p.dz), p };
}
const STONE = 0x9a958a;
const WHITE = 0xf2f0ea;

// A ruined castle on the craggiest highland top.
{
  const [x, z] = summit(REG.high.x, REG.high.z, 450);
  const y = footY(x, z, 20) - 1;
  POIS.push({ x, z, r: 34 });
  const s = 18;
  for (const [cx, cz, w, d] of [[0, -s, 2 * s, 2], [0, s, 2 * s, 2], [-s, 0, 2, 2 * s], [s, 0, 2, 2 * s]]) {
    // Walls with a breach or two, and battlements along the top.
    const n = 6;
    for (let k = 0; k < n; k++) {
      if (hash2(k, Math.round(cx * 7 + cz)) < 0.18) continue;
      const hh = 7 + hash2(k, 3) * 3;
      const px_ = cx + (w > d ? -s + (k + 0.5) * (2 * s / n) : 0);
      const pz = cz + (d > w ? -s + (k + 0.5) * (2 * s / n) : 0);
      pp(BOX(w > d ? 2 * s / n : 2, hh, d > w ? 2 * s / n : 2), STONE, x + px_, y + hh / 2, z + pz);
      pp(BOX(w > d ? 2 : 2.2, 1.2, d > w ? 2 : 2.2), STONE, x + px_, y + hh + 0.6, z + pz);
    }
  }
  for (const [cx, cz] of [[-s, -s], [s, -s], [-s, s], [s, s]]) {
    const hh = 11 + hash2(Math.round(cx), Math.round(cz)) * 6;
    pp(CYL(3.4, 3.8, hh, 14), STONE, x + cx, y + hh / 2, z + cz);
    addPost(x + cx, z + cz, 3.6);
  }
  pp(BOX(10, 20, 10), 0x8a857a, x + 4, y + 10, z - 3);
  for (const [cx, cz, w, d] of [[0, -s, 2 * s, 2], [0, s, 2 * s, 2], [-s, 0, 2, 2 * s]]) addBox(x + cx - w / 2, z + cz - d / 2, x + cx + w / 2, z + cz + d / 2, 8);
  addBox(x + 4 - 5, z - 3 - 5, x + 4 + 5, z - 3 + 5, 20);
}
// An observatory on the next highest top.
{
  const [x, z] = summit(REG.high.x - 250, REG.high.z + 200, 420);
  const y = footY(x, z, 9) - 0.5;
  POIS.push({ x, z, r: 24 });
  pp(CYL(8, 8, 9, 28), WHITE, x, y + 4.5, z);
  pp(new THREE.SphereGeometry(8.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), 0xdfe3e8, x, y + 9, z);
  pp(BOX(2.2, 7.5, 0.6), 0x2a2f38, x, y + 13, z + 6.8, { rx: -0.65 });
  pp(BOX(12, 4, 8), 0xd8d2c2, x + 13, y + 2, z);
  addPost(x, z, 8.2);
  addBox(x + 7, z - 4, x + 19, z + 4, 4);
  poiParked.push([x + 10, z + 10, 0]);
}
// A radio mast on a hill above the coast road, lit red at the top.
{
  const [x, z] = summit(-620, -680, 300, 50);
  const y = footY(x, z, 4);
  POIS.push({ x, z, r: 16 });
  const H = 120;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    pp(BOX(0.35, H, 0.35), 0xd8452e, x + Math.cos(a) * 1.4, y + H / 2, z + Math.sin(a) * 1.4);
  }
  for (let hh = 4; hh < H; hh += 6) pp(CYL(1.6, 1.6, 0.25, 3), (hh / 6) % 2 ? WHITE : 0xd8452e, x, y + hh, z);
  pp(new THREE.SphereGeometry(0.8, 8, 6), 0xff2010, x, y + H + 0.6, z);
  pp(BOX(5, 3, 4), 0xc9c4b6, x + 6, y + 1.5, z);
  addPost(x, z, 1.8);
  addBox(x + 3.5, z - 2, x + 8.5, z + 2, 3);
}
// A windmill among the fields, sails turning.
{
  const { x, z } = roadside(roads[0], 0.62, 1, 120);
  const y = footY(x, z, 4);
  POIS.push({ x, z, r: 14 });
  pp(CYL(2.6, 4.2, 14, 16), WHITE, x, y + 7, z);
  pp(new THREE.ConeGeometry(3.2, 3.6, 16), 0x5a4030, x, y + 15.8, z);
  pp(BOX(1.2, 2.2, 0.1), 0x5a3a24, x, y + 1.1, z + 4.1);
  addPost(x, z, 4.2);
  const sails = new THREE.Group();
  sails.position.set(x, y + 14, z + 3.3);
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xece4d0 });
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 11, 0.2).translate(0, 5.5, 0), new THREE.MeshLambertMaterial({ color: 0x5a3a24 }));
    const sail = new THREE.Mesh(new THREE.BoxGeometry(2, 8.5, 0.08).translate(1.2, 6.5, 0), sailMat);
    const a = new THREE.Group();
    a.add(arm, sail);
    a.rotation.z = (k / 4) * Math.PI * 2;
    sails.add(a);
  }
  sails.traverse((o) => (o.castShadow = true));
  scene.add(sails);
  spinners.push({ obj: sails, axis: "z", speed: 0.5 });
}
// A farm off the coast road: house, red barn, silos and a paddock.
{
  const { x, z, along } = roadside(roads[0], 0.7, -1, 70);
  const y = footY(x, z, 22);
  POIS.push({ x, z, r: 42 });
  const ry = along;
  const L = (dx, dz) => [x + Math.cos(ry) * dx + Math.sin(ry) * dz, z - Math.sin(ry) * dx + Math.cos(ry) * dz];
  const [bx, bz] = L(-10, 6);
  pp(BOX(14, 7, 22), 0xa8342a, bx, y + 3.5, bz, { ry });
  pp(PRISM.clone(), 0x5a5f66, bx, y + 7, bz, { ry, sx: 15, sy: 5.5, sz: 23 });
  pp(BOX(5, 5, 0.2), WHITE, ...[L(-10, 17.05)].map(([a, b]) => [a, y + 2.5, b])[0], { ry });
  addBox(bx - 9, bz - 9, bx + 9, bz + 9, 7);
  for (const k of [0, 1]) {
    const [sx, sz] = L(4 + k * 6, 14);
    pp(CYL(2.4, 2.4, 14, 16), 0xc9ccd1, sx, y + 7, sz);
    pp(new THREE.SphereGeometry(2.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xb0b4ba, sx, y + 14, sz);
    addPost(sx, sz, 2.4);
  }
  const [hx, hz] = L(12, -6);
  pp(BOX(10, 6, 8), 0xf1e6cc, hx, y + 3, hz, { ry });
  pp(PRISM.clone(), 0x7a3a2a, hx, y + 6, hz, { ry, sx: 9, sy: 3, sz: 11 });
  addBox(hx - 6, hz - 6, hx + 6, hz + 6, 7);
  // A paddock fence.
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    const [fx, fz] = L(-14 + Math.cos(a) * 16, -16 + Math.sin(a) * 10);
    const fy = landH(fx, fz);
    pp(BOX(0.15, 1.2, 0.15), 0xf4f1ea, fx, fy + 0.6, fz);
    pp(BOX(0.08, 0.1, 2.6), 0xf4f1ea, fx, fy + 0.95, fz, { ry: a + Math.PI / 2 + ry });
  }
  poiParked.push([...L(4, -10), ry + Math.PI / 2]);
}
// A ring of standing stones in the meadow.
{
  const x = REG.meadow.x;
  const z = REG.meadow.z;
  const y = footY(x, z, 14);
  POIS.push({ x, z, r: 22 });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const sx = x + Math.cos(a) * 13;
    const sz = z + Math.sin(a) * 13;
    const hh = 3.5 + hash2(k, 77) * 1.5;
    pp(BOX(1.6, hh, 0.9), 0x8f8b82, sx, landH(sx, sz) + hh / 2 - 0.2, sz, { ry: -a, rz: (hash2(k, 5) - 0.5) * 0.12 });
    if (k % 2 === 0 && hash2(k, 9) < 0.7) {
      const b = a + Math.PI / 14;
      pp(BOX(3.6, 0.8, 1), 0x8f8b82, x + Math.cos(b) * 13, landH(sx, sz) + hh + 0.2, z + Math.sin(b) * 13, { ry: -b + Math.PI / 2 });
    }
    addPost(sx, sz, 0.9);
  }
  pp(BOX(3.2, 0.9, 1.6), 0x8f8b82, x, y + 0.45, z);
}
// A campsite in a clearing deep in the forest.
{
  const x = REG.forest.x - 80;
  const z = REG.forest.z - 160;
  POIS.push({ x, z, r: 38 });
  const cols = [0xe85d4a, 0x2a9d8f, 0xf2c230, 0x3a7bd5, 0x7a4f9a];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    const tx = x + Math.cos(a) * 14;
    const tz = z + Math.sin(a) * 14;
    pp(PRISM.clone(), cols[k], tx, landH(tx, tz), tz, { ry: -a, sx: 3, sy: 2, sz: 3.6 });
    addPost(tx, tz, 1.8);
  }
  const y = landH(x, z);
  pp(CYL(0.9, 1, 0.3, 10), 0x6a6a6a, x, y + 0.15, z);
  pp(new THREE.ConeGeometry(0.6, 1.2, 6), 0xff8a2a, x, y + 0.8, z);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    pp(CYL(0.25, 0.25, 2.4, 8), 0x6b4a32, x + Math.cos(a) * 3, y + 0.25, z + Math.sin(a) * 3, { rz: Math.PI / 2, ry: a + Math.PI / 2 });
  }
  pp(BOX(1.4, 0.8, 0.8), 0x2a6f4a, x + 6, y + 0.4, z + 4);
  poiParked.push([x - 10, z + 10, 0.4]);
}
// The lake: water, a jetty, a boathouse and rowing boats.
{
  const pts = [];
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const r = lakeR(a) + 2;
    pts.push(new THREE.Vector2(LAKE.x + Math.cos(a) * r, -(LAKE.z + Math.sin(a) * r)));
  }
  const water = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x3d93a8, specular: 0xd8f4ff, shininess: 90 }));
  water.position.y = LAKE.y;
  water.receiveShadow = true;
  scene.add(water);
  const a = 0.8;
  const r = lakeR(a);
  const jx = LAKE.x + Math.cos(a) * (r - 18);
  const jz = LAKE.z + Math.sin(a) * (r - 18);
  pp(BOX(3, 0.3, 40), 0x8a6a48, jx + Math.cos(a) * 10, LAKE.y + 0.8, jz + Math.sin(a) * 10, { ry: Math.PI / 2 - a });
  for (let k = 0; k < 8; k++) pp(CYL(0.15, 0.15, 3, 6), 0x5a4030, jx + Math.cos(a) * (k * 5 - 8), LAKE.y - 0.4, jz + Math.sin(a) * (k * 5 - 8));
  const bx = LAKE.x + Math.cos(a) * (r + 8);
  const bz = LAKE.z + Math.sin(a) * (r + 8);
  const by = footY(bx, bz, 5);
  pp(BOX(9, 4, 7), 0x7a5a3c, bx, by + 2, bz, { ry: Math.PI / 2 - a });
  pp(PRISM.clone(), 0x3f4650, bx, by + 4, bz, { ry: Math.PI / 2 - a, sx: 8, sy: 2.5, sz: 10 });
  addBox(bx - 5, bz - 5, bx + 5, bz + 5, 4);
  POIS.push({ x: bx, z: bz, r: 12 });
  for (let k = 0; k < 3; k++) {
    const b = a + 0.12 + k * 0.07;
    pp(BOX(1.3, 0.5, 4), [0xc8553d, 0x2d5f9a, WHITE][k], LAKE.x + Math.cos(b) * (r - 8), LAKE.y + 0.2, LAKE.z + Math.sin(b) * (r - 8), { ry: b });
  }
  poiParked.push([bx + 8, bz - 6, a]);
}
// The island's name, in letters the height of a house, on the hills west
// of the city, facing it.
{
  const FONT = {
    V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"], E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"], D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"], B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"], " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  };
  const text = "VERDANT BAY";
  const px_ = 2.6;
  const x = -1150;
  const z0 = 140;
  POIS.push({ x, z: z0 + 95, r: 110 });
  [...text].forEach((ch, ci) => {
    FONT[ch].forEach((row, ry) => [...row].forEach((on, cx) => {
      if (on !== "1") return;
      const z = z0 + (text.length - 1 - ci) * 6.2 * px_ + (4 - cx) * px_;
      const gy = landH(x, z);
      const y = gy + (6 - ry) * px_ + px_ / 2;
      pp(BOX(1.2, px_, px_), WHITE, x, y, z);
      if (ry === 6) pp(BOX(1.2, 6, px_), WHITE, x, gy - 3 + px_ / 2, z);
    }));
  });
}
// A pier at Saltmarsh with a big wheel at its end.
{
  const x = HARBOR.ox + 2 * P;
  const z0 = HARBOR.oz - EDGE - 6;
  const len = 170;
  const dy = HARBOR.y + 0.4;
  pp(BOX(9, 0.5, len), 0x9a7a55, x, dy, z0 - len / 2);
  for (let k = 0; k < len; k += 8) for (const s of [-1, 1]) pp(CYL(0.25, 0.25, 8, 6), 0x5a4030, x + s * 4, dy - 4, z0 - k);
  for (let k = 0; k < len; k += 2) for (const s of [-1, 1]) pp(BOX(0.08, 1, 0.08), WHITE, x + s * 4.4, dy + 0.75, z0 - k);
  addBox(x - 4.6, z0 - len, x - 4.4, z0, 1);
  addBox(x + 4.4, z0 - len, x + 4.6, z0, 1);
  addBox(x - 5, z0 - len - 1, x + 5, z0 - len, 1);
  const wz = z0 - len + 22;
  const R0 = 20;
  // The wheel's legs, then the wheel itself on its own, turning.
  for (const s of [-1, 1]) for (const f of [-1, 1]) {
    const g = BOX(0.6, R0 + 4, 0.6);
    pp(g, WHITE, x + s * 3, dy + (R0 + 3) / 2, wz + f * 6, { rx: f * 0.28 });
  }
  const wheel = new THREE.Group();
  wheel.position.set(x, dy + R0 + 3, wz);
  const wm = new THREE.MeshLambertMaterial({ color: WHITE });
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R0, 0.25, 6, 64), wm);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = s * 2;
    wheel.add(ring);
  }
  const gcols = [0xe85d4a, 0xf2c230, 0x2a9d8f, 0x3a7bd5, 0xd94f7a, 0xef7f2d];
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 0.15).translate(0, 0, 0), wm);
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, R0, 4).translate(0, R0 / 2, 0), wm);
    spoke.rotation.x = a;
    wheel.add(spoke);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2), new THREE.MeshLambertMaterial({ color: gcols[k % gcols.length] }));
    cab.position.set(0, Math.cos(a) * R0, Math.sin(a) * R0);
    cab.userData.hang = true;
    wheel.add(cab);
    void sp;
  }
  wheel.traverse((o) => (o.castShadow = true));
  scene.add(wheel);
  spinners.push({ obj: wheel, axis: "x", speed: 0.12 });
  POIS.push({ x, z: z0 - len / 2, r: 30 });
  // Sailing boats moored along the pier.
  for (let k = 0; k < 6; k++) {
    const s = k % 2 ? 1 : -1;
    const bz = z0 - 25 - k * 22;
    const bx = x + s * 10;
    pp(BOX(3, 1.2, 9), WHITE, bx, 0.3, bz);
    pp(BOX(2.6, 0.2, 7), 0x9a7a55, bx, 0.95, bz);
    pp(CYL(0.1, 0.12, 11, 6), 0xd8d8d8, bx, 6.5, bz - 0.5);
    pp(new THREE.ConeGeometry(2.4, 9, 3), 0xf4f1ea, bx, 6.3, bz + 1.2, { sz: 0.08, sx: 1 });
  }
}
// A petrol station on the Coast Highway.
{
  const { x, z, face, along } = roadside(roads[0], 0.3, 1, ROAD_HW + 16);
  const y = landH(x, z);
  POIS.push({ x, z, r: 28 });
  const L = (dx, dz) => [x + Math.cos(along) * dx + Math.sin(along) * dz, z - Math.sin(along) * dx + Math.cos(along) * dz];
  void face;
  pp(BOX(18, 0.15, 30), 0x6a6d72, x, y + 0.05, z, { ry: along });
  pp(BOX(12, 1, 18), 0xf2f2ee, x, y + 6, z, { ry: along });
  pp(BOX(12.2, 0.4, 18.2), 0xe03a2a, x, y + 5.4, z, { ry: along });
  for (const [dx, dz] of [[-4, -6], [4, -6], [-4, 6], [4, 6]]) { const [px2, pz2] = L(dx, dz); pp(BOX(0.5, 5.5, 0.5), 0xf2f2ee, px2, y + 2.75, pz2); addPost(px2, pz2, 0.4); }
  for (const dz of [-3, 3]) { const [px2, pz2] = L(0, dz); pp(BOX(1, 1.8, 0.7), 0xe03a2a, px2, y + 0.9, pz2, { ry: along }); addPost(px2, pz2, 0.6); }
  const [sx, sz] = L(10, 0);
  pp(BOX(7, 4, 12), 0xf4efe6, sx, y + 2, sz, { ry: along });
  pp(BOX(7.4, 0.8, 12.4), 0x2d5f9a, sx, y + 4.2, sz, { ry: along });
  addBox(sx - 5, sz - 7, sx + 5, sz + 7, 4);
  const [gx, gz] = L(-8, 14);
  pp(BOX(0.4, 9, 0.4), 0x8a8f96, gx, y + 4.5, gz);
  pp(BOX(0.3, 3, 4), 0xe03a2a, gx, y + 9, gz, { ry: along });
  addPost(gx, gz, 0.4);
  poiParked.push([...L(8, -11), along + Math.PI / 2]);
}
// A roadside diner on the Old Mill Road.
{
  const { x, z, along } = roadside(roads[2], 0.42, 1, ROAD_HW + 20);
  const y = landH(x, z);
  POIS.push({ x, z, r: 30 });
  const L = (dx, dz) => [x + Math.cos(along) * dx + Math.sin(along) * dz, z - Math.sin(along) * dx + Math.cos(along) * dz];
  pp(BOX(26, 0.15, 34), 0x6a6d72, x, y + 0.05, z, { ry: along });
  const [dx_, dz_] = L(6, 0);
  pp(CYL(3.2, 3.2, 18, 20), 0xd8dce2, dx_, y + 3.2, dz_, { rx: Math.PI / 2, ry: along });
  pp(BOX(6.4, 1.2, 18), 0xd94f7a, dx_, y + 1.4, dz_, { ry: along });
  pp(BOX(6.6, 1.1, 18.2), 0x24323f, dx_, y + 3.6, dz_, { ry: along });
  addBox(dx_ - 9, dz_ - 9, dx_ + 9, dz_ + 9, 6);
  const [sx, sz] = L(-6, 12);
  pp(BOX(0.4, 10, 0.4), 0x8a8f96, sx, y + 5, sz);
  pp(CYL(2.4, 2.4, 0.5, 20), 0xf2c230, sx, y + 10.5, sz, { rx: Math.PI / 2, ry: along + Math.PI / 2 });
  addPost(sx, sz, 0.4);
  for (let k = 0; k < 3; k++) poiParked.push([...L(-6, -10 + k * 6), along + Math.PI / 2]);
}
// A lookout on the Ridge Road: a lay-by, a rail, benches and a telescope.
{
  let best = null;
  const S = roads[1].S;
  for (let i = 100; i < S.length - 100; i += 5) if (!best || S[i].y > best.y) best = S[i];
  const side = 1;
  const rx = -best.dz * side;
  const rz = best.dx * side;
  const x = best.x + rx * (ROAD_HW + 9);
  const z = best.z + rz * (ROAD_HW + 9);
  const y = best.y;
  const along = Math.atan2(best.dx, best.dz);
  POIS.push({ x, z, r: 22 });
  pp(BOX(12, 0.3, 30), 0x8f8a80, x, y, z, { ry: along });
  const L = (dx, dz) => [x + Math.cos(along) * dx + Math.sin(along) * dz, z - Math.sin(along) * dx + Math.cos(along) * dz];
  for (let k = -14; k <= 14; k += 2) { const [px2, pz2] = L(6 * side, k); pp(BOX(0.12, 1.1, 0.12), 0x5a5f66, px2, y + 0.6, pz2); }
  const [r1, r2] = L(6 * side, 0);
  pp(BOX(0.08, 0.08, 28), 0x5a5f66, r1, y + 1.1, r2, { ry: along });
  addBox(Math.min(r1, r1) - 0.2, r2 - 0.2, r1 + 0.2, r2 + 0.2, 1);
  for (const k of [-8, 8]) { const [bx, bz] = L(4 * side, k); pp(BOX(0.6, 0.5, 2), 0x8a5e3c, bx, y + 0.45, bz, { ry: along }); }
  const [tx, tz] = L(4.5 * side, 0);
  pp(CYL(0.08, 0.1, 1.3, 6), 0x3a3f46, tx, y + 0.8, tz);
  pp(CYL(0.15, 0.2, 0.7, 8), 0x3a3f46, tx, y + 1.5, tz, { rx: Math.PI / 2 - 0.2, ry: along + Math.PI / 2 });
  poiParked.push([...L(0, -6), along]);
}
// A water tower on the edge of Larkhill.
{
  const x = VILLAGE.ox - 40;
  const z = VILLAGE.oz + VILLAGE.size + 30;
  const y = footY(x, z, 5);
  POIS.push({ x, z, r: 12 });
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) pp(BOX(0.4, 16, 0.4), 0x8a8f96, x + dx, y + 8, z + dz);
  pp(CYL(5, 5, 6, 20), 0x9ab8c8, x, y + 19, z);
  pp(new THREE.ConeGeometry(5.2, 2.4, 20), 0x7a98a8, x, y + 23.2, z);
  addPost(x, z, 4.5);
}
{
  const m = new THREE.Mesh(mergeGeometries(poiParts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}
function updateSpinners(dt) {
  for (const s of spinners) {
    s.obj.rotation[s.axis] += s.speed * dt;
    // Gondolas hang level.
    s.obj.children.forEach((c) => { if (c.userData.hang) c.rotation.x = -s.obj.rotation.x; });
  }
}
