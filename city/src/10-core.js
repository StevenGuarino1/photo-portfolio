// ---------- Verdant Bay ----------
// An island city on a bright day: a grid of streets, towers in one corner
// thinning out to houses with gardens, parks, palms along the water, and
// trees on every sidewalk. Traffic keeps to its lanes and stops at the
// lights; people walk the sidewalks; any car can be yours.

const $ = (id) => document.getElementById(id);
const TOUCH = matchMedia("(pointer: coarse)").matches;

// The street grid: roads run along x = k*P and z = k*P for k = 0..N.
const N = 10; // blocks each way
const P = 72; // from one road's middle to the next
const RW = 7; // half the road's width (one lane each way, with room to park)
const SW = 4; // sidewalk width
const EDGE = RW + SW; // a road's middle to the edge of its block's lot
const CURB = 0.15;
const LO = 3.2; // a lane's middle, from the road's middle
const SIZE = N * P;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const canvas = renderer.domElement;
canvas.id = "view";
canvas.tabIndex = 0;
document.body.prepend(canvas);

const scene = new THREE.Scene();
const HAZE = new THREE.Color(0xcfe3f5);
scene.background = HAZE.clone();
scene.fog = new THREE.Fog(HAZE, 220, 760);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2500);
camera.rotation.order = "YXZ";

// ---------- Sun and sky ----------
const SUN_DIR = new THREE.Vector3(0.42, 0.78, 0.46).normalize();
const sun = new THREE.DirectionalLight(0xfff0d8, 3.0);
sun.castShadow = true;
sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 400 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x7d7058, 1.15);
scene.add(hemi);
// Keep the sun's shadows centred on you, snapped to its texels so they
// don't crawl as you move.
const _sv = new THREE.Vector3();
function aimSun(x, z) {
  const texel = 150 / sun.shadow.mapSize.x;
  const sx = Math.round(x / texel) * texel;
  const sz = Math.round(z / texel) * texel;
  sun.target.position.set(sx, 0, sz);
  sun.position.copy(_sv.copy(SUN_DIR).multiplyScalar(200)).add(sun.target.position);
}

const skyGroup = new THREE.Group();
scene.add(skyGroup);
{
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: SUN_DIR } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uSun;
      varying vec3 vDir;
      void main() {
        float y = max(vDir.y, 0.0);
        vec3 c = mix(vec3(0.81, 0.89, 0.96), vec3(0.24, 0.55, 0.92), pow(y, 0.55));
        float s = max(dot(normalize(vDir), uSun), 0.0);
        c += vec3(1.0, 0.9, 0.7) * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.18);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), mat);
  dome.renderOrder = -2;
  skyGroup.add(dome);
  // Fair-weather clouds.
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 128;
  const g = cv.getContext("2d");
  const r = rng(9);
  for (let i = 0; i < 26; i++) {
    const x = 40 + r() * 176;
    const y = 50 + r() * 40 - Math.abs(x - 128) * 0.15;
    const rad = 18 + r() * 26;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < 22; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, opacity: 0.85, transparent: true }));
    const a = r() * Math.PI * 2;
    const d = 700 + r() * 900;
    s.position.set(Math.cos(a) * d, 260 + r() * 260, Math.sin(a) * d);
    s.scale.set(400 + r() * 300, 160 + r() * 90, 1);
    s.renderOrder = -1;
    skyGroup.add(s);
  }
}

// ---------- Helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const R = rng(20251120);
const pick = (a) => a[Math.floor(R() * a.length)];
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAniso);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const hexs = (c) => "#" + c.toString(16).padStart(6, "0");
const shade = (c, k) => {
  const r = Math.min(255, Math.max(0, ((c >> 16) & 255) * k));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 255) * k));
  const b = Math.min(255, Math.max(0, (c & 255) * k));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};
function noiseFill(g, w, h, base, amount, seed, cell = 1) {
  const r = rng(seed);
  for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
    g.fillStyle = shade(base, 1 + (r() - 0.5) * amount);
    g.fillRect(x, y, cell, cell);
  }
}
function plane(w, h, tw = w, th = h, u0 = 0, v0 = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w + u0) / tw, (uv.getY(i) * h + v0) / th);
  return g;
}
function box(w, h, d, tw = 1, th = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, (uv.getX(i) * dims[f][0]) / tw, (uv.getY(i) * dims[f][1]) / th);
  }
  return g;
}
// Static geometry, merged per material (and per shadow setting).
const bins = new Map();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);
function put(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, recv = true, sx = 1, sy = 1, sz = 1 } = {}) {
  geo.applyMatrix4(tmpM.compose(tmpV.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  const key = mat.uuid + (cast ? "c" : "") + (recv ? "r" : "");
  if (!bins.has(key)) bins.set(key, { mat, cast, recv, list: [] });
  bins.get(key).list.push(geo.index ? geo : geo);
}
function flush(parent = scene) {
  for (const { mat, cast, recv, list } of bins.values()) {
    // Mixed indexed / non-indexed lists can't merge: make them all indexed.
    const geos = list.map((g) => (g.index ? g : g.toNonIndexed && g));
    for (let i = 0; i < geos.length; i += 4000) {
      const mesh = new THREE.Mesh(mergeGeometries(geos.slice(i, i + 4000)), mat);
      mesh.castShadow = cast;
      mesh.receiveShadow = recv;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
  }
  bins.clear();
}

// ---------- Textures ----------
const T = {
  asphalt: canvasTex(128, 128, (g) => {
    noiseFill(g, 128, 128, 0x55585d, 0.16, 1, 2);
    const r = rng(2);
    for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(30,32,36,${0.1 + r() * 0.1})`; g.fillRect(r() * 128, r() * 128, 10 + r() * 30, 6 + r() * 20); }
    for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(190,190,185,0.25)"; g.fillRect(r() * 128, r() * 128, 1, 1); }
  }),
  sidewalk: canvasTex(64, 64, (g) => {
    noiseFill(g, 64, 64, 0xc9c3b6, 0.08, 3, 2);
    g.fillStyle = "rgba(90,85,75,0.45)";
    g.fillRect(0, 0, 64, 1);
    g.fillRect(0, 0, 1, 64);
    g.fillRect(0, 32, 64, 1);
    g.fillRect(32, 0, 1, 64);
  }),
  grass: canvasTex(128, 128, (g) => {
    noiseFill(g, 128, 128, 0x5f9a3e, 0.22, 5, 2);
    const r = rng(6);
    for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,190,80,0.5)" : "rgba(40,90,30,0.4)"; g.fillRect(r() * 128, r() * 128, 1, 2 + r() * 3); }
    for (let i = 0; i < 14; i++) { g.fillStyle = pick(["#f4e04d", "#ffffff", "#f29bbb"]); g.fillRect(r() * 128, r() * 128, 2, 2); }
  }),
  plaza: canvasTex(64, 64, (g) => {
    const r = rng(7);
    for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 64; x += 16) {
      g.fillStyle = shade(0xd8c7a6, 0.9 + r() * 0.18);
      g.fillRect(x + 1, y + 1, 15, 7);
    }
    g.globalCompositeOperation = "destination-over";
    g.fillStyle = "#9a8d74";
    g.fillRect(0, 0, 64, 64);
  }),
  path: canvasTex(64, 64, (g) => noiseFill(g, 64, 64, 0xd9c9a3, 0.12, 8, 2)),
  roof: canvasTex(64, 64, (g) => noiseFill(g, 64, 64, 0x8b8b88, 0.18, 9, 2)),
  hedge: canvasTex(64, 64, (g) => {
    noiseFill(g, 64, 64, 0x3d7a34, 0.35, 10, 2);
    const r = rng(11);
    for (let i = 0; i < 200; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,180,70,0.6)" : "rgba(20,60,20,0.5)"; g.fillRect(r() * 64, r() * 64, 2, 2); }
  }),
  sand: canvasTex(64, 64, (g) => noiseFill(g, 64, 64, 0xe8d8ae, 0.08, 12, 2)),
  wall: canvasTex(64, 64, (g) => {
    noiseFill(g, 64, 64, 0xd8d2c4, 0.06, 13, 2);
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 1);
  }),
};

// Facades: one texture is one bay, 4 m wide and one 3.5 m storey tall.
function facade(draw) { return canvasTex(64, 56, draw); }
function windowAt(g, x, y, w, h, glass, frame) {
  g.fillStyle = frame;
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  const grad = g.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, glass[0]);
  grad.addColorStop(1, glass[1]);
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.fillRect(x + 2, y + 2, Math.max(2, w * 0.25), 2);
}
const FACADES = {
  glass: [0x7fb3d9, 0x6aa1c8, 0x8ec3c9, 0x9db5c9].map((c, k) => facade((g) => {
    const grad = g.createLinearGradient(0, 0, 64, 56);
    grad.addColorStop(0, shade(c, 1.15));
    grad.addColorStop(1, shade(c, 0.78));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 56);
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.beginPath(); g.moveTo(10 + k * 8, 0); g.lineTo(26 + k * 8, 0); g.lineTo(8 + k * 8, 56); g.lineTo(-8 + k * 8, 56); g.fill();
    g.fillStyle = "#3c4a58";
    g.fillRect(0, 0, 64, 3);
    g.fillRect(0, 0, 2, 56);
    g.fillRect(31, 0, 2, 56);
  })),
  brick: [0xa8553c, 0x8f4a36, 0xb7765a].map((c) => facade((g) => {
    noiseFill(g, 64, 56, c, 0.14, c & 255, 2);
    g.fillStyle = "rgba(60,30,20,0.25)";
    for (let y = 0; y < 56; y += 4) g.fillRect(0, y, 64, 1);
    windowAt(g, 18, 12, 28, 30, ["#5b7d99", "#2c3e52"], "#efe9dc");
    g.fillStyle = "#e6dfcf";
    g.fillRect(14, 44, 36, 3);
  })),
  stucco: [0xf2d7c6, 0xf6e7b8, 0xcfe8dc, 0xf5f1e8, 0xf3c9b4, 0xd8e2f0].map((c) => facade((g) => {
    noiseFill(g, 64, 56, c, 0.05, c & 255, 2);
    windowAt(g, 22, 14, 20, 28, ["#6f8fa8", "#33475b"], "#ffffff");
    const sh = pick(["#3f7f6a", "#4a6fa5", "#b5643f", "#6b8f3a"]);
    g.fillStyle = sh;
    g.fillRect(12, 12, 8, 32);
    g.fillRect(44, 12, 8, 32);
    g.fillStyle = "rgba(0,0,0,0.15)";
    for (let y = 14; y < 44; y += 4) { g.fillRect(12, y, 8, 1); g.fillRect(44, y, 8, 1); }
  })),
  concrete: [0xd9d0bf, 0xc8c4bb, 0xe2d9c4].map((c) => facade((g) => {
    noiseFill(g, 64, 56, c, 0.06, c & 255, 2);
    windowAt(g, 4, 14, 56, 24, ["#7d9bb3", "#3c5266"], "#6d6a64");
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect(31, 14, 2, 24);
  })),
  house: [0xf4efe4, 0xdfe9ef, 0xf1e1c2, 0xe7d4d0].map((c) => facade((g) => {
    noiseFill(g, 64, 56, c, 0.04, c & 255, 2);
    g.fillStyle = "rgba(0,0,0,0.07)";
    for (let y = 0; y < 56; y += 5) g.fillRect(0, y, 64, 1);
    windowAt(g, 20, 16, 24, 24, ["#7ea2bd", "#3d566d"], "#ffffff");
    g.fillStyle = "#ffffff";
    g.fillRect(31, 16, 2, 24);
  })),
};
// Shopfronts for the ground floor: big windows under an awning stripe.
const SHOPS = [0x2f7d6d, 0xc8553d, 0x2d5f9a, 0xe0a030, 0x7a4f9a, 0x3b3b3b].map((c) => facade((g) => {
  noiseFill(g, 64, 56, 0xe7e1d4, 0.05, 31, 2);
  windowAt(g, 6, 18, 52, 36, ["#a9c6d8", "#3f5a70"], hexs(c));
  g.fillStyle = hexs(c);
  g.fillRect(0, 2, 64, 12);
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let x = 0; x < 64; x += 8) g.fillRect(x, 2, 4, 12);
}));
const lam = (map, o = {}) => new THREE.MeshLambertMaterial({ map, ...o });
const M = {
  asphalt: lam(T.asphalt), sidewalk: lam(T.sidewalk), grass: lam(T.grass), plaza: lam(T.plaza), path: lam(T.path),
  roof: lam(T.roof), hedge: lam(T.hedge), sand: lam(T.sand), wall: lam(T.wall),
  white: new THREE.MeshLambertMaterial({ color: 0xf2f2ec }),
  yellow: new THREE.MeshLambertMaterial({ color: 0xf1c232 }),
  metal: new THREE.MeshLambertMaterial({ color: 0x5d646c }),
  darkMetal: new THREE.MeshLambertMaterial({ color: 0x2b2f35 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x8a5e3c }),
  terracotta: new THREE.MeshLambertMaterial({ color: 0xc0623f }),
  slate: new THREE.MeshLambertMaterial({ color: 0x55606e }),
};
const facadeMats = {};
for (const [k, list] of Object.entries(FACADES)) facadeMats[k] = list.map((t) => lam(t));
const shopMats = SHOPS.map((t) => lam(t));
