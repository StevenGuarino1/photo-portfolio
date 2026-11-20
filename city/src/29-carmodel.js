// ---------- Car models, close up ----------
// Near the camera each car is drawn properly: a body pressed from its side
// profile (hood, wheel arches, trunk, rounded edges), a glasshouse that
// leans in toward the roof, pillars, bumpers, grille, lamps, mirrors and
// door lines, all in glossy paint that reflects the sky. Further off, the
// plain box version stands in.

// A small sky for the paint and glass to reflect.
{
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uSun: { value: SUN_DIR } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uSun;
      varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(vec3(0.85, 0.92, 1.0), vec3(0.3, 0.55, 0.95), pow(y, 0.5)) : mix(vec3(0.55, 0.6, 0.5), vec3(0.32, 0.38, 0.26), pow(-y, 0.4));
        float s = max(dot(vDir, uSun), 0.0);
        c += vec3(1.0, 0.95, 0.85) * (pow(s, 300.0) * 30.0 + pow(s, 8.0) * 0.4);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  env.add(sky);
  const rt = pm.fromScene(env, 0.02);
  scene.environment = rt.texture;
  pm.dispose();
}
const CM = {
  glass: new THREE.MeshStandardMaterial({ color: 0x101820, metalness: 0.7, roughness: 0.04 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x18191c, metalness: 0.1, roughness: 0.65, side: THREE.DoubleSide }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe4e6ea, metalness: 1, roughness: 0.12 }),
  head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.1 }),
  tailOff: new THREE.MeshStandardMaterial({ color: 0x8a1410, emissive: 0x500806, emissiveIntensity: 1, roughness: 0.2 }),
  tailOn: new THREE.MeshStandardMaterial({ color: 0xff3a24, emissive: 0xff2010, emissiveIntensity: 3, roughness: 0.2, toneMapped: false }),
  plate: new THREE.MeshStandardMaterial({ color: 0xf2f0e6, roughness: 0.5 }),
};
const paintMats = new Map();
function paintMat(col) {
  if (!paintMats.has(col)) paintMats.set(col, new THREE.MeshStandardMaterial({ color: col, metalness: 0.45, roughness: 0.27 }));
  return paintMats.get(col);
}
// Extrude a side profile (points in car z, y) across the car's width.
function sideExtrude(shape, width, bevel = 0.06) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 });
  g.rotateY(-Math.PI / 2);
  g.translate((width - bevel * 2) / 2, 0, 0);
  g.deleteAttribute("uv");
  return g;
}
const TIRE_R = 0.36;
const detailCache = new Map();
function detailGeo(type) {
  if (detailCache.has(type)) return detailCache.get(type);
  const T = TYPES[type];
  const { L, W, H, wb } = T;
  const cl = T.clear ?? 0.3;
  const belt = cl + T.bodyH;
  const cabL = T.cabL * L;
  const zf = T.cabZ * L + cabL / 2; // where the windscreen meets the hood
  const zr = T.cabZ * L - cabL / 2; // where the back window meets the body
  const top = H;
  const rise = top - belt;
  const ws = T.van ? rise * 0.4 : T.rover ? rise * 0.32 : rise * 1.3; // how far the windscreen leans back
  const rw = T.van || T.rover ? 0.05 : type === "hatch" ? rise * 0.35 : type === "coupe" ? rise * 1.5 : T.bed ? 0.08 : rise * 0.95;
  const ra = (T.tire ?? TIRE_R) + 0.08; // wheel arch radius
  const yw = T.tire ?? TIRE_R;
  const paint = [];
  const trim = [];
  const chrome = [];
  const glass = [];
  const head = [];
  const tail = [];
  const plate = [];
  const bx = (list, w, h, d, x, y, z, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); g.deleteAttribute("uv"); list.push(g); };
  // The body, from the side.
  {
    const s = new THREE.Shape();
    const a = Math.asin(clamp((cl - yw) / ra, -1, 1));
    const rearZ = -L / 2;
    const frontZ = L / 2;
    s.moveTo(rearZ + 0.12, cl);
    s.lineTo(-wb / 2 - ra * Math.cos(a), cl);
    s.absarc(-wb / 2, yw, ra, Math.PI - a, a, true);
    s.lineTo(wb / 2 - ra * Math.cos(a), cl);
    s.absarc(wb / 2, yw, ra, Math.PI - a, a, true);
    s.lineTo(frontZ - 0.14, cl);
    s.quadraticCurveTo(frontZ, cl, frontZ, cl + 0.16);
    s.lineTo(frontZ - 0.02, belt - 0.16);
    s.quadraticCurveTo(frontZ - 0.03, belt - 0.03, frontZ - 0.32, belt - 0.03);
    s.lineTo(zf + 0.06, belt + 0.02);
    if (T.bed) {
      s.lineTo(zr - 0.02, belt + 0.02);
      s.lineTo(zr - 0.02, belt + 0.34);
      s.lineTo(rearZ + 0.03, belt + 0.34);
      s.lineTo(rearZ, belt - 0.1);
    } else if (type === "hatch" || T.van || T.rover) {
      s.lineTo(zr + 0.02, belt + 0.02);
      s.quadraticCurveTo(rearZ + 0.02, belt + 0.02, rearZ, belt - 0.12);
    } else {
      s.lineTo(zr - 0.04, belt + 0.03);
      s.lineTo(rearZ + 0.3, belt + 0.01);
      s.quadraticCurveTo(rearZ + 0.02, belt, rearZ, belt - 0.16);
    }
    s.lineTo(rearZ + 0.01, cl + 0.16);
    s.quadraticCurveTo(rearZ, cl, rearZ + 0.12, cl);
    paint.push(sideExtrude(s, W, 0.07));
  }
  // The glasshouse, narrowing toward the roof.
  const gw = W * 0.86;
  {
    const s = new THREE.Shape();
    s.moveTo(zf, belt);
    s.lineTo(zf - ws, top);
    s.lineTo(zr + rw, top);
    s.lineTo(zr, belt);
    s.lineTo(zf, belt);
    const g = sideExtrude(s, gw, 0.05);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = clamp((p.getY(i) - belt) / rise, 0, 1);
      p.setX(i, p.getX(i) * (1 - 0.1 * k));
    }
    glass.push(g);
    // The roof over it, and the pillars down its corners.
    const r = new THREE.Shape();
    r.moveTo(zf - ws + 0.02, top - 0.02);
    r.lineTo(zr + rw - 0.02, top - 0.02);
    r.lineTo(zr + rw - 0.06, top + 0.035);
    r.lineTo(zf - ws + 0.06, top + 0.035);
    r.lineTo(zf - ws + 0.02, top - 0.02);
    paint.push(sideExtrude(r, gw * 0.9 + 0.04, 0.02));
    const px = (gw / 2) * 0.95 + 0.01;
    const pillar = (z0, y0, z1, y1, t = 0.07) => {
      const len = Math.hypot(z1 - z0, y1 - y0);
      for (const sx of [-1, 1]) {
        const g = new THREE.BoxGeometry(t, len, t);
        g.rotateX(Math.atan2(z1 - z0, y1 - y0));
        const k = 0.5;
        g.translate(sx * (px - 0.05 * k), (y0 + y1) / 2, (z0 + z1) / 2);
        g.deleteAttribute("uv");
        paint.push(g);
      }
    };
    pillar(zf, belt, zf - ws, top);
    pillar(zr, belt, zr + rw, top, T.van ? 0.1 : 0.12);
    if (!T.bed && type !== "coupe") pillar((zf - ws + zr + rw) / 2 + 0.1, belt, (zf - ws + zr + rw) / 2 + 0.1, top, 0.09);
    // A trim line along the bottom of the windows.
    for (const sx of [-1, 1]) bx(chrome, 0.02, 0.025, zf - zr, sx * gw / 2, belt + 0.02, (zf + zr) / 2);
  }
  if (T.bed) bx(trim, W - 0.22, 0.04, -L / 2 - zr + 0.1, 0, belt + 0.3, (zr - 0.02 - L / 2 + 0.03) / 2);
  // Bumpers, grille, sills, the dark under the arches.
  bx(trim, W * 1.01, 0.24, 0.24, 0, cl + 0.12, L / 2 - 0.06);
  bx(trim, W * 1.01, 0.24, 0.24, 0, cl + 0.12, -L / 2 + 0.06);
  bx(trim, W * 0.5, 0.17, 0.05, 0, belt - 0.24, L / 2 - 0.005);
  bx(chrome, W * 0.52, 0.025, 0.06, 0, belt - 0.15, L / 2 - 0.01);
  for (const sx of [-1, 1]) {
    bx(trim, 0.05, 0.12, wb - ra * 2 - 0.1, sx * (W / 2 + 0.005), cl + 0.07, 0);
    for (const sz of [-1, 1]) {
      const liner = new THREE.CylinderGeometry(ra - 0.01, ra - 0.01, W * 0.96, 16, 1, true, -Math.PI / 2, Math.PI);
      liner.rotateZ(Math.PI / 2);
      liner.translate(0, yw, sz * wb / 2);
      liner.deleteAttribute("uv");
      trim.push(liner);
    }
    // Lamps, mirrors, door lines and handles.
    bx(head, 0.44, 0.12, 0.08, sx * (W / 2 - 0.3), belt - 0.13, L / 2 - 0.03);
    bx(tail, 0.4, 0.13, 0.06, sx * (W / 2 - 0.24), belt - 0.17, -L / 2 + 0.005);
    bx(paint, 0.2, 0.11, 0.12, sx * (W / 2 + 0.07), belt + 0.1, zf - 0.18);
    bx(glass, 0.012, 0.08, 0.1, sx * (W / 2 + 0.172), belt + 0.1, zf - 0.18);
    const doors = T.van ? [zf - 0.05, zf - 0.95] : type === "coupe" || T.bed ? [zf - 0.05, zr + 0.05] : [zf - 0.05, (zf + zr) / 2 + 0.1, zr + 0.15];
    for (const z of doors) bx(trim, 0.012, T.bodyH - 0.12, 0.014, sx * (W / 2 + 0.003), cl + 0.06 + (T.bodyH - 0.12) / 2, z);
    for (let k = 0; k < doors.length - 1; k++) bx(chrome, 0.03, 0.03, 0.14, sx * (W / 2 + 0.01), belt - 0.1, doors[k + 1] + 0.18);
  }
  if (T.rover) {
    // A spare wheel on the tailgate, a roof rack, a bull bar, chunky
    // wheel-arch flares and a snorkel.
    const spare = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 18);
    spare.rotateX(Math.PI / 2);
    spare.translate(0, belt + 0.05, -L / 2 - 0.16);
    spare.deleteAttribute("uv");
    trim.push(spare);
    bx(chrome, 0.3, 0.3, 0.04, 0, belt + 0.05, -L / 2 - 0.3);
    for (const sx of [-1, 1]) bx(trim, 0.05, 0.06, cabL * 0.95, sx * (gw * 0.45), top + 0.16, (zf + zr) / 2);
    for (let k = 0; k < 4; k++) bx(trim, gw * 0.9, 0.04, 0.05, 0, top + 0.18, zr + 0.2 + k * (cabL - 0.4) / 3);
    for (const sx of [-1, 1]) for (const yy of [0.08, 0.2]) bx(trim, 0.06, 0.06, 0.06, sx * (gw * 0.45), top + yy - 0.05, zf - ws + 0.2);
    bx(trim, W * 0.9, 0.08, 0.08, 0, cl + 0.42, L / 2 + 0.2);
    bx(trim, W * 0.9, 0.08, 0.08, 0, cl + 0.7, L / 2 + 0.2);
    for (const sx of [-0.3, 0.3]) bx(trim, 0.08, 0.5, 0.08, sx * W, cl + 0.5, L / 2 + 0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(trim, 0.12, 0.1, ra * 2.1, sx * (W / 2 + 0.03), yw + ra * 0.72, sz * wb / 2);
    bx(trim, 0.1, 1.0, 0.1, W / 2 + 0.04, belt + 0.3, zf - 0.05);
  }
  bx(plate, 0.52, 0.12, 0.02, 0, cl + 0.22, L / 2 + 0.07);
  bx(plate, 0.52, 0.12, 0.02, 0, cl + 0.3, -L / 2 - 0.07);
  const ex = new THREE.CylinderGeometry(0.045, 0.045, 0.22, 10);
  ex.rotateX(Math.PI / 2);
  ex.translate(W * 0.3, cl + 0.02, -L / 2 - 0.02);
  ex.deleteAttribute("uv");
  chrome.push(ex);
  const merge = (l) => (l.length ? mergeGeometries(l.map((g) => (g.index ? g.toNonIndexed() : g))) : null);
  const out = { paint: merge(paint), trim: merge(trim), chrome: merge(chrome), glass: merge(glass), head: merge(head), tail: merge(tail), plate: merge(plate) };
  detailCache.set(type, out);
  return out;
}
function buildDetail(type, col) {
  const G = detailGeo(type);
  const grp = new THREE.Group();
  grp.rotation.order = "YXZ";
  const add = (geo, mat, cast = false) => { if (!geo) return null; const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = cast; grp.add(m); return m; };
  add(G.paint, paintMat(col), true);
  add(G.trim, CM.trim, true);
  add(G.glass, CM.glass, true);
  add(G.chrome, CM.chrome);
  add(G.head, CM.head);
  add(G.plate, CM.plate);
  const tail = add(G.tail, CM.tailOff);
  grp.visible = false;
  scene.add(grp);
  return { grp, tail };
}

// Wheels: a rounded tyre and a spoked alloy, every wheel in town in two draws.
const tireGeo = (() => {
  const pts = [];
  const w = 0.13;
  for (let k = 0; k <= 10; k++) {
    const a = -Math.PI / 2 + (k / 10) * Math.PI;
    pts.push(new THREE.Vector2(TIRE_R - 0.05 + Math.cos(a) * 0.05, Math.sin(a) * w));
  }
  pts.unshift(new THREE.Vector2(0.25, -w));
  pts.push(new THREE.Vector2(0.25, w));
  const g = new THREE.LatheGeometry(pts, 24);
  g.rotateZ(Math.PI / 2);
  return g;
})();
const rimTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#c9ccd1";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#2a2c30";
  for (let k = 0; k < 5; k++) {
    g.save();
    g.translate(64, 64);
    g.rotate((k / 5) * Math.PI * 2 + Math.PI / 5);
    g.beginPath();
    g.moveTo(-9, 20);
    g.lineTo(9, 20);
    g.lineTo(16, 54);
    g.lineTo(-16, 54);
    g.fill();
    g.restore();
  }
  g.fillStyle = "#9a9da3";
  g.beginPath(); g.arc(64, 64, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#3a3c40";
  g.beginPath(); g.arc(64, 64, 5, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const rimGeo = (() => {
  const g = new THREE.CylinderGeometry(0.255, 0.255, 0.2, 24);
  g.rotateZ(Math.PI / 2);
  return g;
})();
