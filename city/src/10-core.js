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
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.25, 40000);
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

// ---------- What's in the way ----------
const statics = []; // boxes in the way: {x0, z0, x1, z1, h}
const posts = []; // round things in the way: {x, z, r}
const nodes = []; // every crossing in every town

const CELL = 24;
const grid = new Map();
const cellKey = (cx, cz) => cx * 8192 + cz;
function addToGrid(obj, x0, z0, x1, z1) {
  for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
    const k = cellKey(cx, cz);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(obj);
  }
}
function addBox(x0, z0, x1, z1, h) {
  const b = { box: true, x0, z0, x1, z1, h };
  statics.push(b);
  addToGrid(b, x0, z0, x1, z1);
  return b;
}
function addPost(x, z, r) {
  const p = { box: false, x, z, r };
  posts.push(p);
  addToGrid(p, x - r, z - r, x + r, z + r);
}
const _near = [];
let _stamp = 0;
function nearStatics(x, z, r) {
  _near.length = 0;
  _stamp++;
  for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
    const list = grid.get(cellKey(cx, cz));
    if (list) for (const o of list) if (o.seen !== _stamp) { o.seen = _stamp; _near.push(o); }
  }
  return _near;
}


// A unit triangular prism (a gable roof, a tent).
const PRISM = (() => {
  const sh = new THREE.Shape();
  sh.moveTo(-0.5, 0);
  sh.lineTo(0.5, 0);
  sh.lineTo(0, 1);
  sh.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
})();
