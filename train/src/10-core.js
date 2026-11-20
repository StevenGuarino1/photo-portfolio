// ---------- Frostline ----------
// A long train crossing a frozen world at night, and you in its last car.
// Built like the old grid shooters (straight walls, chunky pixel textures,
// flat sprite enemies) but lit warm: each car is a room of its own, poorer
// at the back, richer toward the front, and the snow streams past the
// windows the whole way. Clear a car and its front door opens.

const $ = (id) => document.getElementById(id);
const TOUCH = matchMedia("(pointer: coarse)").matches;

// Forward is +z. Every car is CL long; between cars, a VL vestibule.
const HW = 4.5; // a car's half width: wider than a real train, so each car is a room
const H = 4.6; // its height
const CL = 28;
const VL = 3.2;
const STRIDE = CL + VL;
const DW = 0.8; // half width of the doorways
const DH = 2.5; // their height
const VW = 1.35; // the vestibule's half width
const VH = 2.9; // and height
const EYE = 1.62;
const SPEED = 24; // the train, in m/s

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
const canvas = renderer.domElement;
canvas.id = "view";
canvas.tabIndex = 0;
document.body.prepend(canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060b);
scene.fog = new THREE.FogExp2(0x0a1120, 0.02);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 1500);
camera.rotation.order = "YXZ";
scene.add(camera);

// ---------- Pixel textures ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function pixelTex(w, h, draw, { repeat = true, srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = Math.min(8, maxAniso);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const shade = (c, k) => {
  const r = Math.min(255, Math.max(0, ((c >> 16) & 255) * k));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 255) * k));
  const b = Math.min(255, Math.max(0, (c & 255) * k));
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
};
function speckle(g, w, h, base, amount, seed, x0 = 0, y0 = 0) {
  const r = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    g.fillStyle = shade(base, 1 + (r() - 0.5) * amount);
    g.fillRect(x0 + x, y0 + y, 1, 1);
  }
}
const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
// Planks running across the texture, each its own shade, with dark gaps.
function planks(g, w, h, base, across, seed, gap = "#140d08") {
  const r = rng(seed);
  for (let p = 0; p < w; p += across) {
    const k = 0.78 + r() * 0.4;
    for (let y = 0; y < h; y++) for (let x = p; x < Math.min(w, p + across); x++) {
      px(g, shade(base, k * (1 + (r() - 0.5) * 0.12) * (1 + Math.sin(y * 0.7 + p) * 0.03)), x, y);
    }
    px(g, gap, p, 0, 1, h);
    const cut = (r() * h) | 0;
    px(g, gap, p, cut, across, 1);
  }
}

const T = {
  // The tail: rusted steel panels, rivets, rust running down.
  rust: pixelTex(32, 32, (g) => {
    speckle(g, 32, 32, 0x3d3631, 0.2, 1);
    const r = rng(2);
    for (let i = 0; i < 14; i++) px(g, shade(0x5a3420, 0.7 + r() * 0.5), (r() * 32) | 0, (r() * 32) | 0, 1, 2 + ((r() * 9) | 0));
    px(g, "#1d1714", 0, 0, 32, 1);
    px(g, "#1d1714", 0, 0, 1, 32);
    px(g, "#1d1714", 16, 0, 1, 32);
    for (const [x, y] of [[2, 2], [13, 2], [19, 2], [29, 2], [2, 29], [13, 29], [19, 29], [29, 29], [2, 15], [29, 15]]) px(g, "#9a8370", x, y);
  }),
  // Freight: ribbed grey steel.
  steel: pixelTex(32, 32, (g) => {
    speckle(g, 32, 32, 0x3b4149, 0.1, 3);
    for (let x = 0; x < 32; x += 8) { px(g, "#565e69", x, 0, 1, 32); px(g, "#22262c", x + 1, 0, 1, 32); }
    px(g, "#1a1d22", 0, 0, 32, 1);
    for (let x = 4; x < 32; x += 8) { px(g, "#7a838f", x, 3); px(g, "#7a838f", x, 28); }
  }),
  grate: pixelTex(16, 16, (g) => {
    speckle(g, 16, 16, 0x24272c, 0.15, 5);
    for (let i = 0; i < 16; i += 4) { px(g, "#3c4148", i, 0, 1, 16); px(g, "#3c4148", 0, i, 16, 1); px(g, "#101114", i + 2, i + 2, 1, 1); }
  }),
  planks: pixelTex(32, 32, (g) => {
    planks(g, 32, 32, 0x4b3524, 8, 7);
    const r = rng(8);
    for (let i = 0; i < 40; i++) px(g, "rgba(10,8,6,0.35)", (r() * 32) | 0, (r() * 32) | 0, 2, 1);
  }),
  boards: pixelTex(32, 16, (g) => planks(g, 32, 16, 0x5a4029, 6, 9)),
  crate: pixelTex(16, 16, (g) => {
    const r = rng(11);
    for (let y = 0; y < 16; y += 4) {
      const k = 0.85 + r() * 0.3;
      for (let yy = y; yy < y + 4; yy++) for (let x = 0; x < 16; x++) px(g, shade(0x76552f, k * (1 + (r() - 0.5) * 0.1)), x, yy);
      px(g, "#2c1d10", 0, y, 16, 1);
    }
    px(g, "#3a2715", 0, 0, 16, 2); px(g, "#3a2715", 0, 14, 16, 2); px(g, "#3a2715", 0, 0, 2, 16); px(g, "#3a2715", 14, 0, 2, 16);
    for (let i = 2; i < 14; i++) px(g, "#a07a46", i, i, 1, 1);
  }),
  // The guards' crates: olive, stencilled.
  ammo: pixelTex(16, 16, (g) => {
    speckle(g, 16, 16, 0x3c4630, 0.12, 13);
    px(g, "#262c1e", 0, 0, 16, 1); px(g, "#262c1e", 0, 15, 16, 1); px(g, "#262c1e", 0, 0, 1, 16); px(g, "#262c1e", 15, 0, 1, 16);
    px(g, "#b9b48e", 4, 6, 8, 1); px(g, "#b9b48e", 4, 9, 6, 1);
  }),
  tile: pixelTex(16, 16, (g) => {
    speckle(g, 16, 16, 0xc8c4b8, 0.06, 15);
    px(g, "#76736b", 0, 0, 16, 1); px(g, "#76736b", 0, 8, 16, 1); px(g, "#76736b", 0, 0, 1, 16); px(g, "#76736b", 8, 0, 1, 16);
  }),
  checker: pixelTex(32, 32, (g) => {
    const r = rng(17);
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      const base = (tx + ty) % 2 ? 0x1c1d20 : 0xb9b4a6;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px(g, shade(base, 1 + (r() - 0.5) * 0.1), tx * 8 + x, ty * 8 + y);
    }
  }),
  counter: pixelTex(16, 16, (g) => {
    const r = rng(19);
    for (let y = 0; y < 16; y++) { const k = 0.9 + r() * 0.2; for (let x = 0; x < 16; x++) px(g, shade(0x8c929a, k * (1 + (r() - 0.5) * 0.05)), x, y); }
    px(g, "#4e535a", 0, 15, 16, 1);
  }),
  // Rich wainscot: a raised panel and its moulding.
  wood: pixelTex(64, 40, (g) => {
    const r = rng(31);
    for (let y = 0; y < 40; y++) { const band = 1 + Math.sin(y * 0.9 + r() * 0.5) * 0.06; for (let x = 0; x < 64; x++) px(g, shade(0x3a2417, band + (r() - 0.5) * 0.1), x, y); }
    px(g, "#24160e", 6, 7, 52, 1); px(g, "#24160e", 6, 7, 1, 26);
    px(g, "#57391f", 6, 33, 53, 1); px(g, "#57391f", 58, 7, 1, 27);
    px(g, "#1b100a", 0, 39, 64, 1); px(g, "#1b100a", 0, 0, 64, 1);
  }),
  damask: pixelTex(32, 32, (g) => {
    speckle(g, 32, 32, 0x4b1b1e, 0.08, 21);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x + y) % 16 === 0 || (x - y + 32) % 16 === 0) px(g, "#5e2629", x, y);
    for (const [cx, cy] of [[8, 0], [0, 8], [8, 16], [24, 16], [16, 8], [16, 24], [24, 0], [0, 24], [8, 32], [24, 32]]) { px(g, "#6e2e30", cx - 1, cy - 2, 2, 4); px(g, "#6e2e30", cx - 2, cy - 1, 4, 2); }
  }),
  greenwall: pixelTex(32, 32, (g) => {
    speckle(g, 32, 32, 0x1f3328, 0.07, 23);
    for (let x = 0; x < 32; x += 4) px(g, "rgba(255,255,255,0.035)", x, 0, 1, 32);
  }),
  carpet: pixelTex(32, 32, (g) => {
    speckle(g, 32, 32, 0x5a1519, 0.1, 25);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = Math.abs(((x + 8) % 16) - 8) + Math.abs(((y + 8) % 16) - 8);
      if (d === 6) px(g, "#8a6a2c", x, y);
      if (d === 1) px(g, "#a07c34", x, y);
    }
  }),
  carpetBlue: pixelTex(32, 32, (g) => {
    speckle(g, 32, 32, 0x1a2140, 0.1, 27);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = Math.hypot(((x + 16) % 32) - 16, ((y + 16) % 32) - 16);
      if (Math.abs(d - 9) < 0.6 || Math.abs(d - 4) < 0.5) px(g, "#8a6a2c", x, y);
    }
    px(g, "#2a335c", 0, 0, 32, 1);
  }),
  cloth: pixelTex(16, 16, (g) => speckle(g, 16, 16, 0xd9d4c6, 0.05, 29)),
  cream: pixelTex(32, 32, (g) => {
    speckle(g, 32, 32, 0x8a8170, 0.06, 33);
    px(g, "#5d564a", 0, 0, 32, 1); px(g, "#5d564a", 0, 0, 1, 32);
    px(g, "#a69c88", 1, 1, 31, 1);
  }),
  soil: pixelTex(16, 16, (g) => speckle(g, 16, 16, 0x2e2117, 0.3, 35)),
  slats: pixelTex(32, 32, (g) => planks(g, 32, 32, 0x6b5136, 4, 37, "#24180d")),
  bellows: pixelTex(16, 16, (g) => {
    for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) px(g, shade(0x1c1d20, x % 4 < 2 ? 1.25 : 0.7), x, y);
  }),
  plate: pixelTex(16, 16, (g) => {
    speckle(g, 16, 16, 0x3e434a, 0.1, 39);
    for (let y = 1; y < 16; y += 4) for (let x = (y % 8 === 1 ? 1 : 3); x < 16; x += 4) { px(g, "#5f6670", x, y, 2, 1); px(g, "#5f6670", x + 1, y + 1, 1, 1); }
  }),
  books: pixelTex(32, 32, (g) => {
    const r = rng(41);
    px(g, "#1a110b", 0, 0, 32, 32);
    for (let row = 0; row < 4; row++) {
      let x = 0;
      while (x < 32) {
        const w = 1 + ((r() * 3) | 0);
        const hgt = 5 + ((r() * 3) | 0);
        const col = [0x6b1f1f, 0x1f3b5a, 0x2d4a2a, 0x7a5a2a, 0x4a2a4a, 0x8a7a5a][(r() * 6) | 0];
        px(g, shade(col, 0.8 + r() * 0.4), x, row * 8 + 8 - hgt - 1, w, hgt);
        x += w + (r() < 0.15 ? 1 : 0);
      }
      px(g, "#3a2414", 0, row * 8 + 7, 32, 1);
    }
  }),
  velvet: pixelTex(16, 32, (g) => {
    for (let x = 0; x < 16; x++) { const k = 0.7 + 0.5 * Math.abs(Math.sin(x * 0.8)); for (let y = 0; y < 32; y++) px(g, shade(0x5a1018, k), x, y); }
  }),
  door: pixelTex(16, 32, (g) => {
    speckle(g, 16, 32, 0x3e444c, 0.08, 43);
    px(g, "#22262b", 0, 0, 1, 32); px(g, "#646c77", 15, 0, 1, 32);
    px(g, "#0d1016", 4, 5, 8, 7); px(g, "#26303f", 5, 6, 6, 5);
    px(g, "#22262b", 2, 18, 12, 1); px(g, "#22262b", 2, 26, 12, 1);
  }),
  brass: pixelTex(8, 8, (g) => speckle(g, 8, 8, 0x9a7a3c, 0.25, 45)),
  dark: pixelTex(8, 8, (g) => speckle(g, 8, 8, 0x16171a, 0.2, 47)),
  // Outside.
  snow: pixelTex(64, 64, (g) => {
    speckle(g, 64, 64, 0xb9c6da, 0.07, 51);
    const r = rng(52);
    for (let i = 0; i < 26; i++) { const x = (r() * 64) | 0; const y = (r() * 64) | 0; px(g, "#9eabc2", x, y, 1, 3 + ((r() * 8) | 0)); }
    for (let i = 0; i < 40; i++) px(g, "#dfe7f4", (r() * 64) | 0, (r() * 64) | 0);
  }),
  track: pixelTex(32, 32, (g) => {
    speckle(g, 32, 32, 0x55585e, 0.35, 53);
    for (let y = 2; y < 32; y += 8) { px(g, "#2b2119", 0, y, 32, 3); px(g, "#3c2f24", 0, y, 32, 1); }
    for (let i = 0; i < 60; i++) px(g, "#c9d3e2", (Math.sin(i * 12.9) * 0.5 + 0.5) * 32 | 0, (Math.sin(i * 78.2) * 0.5 + 0.5) * 32 | 0);
  }),
  frost: pixelTex(32, 32, (g) => {
    const r = rng(57);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const e = Math.min(x, y, 31 - x, 31 - y);
      const a = Math.max(0, 0.75 - e * 0.09) * (0.5 + r() * 0.5) + (r() < 0.02 ? 0.25 : 0.04);
      px(g, `rgba(220,232,250,${a.toFixed(3)})`, x, y);
    }
  }, { repeat: false }),
};
for (const k of ["frost"]) T[k].wrapS = T[k].wrapT = THREE.ClampToEdgeWrapping;
// Sprite sheets (transparent): plants for the greenhouse, pines outside.
T.bush = pixelTex(32, 32, (g) => {
  const r = rng(61);
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = 16 + Math.cos(a) * d * 14;
    const y = 18 + Math.sin(a) * d * 12;
    px(g, shade(0x2f6a2c, 0.55 + (1 - d) * 0.6 + r() * 0.2), x | 0, y | 0, 2, 1);
  }
  for (let i = 0; i < 7; i++) px(g, r() < 0.5 ? "#d2462c" : "#e8a33a", (6 + r() * 20) | 0, (10 + r() * 16) | 0, 2, 2);
  px(g, "#3b2a1a", 15, 28, 2, 4);
}, { repeat: false });
T.tree = pixelTex(32, 48, (g) => {
  const r = rng(63);
  px(g, "#3a2818", 15, 26, 3, 22);
  for (let i = 0; i < 520; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    px(g, shade(0x2a5a26, 0.5 + (1 - d) * 0.7 + r() * 0.2), (16 + Math.cos(a) * d * 14) | 0, (16 + Math.sin(a) * d * 13) | 0, 2, 1);
  }
  for (let i = 0; i < 12; i++) px(g, "#f0a030", (5 + r() * 22) | 0, (6 + r() * 20) | 0, 2, 2);
}, { repeat: false });
T.pine = pixelTex(32, 64, (g) => {
  const r = rng(65);
  px(g, "#1a120c", 15, 52, 2, 12);
  for (let tier = 0; tier < 5; tier++) {
    const top = 4 + tier * 10;
    const hgt = 16;
    for (let y = 0; y < hgt; y++) {
      const half = ((y + 2) / hgt) * (5 + tier * 2.4);
      for (let x = Math.round(16 - half); x <= Math.round(16 + half); x++) {
        const snowy = y < 3 || (r() < 0.12 && y < 8);
        px(g, snowy ? "#b8c6dc" : shade(0x14261e, 0.7 + r() * 0.5), x, top + y);
      }
    }
  }
}, { repeat: false });
T.mountains = pixelTex(512, 96, (g) => {
  const r = rng(67);
  const ridge = [];
  let y = 40;
  for (let x = 0; x < 512; x++) { y += (r() - 0.5) * 3 + Math.sin(x * 0.02) * 0.6; y = Math.max(10, Math.min(70, y)); ridge.push(y); }
  // Wrap smoothly so it tiles.
  for (let x = 0; x < 40; x++) ridge[511 - x] = ridge[511 - x] * (x / 40) + ridge[0] * (1 - x / 40);
  for (let x = 0; x < 512; x++) {
    for (let yy = ridge[x] | 0; yy < 96; yy++) {
      const snow = yy - ridge[x] < 6 + Math.sin(x * 0.3) * 3 && ridge[x] < 46;
      px(g, snow ? "#7d8aa6" : shade(0x1b2236, 0.9 + (yy / 96) * 0.25), x, yy);
    }
  }
}, { repeat: true });
T.mountains.wrapT = THREE.ClampToEdgeWrapping;

// Soft, smooth light textures (light isn't a surface, so not pixelated).
function softTex(draw) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  draw(c.getContext("2d"));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const GLOW = softTex((g) => {
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
});
// A window's moonlight on the floor: a soft-edged rectangle.
const POOL = softTex((g) => {
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const e = Math.min(x, y, 127 - x, 127 - y) / 26;
    g.fillStyle = `rgba(255,255,255,${Math.min(1, e) ** 2})`;
    g.fillRect(x, y, 1, 1);
  }
});

// ---------- Materials ----------
const lam = (map, o = {}) => new THREE.MeshLambertMaterial({ map, ...o });
const M = {
  rust: lam(T.rust), steel: lam(T.steel), grate: lam(T.grate), planks: lam(T.planks), boards: lam(T.boards),
  crate: lam(T.crate), ammo: lam(T.ammo), tile: lam(T.tile), checker: lam(T.checker), counter: lam(T.counter),
  wood: lam(T.wood), damask: lam(T.damask), greenwall: lam(T.greenwall), carpet: lam(T.carpet), carpetBlue: lam(T.carpetBlue),
  cloth: lam(T.cloth), cream: lam(T.cream), soil: lam(T.soil), slats: lam(T.slats), bellows: lam(T.bellows), plate: lam(T.plate),
  books: lam(T.books), velvet: lam(T.velvet), door: lam(T.door), brass: lam(T.brass, { color: 0xffe0a0 }), dark: lam(T.dark),
  blanketA: lam(T.cloth, { color: 0x5a4a3a }), blanketB: lam(T.cloth, { color: 0x3a4a5a }), blanketC: lam(T.cloth, { color: 0x6a3a2a }),
  rag: lam(T.cloth, { color: 0x8a8070, side: THREE.DoubleSide }),
  pipe: lam(T.dark, { color: 0x8a7a6a }),
  black: lam(T.dark, { color: 0x555555 }),
  leather: lam(T.cloth, { color: 0x3a1c12 }),
  iron: lam(T.dark, { color: 0x9aa0aa }),
};
const glassMat = new THREE.MeshBasicMaterial({ map: T.frost, color: 0xa8bcdc, transparent: true, depthWrite: false, side: THREE.DoubleSide });

// ---------- Geometry, merged per material ----------
// A plane whose texture repeats every tw x th metres, starting at (u0, v0)
// metres, so neighbouring pieces of one wall line up.
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
const bins = new Map();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);
function put(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  if (geo.index === null) geo = geo; // all ours are indexed
  geo.applyMatrix4(tmpM.compose(tmpV.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz)), ONE));
  if (!bins.has(mat)) bins.set(mat, []);
  bins.get(mat).push(geo);
}
function flush(group) {
  for (const [mat, list] of bins) {
    const mesh = new THREE.Mesh(mergeGeometries(list), mat);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    group.add(mesh);
  }
  bins.clear();
}
