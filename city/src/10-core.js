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
scene.fog = new THREE.FogExp2(HAZE, 0.00024);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.25, 40000);
camera.rotation.order = "YXZ";

// ---------- Sun and sky ----------
// An afternoon sun, low enough to throw long shadows and pick out the land.
const SUN_DIR = new THREE.Vector3(0.55, 0.5, 0.55).normalize();
const sun = new THREE.DirectionalLight(0xffe6c4, 3.5);
sun.castShadow = true;
const SHADOW_R = TOUCH ? 75 : 130;
sun.shadow.mapSize.set(TOUCH ? 1024 : 4096, TOUCH ? 1024 : 4096);
Object.assign(sun.shadow.camera, { left: -SHADOW_R, right: SHADOW_R, top: SHADOW_R, bottom: -SHADOW_R, near: 1, far: 500 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x6a5e48, 0.95);
scene.add(hemi);
// Keep the sun's shadows centred on you, snapped to its texels so they
// don't crawl as you move.
const _sv = new THREE.Vector3();
function aimSun(x, z) {
  const texel = (2 * SHADOW_R) / sun.shadow.mapSize.x;
  const sx = Math.round(x / texel) * texel;
  const sz = Math.round(z / texel) * texel;
  sun.target.position.set(sx, 0, sz);
  sun.position.copy(_sv.copy(SUN_DIR).multiplyScalar(200)).add(sun.target.position);
}

// ---------- The sky ----------
// A deep blue overhead fading to a pale hazy horizon, a sun with a soft
// glow, and two layers of cloud: a deck of fair-weather cumulus about a
// kilometre up (fixed to the world, so you drive under it and it drifts on
// the wind) and thin high cirrus above. The clouds are lit from the sun's
// side and grey underneath, and they throw their shadows on the land.
const CLOUD_H = 1100;
const skyU = { uTime: { value: 0 }, uSun: { value: SUN_DIR }, uHaze: { value: HAZE }, uCam: { value: new THREE.Vector3() } };
const CLOUD_GLSL = `
  uniform float uTime;
  uniform vec3 uSun;
  float c_h21(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
  float c_vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(c_h21(i), c_h21(i + vec2(1, 0)), f.x), mix(c_h21(i + vec2(0, 1)), c_h21(i + vec2(1, 1)), f.x), f.y);
  }
  float c_fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) { s += a * c_vn(p); p = m * p; a *= 0.5; }
    return s;
  }
  // How cloudy it is above the world point xz: 0 clear, 1 thick.
  float cloudCover(vec2 xz) {
    vec2 w = vec2(9.0, 3.5) * uTime;
    vec2 p = (xz + w) / 950.0;
    float warp = c_fbm(p * 0.6 + 3.1);
    float base = c_fbm(p + warp * 0.7);
    float det = c_fbm(p * 3.4 - w / 500.0);
    return smoothstep(0.53, 0.8, base * 0.74 + det * 0.32);
  }
  // The shadow of the clouds on a point: follow the sun up to the deck.
  float cloudShade(vec3 wp) {
    vec2 at = wp.xz + uSun.xz / max(uSun.y, 0.2) * (${CLOUD_H.toFixed(1)} - wp.y);
    return cloudCover(at);
  }
`;
const skyGroup = new THREE.Group();
scene.add(skyGroup);
{
  const mat = new THREE.ShaderMaterial({
    uniforms: skyU,
    vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: CLOUD_GLSL + `
      uniform vec3 uHaze;
      uniform vec3 uCam;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        float h = max(y, 0.0);
        float sd = max(dot(d, uSun), 0.0);
        vec3 zen = vec3(0.075, 0.24, 0.66);
        vec3 c = mix(uHaze, zen, pow(h, 0.42));
        // Warmer and brighter toward the sun, a little deeper blue away from it.
        c += vec3(1.0, 0.82, 0.6) * pow(sd, 5.0) * 0.22 * (1.0 - h);
        c += vec3(1.0, 0.95, 0.85) * pow(sd, 48.0) * 0.45;
        c *= 1.0 - 0.14 * h * (1.0 - sd);
        // A brighter band of haze right at the horizon.
        c = mix(c, uHaze * 1.06, exp(-abs(y) * 26.0) * 0.6);
        if (y < 0.0) c = uHaze;
        float cov = 0.0;
        if (y > 0.0) {
          // The cumulus deck.
          float t = (${CLOUD_H.toFixed(1)} - uCam.y) / max(y, 0.004);
          vec2 P = uCam.xz + d.xz * t;
          cov = cloudCover(P);
          vec2 toSun = normalize(uSun.xz + 1e-5);
          float cov2 = cloudCover(P + toSun * 140.0);
          float lit = clamp(0.78 + (cov - cov2) * 1.8, 0.3, 1.2);
          vec3 body = mix(vec3(0.5, 0.56, 0.66), vec3(1.0, 0.985, 0.96), lit);
          body = mix(body, vec3(1.0), (1.0 - cov) * 0.35);
          body += vec3(1.0, 0.85, 0.6) * pow(sd, 8.0) * (1.0 - cov) * 1.1;
          float far = 1.0 - exp(-t / 12000.0);
          body = mix(body, uHaze * 1.04, far * 0.9);
          float fade = smoothstep(0.004, 0.09, y);
          cov *= fade;
          // High cirrus, thin and streaked along the wind.
          float t2 = (7500.0 - uCam.y) / max(y, 0.004);
          vec2 Q = uCam.xz + d.xz * t2 + vec2(25.0, 6.0) * uTime;
          float ci = smoothstep(0.5, 0.85, c_fbm(vec2(Q.x / 2600.0, Q.y / 9000.0) + c_fbm(Q / 7000.0))) * 0.5 * smoothstep(0.03, 0.3, y);
          c = mix(c, vec3(1.0, 0.99, 0.97), ci);
          c = mix(c, body, cov * 0.97);
        }
        // The sun itself, hidden behind cloud when it's there.
        c += vec3(1.0, 0.97, 0.9) * smoothstep(0.99962, 0.99985, sd) * 9.0 * (1.0 - cov);
        c += vec3(1.0, 0.9, 0.7) * pow(sd, 900.0) * 1.5 * (1.0 - cov * 0.7);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2000, 64, 32), mat);
  dome.renderOrder = -2;
  dome.frustumCulled = false;
  skyGroup.add(dome);
}
// Cloud shadows on a material: darken where a cloud stands between it and
// the sun.
const _shadowed = new Set();
function cloudShadows(mat, strength = 0.3) {
  if (_shadowed.has(mat)) return mat;
  _shadowed.add(mat);
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uTime = skyU.uTime;
    sh.uniforms.uSun = skyU.uSun;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vCWorld;").replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vec4 cw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        cw = instanceMatrix * cw;
      #endif
      vCWorld = (modelMatrix * cw).xyz;`,
    );
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vCWorld;\n" + CLOUD_GLSL).replace(
      "#include <opaque_fragment>",
      `outgoingLight *= 1.0 - ${strength.toFixed(2)} * cloudShade(vCWorld);
      #include <opaque_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => "cloudy" + mat.uuid;
  return mat;
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
