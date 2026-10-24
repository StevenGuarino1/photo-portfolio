  import * as THREE from "three";
  import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

  // ======================================================================
  // Steven Guarino: a walk-through gallery.
  //
  // A lobby joins every room through a short vestibule. Each room is its own
  // scene with its own lights, fog and sound, placed in the world so its
  // entrance meets the end of its vestibule. You see into a room only
  // through its doorway: the doorway is marked in the stencil buffer and the
  // room is drawn there alone, so light and fog never leak between rooms.
  // Rooms are built when you come near and taken down when you're far away.
  // ======================================================================

  const EYE = 1.62; // eye height, metres, everywhere
  const WALK = 2.5; // metres a second; twice that with Shift
  const BODY = 0.25; // your radius, for bumping into things
  const PERSON = 0.3; // everyone else's
  const DOOR_H = 2.4; // every doorway is 1.6 m wide and 2.4 m tall
  const DOOR_HALF = 0.8;
  const LOBBY = { apothem: 8, height: 5, corridor: 5, corridorHalf: 1.2, corridorH: 3.1 };

  // ---------- Settings, remembered between visits ----------

  const STORE_KEY = "steven-guarino-gallery";
  const settings = Object.assign(
    { quality: "auto", reduceMotion: false, volume: 0.8, muted: false, sensitivity: 1 },
    (() => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } })(),
  );
  if (matchMedia("(prefers-reduced-motion: reduce)").matches && !("reduceMotion" in ((() => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } })()))) settings.reduceMotion = true;
  function saveSettings() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch { /* private mode: settings last this visit only */ }
  }

  // ---------- Quality ----------
  // Auto picks a tier from the device; Low/Medium/High override it. The tier
  // sets render resolution, shadows, how much grass and how many particles a
  // room makes, and how many rooms stay built at once.

  const TOUCH = matchMedia("(pointer: coarse)").matches;
  function autoQuality() {
    const mem = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 8;
    const small = Math.min(screen.width, screen.height) < 600;
    if (TOUCH) return small || mem < 6 || cores < 8 ? "low" : "medium";
    return mem <= 4 || cores <= 4 ? "medium" : "high";
  }
  const TIERS = {
    low: { dpr: 1, shadow: 0, density: 0.35, keep: 2, aniso: 2 },
    medium: { dpr: 1.35, shadow: 1024, density: 0.65, keep: 4, aniso: 4 },
    high: { dpr: 2, shadow: 2048, density: 1, keep: 9, aniso: 8 },
  };
  let tierName = settings.quality === "auto" ? autoQuality() : settings.quality;
  let Q = TIERS[tierName];
  const motion = () => (settings.reduceMotion ? 0.2 : 1);

  // ---------- Renderer and camera ----------

  const renderer = new THREE.WebGLRenderer({ antialias: tierName !== "low", stencil: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0e0f12);
  document.body.prepend(renderer.domElement);
  const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

  const clamp = THREE.MathUtils.clamp;
  const smooth = THREE.MathUtils.smoothstep;
  const lerp = THREE.MathUtils.lerp;
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 3000);
  camera.rotation.order = "YXZ";
  // On a tall phone screen, widen the view so you don't feel boxed in.
  function fitCamera() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? lerp(62, 80, clamp((1 - camera.aspect) / 0.55, 0, 1)) : 62;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    fitCamera();
  });

  // ---------- Small helpers ----------

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canvasTex(w, h, draw, { repeat = true, srgb = true } = {}) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(Q.aniso, MAX_ANISO);
    return t;
  }
  // Textures every room may use; never disposed with a room.
  const shared = (t) => { t.userData.shared = true; return t; };
  const scaleUV = (geo, su, sv) => {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return geo;
  };

  const glowTex = shared(canvasTex(256, 256, (g) => {
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }, { repeat: false }));
  const moonTex = shared(canvasTex(256, 256, (g) => {
    const face = g.createRadialGradient(110, 110, 10, 128, 128, 124);
    face.addColorStop(0, "#fbf8ee");
    face.addColorStop(1, "#d9d6cb");
    g.fillStyle = face;
    g.beginPath();
    g.arc(128, 128, 122, 0, Math.PI * 2);
    g.fill();
    const r = rng(3);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(150, 152, 165, ${0.12 + r() * 0.18})`;
      g.beginPath();
      g.arc(70 + r() * 120, 70 + r() * 120, 10 + r() * 26, 0, Math.PI * 2);
      g.fill();
    }
  }, { repeat: false }));

  // A sky dome that travels with you: a vertical gradient with a glow
  // round the sun or moon.
  function skyDome({ top, mid, low, sunDir, glow = [0.45, 0.5, 0.7], tight = 60, spread = 8, glowAmt = [0.4, 0.07] }) {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(top) },
          mid: { value: new THREE.Color(mid) },
          low: { value: new THREE.Color(low) },
          sun: { value: sunDir.clone().normalize() },
          glow: { value: new THREE.Color(...glow) },
          amt: { value: new THREE.Vector4(tight, spread, glowAmt[0], glowAmt[1]) },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 top, mid, low, sun, glow;
          uniform vec4 amt;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = max(d.y, 0.0);
            vec3 c = mix(low, mid, smoothstep(0.0, 0.28, h));
            c = mix(c, top, smoothstep(0.28, 0.85, h));
            float m = max(dot(d, sun), 0.0);
            c += glow * (pow(m, amt.x) * amt.z + pow(m, amt.y) * amt.w);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    dome.renderOrder = -2;
    dome.frustumCulled = false;
    return dome;
  }

  // ---------- The photographs ----------
  // Data comes from the site's photos.js. A photo is drawn unlit, unfogged
  // and untouched by tone mapping, so it shows exactly as shot.

  const PHOTOS = /*PHOTOS*/[];
  const PHOTO = Object.fromEntries(PHOTOS.map((p) => [p.stem, p]));
  const texLoader = new THREE.TextureLoader();
  const texCache = new Map();
  function photoTexture(stem, reg) {
    let e = texCache.get(stem);
    if (!e) {
      reg.pending++;
      const tex = texLoader.load(`img/${stem}.jpg`, () => { reg.pending--; e.ready = true; }, undefined, () => { reg.pending--; });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(Q.aniso, MAX_ANISO);
      shared(tex);
      e = { tex, refs: new Set(), ready: false };
      texCache.set(stem, e);
    }
    e.refs.add(reg.id);
    return e.tex;
  }
  function releaseTextures(id) {
    for (const [stem, e] of texCache) {
      e.refs.delete(id);
      if (!e.refs.size) { e.tex.dispose(); texCache.delete(stem); }
    }
  }

  // Labels in each room's own style: a gallery card, a burned wooden sign,
  // an enamel pool tile, a transit ad card, a film card.
  const LABEL_STYLES = {
    card: { bg: "#ece9e2", title: "#1c1c1f", text: "#56565c" },
    wood: { bg: "#5b4632", grain: true, title: "#f3e6c8", text: "#d8c49e" },
    tile: { bg: "#f2f6f7", border: "#1b3a5c", title: "#13314f", text: "#46637a" },
    ad: { bg: "#f6f4ee", stripe: "#d6402b", title: "#141414", text: "#5a5a5a" },
    film: { bg: "#100e0b", border: "#c9a463", title: "#f3d79c", text: "#b8a37b" },
    brass: { bg: "#1b1916", border: "#b8955a", title: "#ead9b0", text: "#b9a682" },
  };
  function drawLabel(g, W, H, lines, style) {
    const S = LABEL_STYLES[style];
    g.fillStyle = S.bg;
    g.fillRect(0, 0, W, H);
    if (S.grain) {
      const r = rng(lines[0].length * 7);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = `rgba(0, 0, 0, ${0.05 + r() * 0.1})`;
        g.fillRect(0, r() * H, W, 1 + r() * 3);
      }
      g.strokeStyle = "rgba(0, 0, 0, 0.45)";
      g.lineWidth = 8;
      g.strokeRect(4, 4, W - 8, H - 8);
    }
    if (S.border) { g.strokeStyle = S.border; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10); }
    if (S.stripe) { g.fillStyle = S.stripe; g.fillRect(0, 0, 18, H); }
    const x = S.stripe ? 52 : 40;
    g.fillStyle = S.title;
    const [title, ...rest] = lines;
    let size = 58;
    g.font = `500 ${size}px Poppins, system-ui, sans-serif`;
    while (g.measureText(title).width > W - x - 28 && size > 30) g.font = `500 ${(size -= 2)}px Poppins, system-ui, sans-serif`;
    g.fillText(title, x, H * 0.36);
    g.fillStyle = S.text;
    g.font = "400 30px Poppins, system-ui, sans-serif";
    rest.forEach((line, i) => g.fillText(line, x, H * 0.6 + i * 44));
  }
  const fontsReady = document.fonts.load("500 58px Poppins").catch(() => {});
  function labelLines(P) { return [P.title, `Steven Guarino, ${P.year}`, P.settings]; }
  // A label as a small panel: 32 by 16 cm unless told otherwise.
  function labelMesh(lines, style, width = 0.32) {
    const make = () => canvasTex(640, 320, (g, w, h) => drawLabel(g, w, h, lines, style), { repeat: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 2), new THREE.MeshBasicMaterial({ map: make(), toneMapped: false, fog: false }));
    fontsReady.then(() => { m.material.map.dispose(); m.material.map = make(); });
    return m;
  }

  // A photo with its frame and label, centred on its own origin, facing +z.
  function photoPiece(R, stem, { long = 1.4, frame = 0x0e0e10, border = 0.035, depth = 0.04, label = "card", labelSide = 1, labelDrop = null, labelWidth = 0.32, matte = null } = {}) {
    const P = PHOTO[stem];
    const w = P.w >= P.h ? long : (long * P.w) / P.h;
    const h = P.w >= P.h ? (long * P.h) / P.w : long;
    const g = new THREE.Group();
    if (matte) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w + matte.size * 2, h + matte.size * 2), new THREE.MeshLambertMaterial({ color: matte.color }));
      m.position.z = depth / 2 + 0.0005;
      g.add(m);
    }
    if (frame !== null) {
      const pad = border * 2 + (matte ? matte.size * 2 : 0);
      const f = new THREE.Mesh(new THREE.BoxGeometry(w + pad, h + pad, depth), mat(frame));
      g.add(f);
    }
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: photoTexture(stem, R.reg), toneMapped: false, fog: false }));
    pic.position.z = depth / 2 + 0.002;
    g.add(pic);
    if (label) {
      const lab = labelMesh(labelLines(P), label, labelWidth);
      const edge = w / 2 + border + (matte ? matte.size : 0);
      if (labelSide === 0) lab.position.set(0, -(h / 2 + border + labelWidth / 4 + 0.06), depth / 2 + 0.002);
      else lab.position.set(labelSide * (edge + 0.08 + labelWidth / 2), labelDrop ?? (-h / 2 + labelWidth / 4), depth / 2 + 0.002);
      g.add(lab);
    }
    R.reg.photos.push({ mesh: pic, photo: P, w, h });
    return g;
  }

  // ---------- Rooms and the lobby ----------

  const ROOMS = {}; // each room file adds its definition here
  const regions = {}; // live state for the lobby and every room
  let here = null; // the region you're in
  const doors = []; // the lobby's doorways, one per room

  // Around the octagonal lobby, clockwise from north. The south side is the
  // way you came in.
  const SLOTS = [
    { angle: 0, room: "gallery" },
    { angle: 45, room: "overlook" },
    { angle: 90, room: "pool" },
    { angle: 135, room: "drivein" },
    { angle: 180, entrance: true },
    { angle: 225, room: "subway" },
    { angle: 270, room: "moor" },
    { angle: 315, room: "nature" },
  ];

  const heading = (x, z) => Math.atan2(x, z);
  function makeRegion(id, def, pos, rot) {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return {
      id, def, pos, rot, ref: 0,
      loaded: false, pending: 0, scene: null, root: null, api: null, photos: [], lastHere: 0, audio: null,
      toWorld: (x, z) => ({ x: x * c + z * s + pos.x, z: -x * s + z * c + pos.z }),
      toLocal: (x, z) => { const dx = x - pos.x; const dz = z - pos.z; return { x: dx * c - dz * s, z: dx * s + dz * c }; },
      dirToWorld: (x, z) => ({ x: x * c + z * s, z: -x * s + z * c }),
    };
  }

  // Where each room goes: rotated and moved so its entrance sits at the end
  // of its vestibule, facing back down it.
  function placeRooms() {
    regions.lobby = makeRegion("lobby", ROOMS.lobby, new THREE.Vector3(), 0);
    regions.lobby.ref = 1;
    let ref = 2;
    for (const slot of SLOTS) {
      const a = THREE.MathUtils.degToRad(slot.angle);
      slot.dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      if (!slot.room || !ROOMS[slot.room]) continue;
      const def = ROOMS[slot.room];
      const at = slot.dir.clone().multiplyScalar(LOBBY.apothem + LOBBY.corridor);
      const e = def.entrance;
      const rot = heading(-slot.dir.x, -slot.dir.z) - heading(e.nx, e.nz);
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const pos = new THREE.Vector3(at.x - (e.x * c + e.z * s), 0, at.z - (-e.x * s + e.z * c));
      const reg = makeRegion(slot.room, def, pos, rot);
      reg.ref = ref++;
      reg.slot = slot;
      regions[slot.room] = reg;
      const door = {
        room: slot.room, slot, center: at, normal: slot.dir.clone(),
        tangent: new THREE.Vector3(slot.dir.z, 0, -slot.dir.x), half: DOOR_HALF, h: DOOR_H,
        box: new THREE.Box3(),
      };
      door.box.setFromCenterAndSize(new THREE.Vector3(at.x, DOOR_H / 2, at.z), new THREE.Vector3(Math.abs(door.tangent.x) * 1.6 + 0.4, DOOR_H, Math.abs(door.tangent.z) * 1.6 + 0.4));
      door.into = makePortal(door, 1, reg.ref);
      door.out = makePortal(door, -1, 1);
      door.clipInto = new THREE.Plane().setFromNormalAndCoplanarPoint(door.normal, at);
      door.clipIntoC = door.clipInto.constant;
      door.clipOut = new THREE.Plane().setFromNormalAndCoplanarPoint(door.normal.clone().negate(), at);
      reg.door = door;
      doors.push(door);
    }
  }

  // A doorway as a stencil window: a short open box behind the opening
  // marks the pixels where the far side shows (deep enough that it still
  // works as you step through), then the depth there is pushed back so the
  // far side draws as if the near side weren't there.
  function makePortal(door, sign, ref) {
    const scene = new THREE.Scene();
    const D = 0.8;
    const geo = new THREE.BoxGeometry(door.half * 2, door.h, D);
    geo.translate(0, door.h / 2, D / 2);
    const write = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide, stencilWrite: true, stencilRef: ref, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
    const none = new THREE.MeshBasicMaterial({ visible: false });
    const box = new THREE.Mesh(geo, [write, write, write, write, write, none]);
    box.position.copy(door.center);
    const n = door.normal.clone().multiplyScalar(sign);
    box.rotation.y = Math.atan2(n.x, n.z);
    const behind = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(0x0e0f12) } },
        vertexShader: "void main() { gl_Position = vec4(position.xy, 0.99999, 1.0); }",
        fragmentShader: `
          uniform vec3 color;
          void main() {
            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }`,
        depthFunc: THREE.AlwaysDepth,
        stencilWrite: true,
        stencilRef: ref,
        stencilFunc: THREE.EqualStencilFunc,
      }),
    );
    behind.frustumCulled = false;
    behind.renderOrder = 1;
    scene.add(box, behind);
    return { scene, box, behind };
  }

  // A room's materials draw either everywhere (you're in it) or only where
  // its stencil mark is (you're looking at it through a doorway). Seen
  // through a doorway, anything on your side of it is clipped away, apart
  // from soft things like mist that may as well carry on up to the door.
  // The planes stay attached to the materials and are switched off by
  // pushing them out of the way, so nothing has to recompile.
  const lobbyClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6);
  const KEEP_ALL = 1e6;
  function setThrough(reg, on) {
    if (!reg.loaded || reg.through === on) return;
    reg.through = on;
    const planes = reg === regions.lobby ? [lobbyClip] : reg.door ? [reg.door.clipInto] : null;
    reg.scene.traverse((o) => {
      if (!o.material) return;
      for (const m of [].concat(o.material)) {
        if (m.colorWrite === false && m.stencilFunc === THREE.AlwaysStencilFunc) continue;
        m.stencilWrite = on;
        m.stencilRef = reg.ref;
        m.stencilFunc = THREE.EqualStencilFunc;
        if (!m.userData.noClip && m.clippingPlanes !== planes) m.clippingPlanes = planes;
      }
    });
  }

  // The things a room's build gets to work with.
  function context(reg) {
    return {
      reg,
      scene: reg.scene,
      root: reg.root,
      Q,
      add: (...o) => reg.root.add(...o),
      density: (n) => Math.max(1, Math.round(n * Q.density)),
      shadows: (light, size = 40, far = 120) => {
        light.castShadow = Q.shadow > 0;
        if (!light.castShadow) return;
        light.shadow.mapSize.set(Q.shadow, Q.shadow);
        Object.assign(light.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 0.5, far });
        light.shadow.normalBias = 0.03;
      },
      // Where you are, in this room's own coordinates.
      get player() { return reg.toLocal(me.x, me.z); },
      // Carry you along with something that moves (a swinging train car).
      nudgePlayer(dx, dz, dyaw) {
        if (here !== reg) return;
        const w = reg.dirToWorld(dx, dz);
        me.x += w.x;
        me.z += w.z;
        me.yaw += dyaw;
      },
      get camLocal() {
        const l = reg.toLocal(camera.position.x, camera.position.z);
        return new THREE.Vector3(l.x, camera.position.y, l.z);
      },
      toWorld: reg.toWorld,
      photo: (stem, opts) => photoPiece(ctxCache.get(reg), stem, opts),
    };
  }
  const ctxCache = new Map();

  function buildRegion(reg) {
    const t0 = performance.now();
    reg.scene = new THREE.Scene();
    reg.root = new THREE.Group();
    reg.root.position.copy(reg.pos);
    reg.root.rotation.y = reg.rot;
    reg.scene.add(reg.root);
    reg.root.updateMatrixWorld(true);
    reg.photos = [];
    reg.pending = 0;
    reg.through = undefined;
    MATS = new Map();
    const R = context(reg);
    ctxCache.set(reg, R);
    reg.api = reg.def.build(R) || {};
    MATS = new Map();
    reg.api.walls ??= [];
    reg.api.blockers ??= [];
    reg.api.people ??= [];
    reg.loaded = true;
    for (const d of doors) if (d.room === reg.id) d.into.behind.material.uniforms.color.value.set(reg.def.fogColor ?? 0x0e0f12);
    if (reg.id === "lobby") for (const d of doors) d.out.behind.material.uniforms.color.value.set(0x0e0f12);
    setThrough(reg, reg !== here);
    if (audio) startRoomSound(reg);
    reg.builtMs = Math.round(performance.now() - t0);
  }

  function unloadRegion(reg) {
    if (!reg.loaded) return;
    stopRoomSound(reg);
    reg.scene.traverse((o) => {
      o.geometry?.dispose();
      if (!o.material) return;
      for (const m of [].concat(o.material)) {
        for (const v of Object.values(m)) if (v?.isTexture && !v.userData.shared) v.dispose();
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u.value?.isTexture && !u.value.userData.shared) u.value.dispose();
        m.dispose();
      }
    });
    reg.scene.traverse((o) => { if (o.isLight && o.shadow?.map) o.shadow.map.dispose(); });
    reg.scene.environment?.dispose();
    releaseTextures(reg.id);
    reg.loaded = false;
    reg.scene = null;
    reg.api = null;
    reg.photos = [];
  }

  // ---------- You ----------

  const me = { x: 0, z: -4, y: 0, yaw: Math.PI, pitch: 0, stride: 0, vy: 0 };
  let running = false; // false until you press Enter

  // What's in a room for you to bump into: its walls (as lines on the floor
  // plan), round blockers, its people, and, in the lobby, any doorway whose
  // room isn't built yet.
  function collide(p, r, reg, people = true) {
    const local = reg.toLocal(p.x, p.z);
    const api = reg.api;
    const pad = r;
    for (let pass = 0; pass < 2; pass++) {
      for (const b of api.blockers) {
        const dx = local.x - b.x;
        const dz = local.z - b.z;
        const d = Math.hypot(dx, dz);
        if (d < b.r + pad && d > 1e-6) { local.x = b.x + (dx / d) * (b.r + pad); local.z = b.z + (dz / d) * (b.r + pad); }
      }
      const lines = reg.id === "lobby" ? api.walls.concat(api.barriers?.() ?? []) : api.walls;
      for (const [x0, z0, x1, z1] of lines) {
        const dx = x1 - x0;
        const dz = z1 - z0;
        const k = clamp(((local.x - x0) * dx + (local.z - z0) * dz) / (dx * dx + dz * dz), 0, 1);
        const ox = local.x - (x0 + dx * k);
        const oz = local.z - (z0 + dz * k);
        const d = Math.hypot(ox, oz);
        if (d < pad + 0.2 && d > 1e-6) { local.x += (ox / d) * (pad + 0.2 - d); local.z += (oz / d) * (pad + 0.2 - d); }
      }
    }
    const w = reg.toWorld(local.x, local.z);
    p.x = w.x;
    p.z = w.z;
  }

  // Walking into people nudges them aside; they stay where they end up and
  // turn back to whatever they were looking at.
  function shove(reg) {
    const people = reg.api.people;
    if (!people.length || reg.api.noShove) return false;
    const mine = reg.toLocal(me.x, me.z);
    let pushing = false;
    for (const f of people) {
      const p = f.fig.root.position;
      let dx = p.x - mine.x;
      let dz = p.z - mine.z;
      let d = Math.hypot(dx, dz);
      if (d >= PERSON + BODY) continue;
      if (d < 1e-6) { dx = 1; dz = 0; d = 1; }
      const k = (PERSON + BODY - d) / d;
      p.x += dx * k;
      p.z += dz * k;
      f.bump = Math.min(1, (f.bump || 0) + 0.15);
      pushing = true;
    }
    if (!pushing) return false;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < people.length; i++) {
        for (let j = i + 1; j < people.length; j++) {
          const a = people[i].fig.root.position;
          const b = people[j].fig.root.position;
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const d = Math.hypot(dx, dz);
          if (d >= PERSON * 2 || d < 1e-6) continue;
          const k = (PERSON * 2 - d) / d / 2;
          a.x -= dx * k; a.z -= dz * k;
          b.x += dx * k; b.z += dz * k;
        }
      }
      for (const f of people) {
        // Keep them inside the room: test against the walls as if they were
        // you, in world space.
        const w = reg.toWorld(f.fig.root.position.x, f.fig.root.position.z);
        collide(w, PERSON - 0.2, reg, false);
        const l = reg.toLocal(w.x, w.z);
        f.fig.root.position.x = l.x;
        f.fig.root.position.z = l.z;
      }
    }
    // Someone pinned against a wall doesn't give way.
    for (const f of people) {
      const p = f.fig.root.position;
      const dx = mine.x - p.x;
      const dz = mine.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < PERSON + BODY && d > 1e-6) { mine.x = p.x + (dx / d) * (PERSON + BODY); mine.z = p.z + (dz / d) * (PERSON + BODY); }
    }
    const w = reg.toWorld(mine.x, mine.z);
    me.x = w.x;
    me.z = w.z;
    return true;
  }

  // Which doorway's vestibule you're in, and how far along it (0 at the
  // lobby, 1 at the room).
  function corridorInfo() {
    if (here !== regions.lobby) return null;
    for (const slot of SLOTS) {
      const along = me.x * slot.dir.x + me.z * slot.dir.z;
      const across = me.x * slot.dir.z - me.z * slot.dir.x;
      if (along > LOBBY.apothem - 0.4 && Math.abs(across) < LOBBY.corridorHalf + 0.2) {
        return { slot, room: slot.room, progress: clamp((along - LOBBY.apothem) / LOBBY.corridor, 0, 1) };
      }
    }
    return null;
  }

  function enter(reg, { quiet = false } = {}) {
    const prev = here;
    here = reg;
    for (const d of doors) d.clipInto.constant = d.clipIntoC;
    if (reg === regions.lobby) lobbyClip.set(new THREE.Vector3(0, 1, 0), KEEP_ALL);
    else {
      reg.door.clipInto.constant = KEEP_ALL;
      lobbyClip.copy(reg.door.clipOut);
    }
    reg.lastHere = performance.now();
    if (prev && prev !== reg) setThrough(prev, true);
    setThrough(reg, false);
    for (const r of Object.values(regions)) if (r !== reg && r.loaded) setThrough(r, true);
    if (!quiet && reg.def.name) toast(reg.def.name, reg.def.tagline);
    roomActionBtn.hidden = !reg.api?.action;
    if (reg.api?.action) roomActionBtn.textContent = reg.api.action.label;
    renderRoomList();
  }

  // Crossing a doorway's plane through its opening moves you between the
  // lobby and the room.
  function crossDoors(prev) {
    const lobby = regions.lobby;
    const check = (door, sign) => {
      const s0 = (prev.x - door.center.x) * door.normal.x + (prev.z - door.center.z) * door.normal.z;
      const s1 = (me.x - door.center.x) * door.normal.x + (me.z - door.center.z) * door.normal.z;
      const lat = (me.x - door.center.x) * door.tangent.x + (me.z - door.center.z) * door.tangent.z;
      return Math.abs(lat) < door.half && (sign > 0 ? s0 < 0 && s1 >= 0 : s0 > 0 && s1 <= 0);
    };
    if (here === lobby) {
      for (const door of doors) if (regions[door.room].loaded && check(door, 1)) return enter(regions[door.room]);
    } else if (here.door && check(here.door, -1)) {
      enter(lobby);
    }
  }

  // ---------- Input ----------

  const held = new Set();
  const KEYS = { KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r", KeyQ: "tl", KeyE: "tr" };
  const stickVec = { x: 0, y: 0 };
  let menuOpen = false;
  let viewerOpen = false;
  let moved = false;

  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, select, textarea")) return;
    if (e.code === "Escape") {
      if (viewerOpen) closeViewer();
      else if (running) toggleMenu();
      return;
    }
    if (!running || menuOpen) return;
    if (viewerOpen) {
      if (e.code === "KeyF" || e.code === "Enter" || e.code === "Space") closeViewer();
      return;
    }
    if (KEYS[e.code]) { held.add(KEYS[e.code]); e.preventDefault(); }
    if (e.key === "Shift") held.add("run");
    if (e.code === "KeyF" || e.code === "Enter") { if (focusPhoto) openViewer(focusPhoto.photo); }
    if (e.code === "KeyH") goTo("lobby");
    if (e.code === "KeyM") {
      settings.reduceMotion = !settings.reduceMotion;
      saveSettings();
      syncMenu();
      toast(settings.reduceMotion ? "Reduced motion" : "Full motion", settings.reduceMotion ? "Less sway and bob" : "Sway and bob back on");
    }
    here?.api?.onKey?.(e.code);
  });
  addEventListener("keyup", (e) => {
    if (KEYS[e.code]) held.delete(KEYS[e.code]);
    if (e.key === "Shift") held.delete("run");
  });
  addEventListener("blur", () => held.clear());

  // Mouse: click to capture it and look freely; if the browser won't let
  // the page capture the mouse, drag to look instead.
  const canvas = renderer.domElement;
  let locked = false;
  // The viewer's frame may refuse to capture the mouse; then you drag to look.
  function capture() {
    try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* drag to look instead */ }
  }
  canvas.addEventListener("click", () => {
    if (!running || menuOpen || viewerOpen || TOUCH) return;
    if (!locked) capture();
  });
  document.addEventListener("pointerlockchange", () => {
    const was = locked;
    locked = document.pointerLockElement === canvas;
    crosshair.hidden = !locked;
    hint.hidden = locked || TOUCH || moved;
    // Esc releases the mouse; treat that as asking for the menu.
    if (was && !locked && running && !viewerOpen && !menuOpen && !releasing) toggleMenu(true);
    releasing = false;
  });
  let releasing = false;
  const release = () => { if (locked) { releasing = true; document.exitPointerLock(); } };
  addEventListener("mousemove", (e) => {
    if (!locked) return;
    const k = 0.0022 * settings.sensitivity;
    me.yaw -= e.movementX * k;
    me.pitch = clamp(me.pitch - e.movementY * k, -1.35, 1.35);
  });

  // Dragging looks around (touch everywhere but the joystick; mouse when
  // it isn't captured).
  let look = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!running || locked) return;
    look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!look || e.pointerId !== look.id) return;
    const k = (e.pointerType === "touch" ? 0.0055 : 0.004) * settings.sensitivity;
    me.yaw -= (e.clientX - look.x) * k;
    me.pitch = clamp(me.pitch - (e.clientY - look.y) * k, -1.35, 1.35);
    look.x = e.clientX;
    look.y = e.clientY;
  });
  const endLook = (e) => { if (look && e.pointerId === look.id) look = null; };
  canvas.addEventListener("pointerup", endLook);
  canvas.addEventListener("pointercancel", endLook);

  // The touch joystick.
  const stick = document.getElementById("stick");
  const knob = stick.querySelector(".knob");
  let stickId = null;
  const stickMove = (e) => {
    const r = stick.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2);
    let y = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 10;
    const d = Math.hypot(x, y);
    if (d > max) { x *= max / d; y *= max / d; }
    knob.style.transform = `translate(${x}px, ${y}px)`;
    stickVec.x = x / max;
    stickVec.y = -y / max;
  };
  stick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stickMove(e);
  });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) stickMove(e); });
  const stickEnd = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    stickVec.x = stickVec.y = 0;
    knob.style.transform = "";
  };
  stick.addEventListener("pointerup", stickEnd);
  stick.addEventListener("pointercancel", stickEnd);

  // ---------- Walking ----------

  function walk(dt) {
    const reg = here;
    if (!reg?.loaded) return;
    me.yaw += ((held.has("tl") ? 1 : 0) - (held.has("tr") ? 1 : 0)) * 1.8 * dt;
    let mx = (held.has("r") ? 1 : 0) - (held.has("l") ? 1 : 0) + stickVec.x;
    let mz = (held.has("f") ? 1 : 0) - (held.has("b") ? 1 : 0) + stickVec.y;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const prev = { x: me.x, z: me.z };
    if (len > 0.05) {
      moved = true;
      hint.hidden = true;
      const pushing = shove(reg);
      const speed = WALK * (held.has("run") ? 2 : 1) * (pushing ? 0.6 : 1) * (reg.api.pace?.(reg.toLocal(me.x, me.z)) ?? 1);
      const sin = Math.sin(me.yaw);
      const cos = Math.cos(me.yaw);
      const dx = (mx * cos - mz * sin) * speed * dt;
      const dz = (-mx * sin - mz * cos) * speed * dt;
      // In small steps, so a slow frame can't carry you through a wall.
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
      for (let i = 0; i < n; i++) {
        const before = { x: me.x, z: me.z };
        me.x += dx / n;
        me.z += dz / n;
        collide(me, BODY, here);
        crossDoors(before);
      }
      const stepBefore = Math.floor(me.stride / 0.9);
      me.stride += Math.min(1, len) * speed * dt;
      if (Math.floor(me.stride / 0.9) !== stepBefore) footstep();
    }
    const l = here.toLocal(me.x, me.z);
    const floor = here.api.floor ? here.api.floor(l.x, l.z) : 0;
    me.y += (floor - me.y) * Math.min(1, dt * 9);
  }

  function placeCamera(t) {
    const m = motion();
    const bob = Math.sin(me.stride * 5.5) * 0.018 * m;
    const fx = here?.api?.cameraFx?.(t) ?? null;
    camera.position.set(me.x + (fx?.x ?? 0) * m, me.y + EYE + bob + (fx?.y ?? 0) * m, me.z);
    camera.rotation.set(me.pitch, me.yaw, (fx?.roll ?? 0) * m);
    camera.updateMatrixWorld();
  }

  // Teleport: a quick fade, and you're at a room's best viewing spot.
  const fadeEl = document.getElementById("fade");
  async function goTo(id, spotName = "spawn") {
    const reg = regions[id];
    if (!reg) return;
    fadeEl.classList.add("is-on");
    await new Promise((r) => setTimeout(r, 270));
    if (!reg.loaded) {
      showLoading(reg.def.name);
      await new Promise((r) => setTimeout(r, 30));
      buildRegion(reg);
    }
    const spot = reg.def.spots?.[spotName] ?? reg.def.spawn;
    const w = reg.toWorld(spot.x, spot.z);
    me.x = w.x;
    me.z = w.z;
    me.yaw = spot.yaw + reg.rot;
    me.pitch = spot.pitch ?? 0;
    const l = reg.toLocal(me.x, me.z);
    me.y = reg.api.floor ? reg.api.floor(l.x, l.z) : 0;
    enter(reg);
    setTimeout(() => fadeEl.classList.remove("is-on"), 120);
  }

  // ---------- Building and taking down rooms ----------
  // Wanted: the room you're in, the room whose vestibule you're in, and on
  // better devices the rooms whose doors are nearest you in the lobby, so
  // they show through their doorways. Others come down after a while.

  let lastLoadCheck = 0;
  function manageRooms(now) {
    if (now - lastLoadCheck < 400) return;
    lastLoadCheck = now;
    const want = [];
    if (here && here !== regions.lobby) want.push(here.id);
    const cor = corridorInfo();
    if (cor?.room && regions[cor.room]) want.push(cor.room);
    if (here === regions.lobby) {
      const byDistance = doors.map((d) => ({ id: d.room, d: Math.hypot(me.x - d.center.x, me.z - d.center.z) })).sort((a, b) => a.d - b.d);
      for (const { id } of byDistance) if (want.length < Q.keep && !want.includes(id)) want.push(id);
    }
    const missing = want.find((id) => !regions[id].loaded);
    if (missing) {
      const reg = regions[missing];
      showLoading(reg.def.name);
      setTimeout(() => { if (!reg.loaded) buildRegion(reg); }, 30);
      return;
    }
    const loaded = Object.values(regions).filter((r) => r.loaded && r.id !== "lobby");
    if (loaded.length > Q.keep) {
      const spare = loaded.filter((r) => !want.includes(r.id)).sort((a, b) => a.lastHere - b.lastHere);
      for (const r of spare.slice(0, loaded.length - Q.keep)) unloadRegion(r);
    }
    const busy = Object.values(regions).find((r) => r.loaded && r.pending > 0 && (r === here || want.includes(r.id)));
    if (!busy) hideLoading();
    else showLoading(busy.def.name);
  }

  // ---------- Drawing ----------

  const frustum = new THREE.Frustum();
  const viewProj = new THREE.Matrix4();
  function inView(box) {
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProj);
    return frustum.intersectsBox(box);
  }
  renderer.info.autoReset = false;
  function draw() {
    renderer.info.reset();
    renderer.clear();
    const lobby = regions.lobby;
    renderer.render(here.scene, camera);
    if (here === lobby) {
      for (const door of doors) {
        const room = regions[door.room];
        if (!room.loaded || !inView(door.box)) continue;
        const near = Math.abs((camera.position.x - door.center.x) * door.normal.x + (camera.position.z - door.center.z) * door.normal.z);
        door.into.box.scale.z = near < 1 ? 1 : 0.02;
        renderer.render(door.into.scene, camera);
        renderer.render(room.scene, camera);
      }
    } else if (here.door && inView(here.door.box)) {
      const door = here.door;
      const near = Math.abs((camera.position.x - door.center.x) * door.normal.x + (camera.position.z - door.center.z) * door.normal.z);
      door.out.box.scale.z = near < 1 ? 1 : 0.02;
      renderer.render(door.out.scene, camera);
      renderer.render(lobby.scene, camera);
    }
  }
  function visibleNow(reg) {
    if (reg === here) return true;
    if (here === regions.lobby) return reg.door && inView(reg.door.box);
    return reg === regions.lobby && here.door && inView(here.door.box);
  }

  // ---------- The people in a room: breathing, glancing, settling ----------

  function animatePeople(reg, t, dt) {
    const still = settings.reduceMotion;
    for (const f of reg.api.people) {
      const fig = f.fig;
      if (f.focus) {
        const p = fig.root.position;
        const want = Math.atan2(f.focus.x - p.x, f.focus.z - p.z) + (f.lean ?? 0);
        const turn = Math.atan2(Math.sin(want - fig.root.rotation.y), Math.cos(want - fig.root.rotation.y));
        fig.root.rotation.y += turn * Math.min(1, dt * 5);
      }
      f.bump = (f.bump || 0) * Math.exp(-dt * 2.5);
      const sb = fig.J.spine.userData.base;
      fig.J.spine.rotation.set(sb[0], sb[1], sb[2] + (still ? 0 : Math.sin(t * 13 + (f.phase ?? 0)) * 0.1 * f.bump), "ZXY");
      if (still || f.frozen) continue;
      const breathe = Math.sin(t * 1.6 + (f.phase ?? 0));
      const drift = Math.sin(t * 0.4 + (f.phase ?? 0)) + 0.5 * Math.sin(t * 0.23 + (f.phase ?? 0) * 2);
      for (const name of IDLE) {
        const [x, y, z] = fig.J[name].userData.base;
        const k = name === "chest" ? 0.018 : 0.03;
        fig.J[name].rotation.set(x + breathe * k, y + drift * (f.glance ?? 0.07), z, "ZXY");
      }
    }
  }

  // Put someone in a room, posed and facing what they're looking at.
  function placePerson(R, look, at, poseName, focus, { lean = 0, phase = Math.random() * 10, glance = 0.07, bake: doBake = true } = {}) {
    const fig = person(look);
    fig.root.position.set(at.x, at.y ?? 0, at.z);
    if (focus) fig.root.rotation.y = Math.atan2(focus.x - at.x, focus.z - at.z) + lean;
    R.add(fig.root);
    pose(fig, typeof poseName === "string" ? POSES.find((q) => q.name === poseName) : poseName);
    if (doBake) bake(fig);
    fig.root.traverse((o) => { if (o.isMesh) o.castShadow = Q.shadow > 0; });
    const entry = { fig, focus, lean, phase, glance, bump: 0 };
    R.reg.people ??= [];
    return entry;
  }

  // ---------- Sound ----------
  // One context, one master volume and limiter. Each room has its own bus;
  // its level follows where you are, so rooms crossfade through their
  // vestibules and leak a little through their doors.

  let audio = null;
  function startAudio() {
    if (audio) return audio.ctx.resume();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.knee.value = 10;
    limiter.ratio.value = 4;
    master.connect(limiter).connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    noise.getChannelData(0).forEach((_, i, d) => (d[i] = Math.random() * 2 - 1));
    audio = { ctx, master, noise };
    applyVolume();
    for (const reg of Object.values(regions)) if (reg.loaded) startRoomSound(reg);
    setInterval(() => {
      if (audio.ctx.state !== "running") return;
      const until = audio.ctx.currentTime + 1;
      for (const reg of Object.values(regions)) reg.audio?.extras.forEach((x) => x(until));
    }, 250);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) audio.ctx.suspend();
      else if (running) audio.ctx.resume();
    });
    return ctx.resume();
  }
  function applyVolume() {
    if (!audio) return;
    audio.master.gain.setTargetAtTime(settings.muted ? 0 : settings.volume, audio.ctx.currentTime, 0.1);
    muteBtn.querySelector(".wave").toggleAttribute("hidden", settings.muted);
    muteBtn.querySelector(".cross").toggleAttribute("hidden", !settings.muted);
  }

  // Footsteps, soft, in whatever's underfoot: [band, sharpness, level].
  const STEPS = { wood: [650, 1.3, 0.05], grass: [2600, 0.7, 0.028], concrete: [1500, 1, 0.04], gravel: [3300, 0.6, 0.045], tile: [1800, 1.6, 0.035], floor: [900, 1, 0.035] };
  function footstep() {
    if (!audio || audio.ctx.state !== "running" || !here?.api) return;
    const l = here.toLocal(me.x, me.z);
    const S = STEPS[here.api.ground?.(l.x, l.z) ?? here.def.ground ?? "wood"];
    const ctx = audio.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = audio.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = S[0] * (0.85 + Math.random() * 0.3);
    f.Q.value = S[1];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(S[2], t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    src.connect(f).connect(g).connect(audio.master);
    src.start(t, Math.random() * 1.5, 0.16);
  }

  // What a room's sound gets to work with.
  function soundKit(reg) {
    const { ctx, noise } = audio;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(audio.master);
    const chance = rng(reg.ref * 101);
    const nodes = [];
    const kit = {
      ctx, bus, chance, nodes, extras: [],
      hiss() {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        src.loopStart = chance() * 1.5;
        src.start(0, src.loopStart);
        nodes.push(src);
        return src;
      },
      osc(type, freq) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.start();
        nodes.push(o);
        return o;
      },
      gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; },
      filter(type, freq, q = 1) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; },
      // A source placed in the room, at local (x, y, z).
      placed(x, y, z, ref = 2, rolloff = 1.2) {
        const pan = ctx.createPanner();
        pan.panningModel = "HRTF";
        pan.distanceModel = "inverse";
        pan.refDistance = ref;
        pan.rolloffFactor = rolloff;
        const w = reg.toWorld(x, z);
        setXYZ(pan, "position", { x: w.x, y, z: w.z });
        pan.connect(bus);
        return pan;
      },
      move(pan, x, y, z) { const w = reg.toWorld(x, z); setXYZ(pan, "position", { x: w.x, y, z: w.z }); },
      stop() {
        for (const n of nodes) { try { n.stop(); } catch { /* already stopped */ } }
        bus.disconnect();
      },
    };
    return kit;
  }
  function setXYZ(node, name, v) {
    if (node[`${name}X`]) {
      node[`${name}X`].value = v.x;
      node[`${name}Y`].value = v.y;
      node[`${name}Z`].value = v.z;
    } else if (name === "position") node.setPosition(v.x, v.y, v.z);
  }
  function startRoomSound(reg) {
    if (!audio || reg.audio || !reg.def.sound) return;
    reg.audio = soundKit(reg);
    reg.audio.api = reg.def.sound(reg.audio, ctxCache.get(reg), reg.api) || {};
  }
  function stopRoomSound(reg) {
    if (!reg.audio) return;
    reg.audio.stop();
    reg.audio = null;
  }

  const facing = new THREE.Vector3();
  function mixSound(t, dt) {
    if (!audio || audio.ctx.state !== "running") return;
    const L = audio.ctx.listener;
    setXYZ(L, "position", camera.position);
    camera.getWorldDirection(facing);
    if (L.forwardX) { setXYZ(L, "forward", facing); setXYZ(L, "up", { x: 0, y: 1, z: 0 }); }
    else L.setOrientation(facing.x, facing.y, facing.z, 0, 1, 0);
    const now = audio.ctx.currentTime;
    const cor = corridorInfo();
    for (const reg of Object.values(regions)) {
      if (!reg.audio) continue;
      let w = 0;
      if (reg === here) {
        w = 1;
        if (reg === regions.lobby && cor?.room) w = 1 - 0.75 * smooth(cor.progress, 0.1, 1);
        if (reg !== regions.lobby && reg.door) {
          // Near the way out, the lobby's hush comes back in a little.
          const d = Math.hypot(me.x - reg.door.center.x, me.z - reg.door.center.z);
          w = 1 - 0.2 * (1 - smooth(d, 0, 4));
        }
      } else if (here === regions.lobby && reg.door) {
        const d = Math.hypot(me.x - reg.door.center.x, me.z - reg.door.center.z);
        w = cor?.room === reg.id ? 0.15 + 0.75 * smooth(cor.progress, 0.05, 1) : 0.1 * (1 - smooth(d, 3, 12));
      } else if (reg === regions.lobby && here.door) {
        const d = Math.hypot(me.x - here.door.center.x, me.z - here.door.center.z);
        w = 0.35 * (1 - smooth(d, 0, 5));
      }
      reg.audio.bus.gain.setTargetAtTime(w * (reg.def.loudness ?? 1), now, 0.3);
      reg.audio.api.update?.(t, dt, w);
    }
  }

  // ---------- Interface ----------

  const $ = (id) => document.getElementById(id);
  const titleEl = $("title");
  const hudTop = $("hudTop");
  const hint = $("hint");
  const crosshair = $("crosshair");
  const muteBtn = $("muteBtn");
  const roomActionBtn = $("roomAction");
  const toastEl = $("toast");
  const loadingEl = $("loading");
  const photoCard = $("photoCard");
  const menuEl = $("menu");
  const viewer = $("viewer");

  let toastTimer = 0;
  function toast(title, line = "") {
    toastEl.querySelector("b").textContent = title;
    toastEl.querySelector("span").textContent = line;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2600);
  }
  function showLoading(name) { loadingEl.textContent = `Loading ${name}`; loadingEl.hidden = false; }
  function hideLoading() { loadingEl.hidden = true; }

  $("tierNote").textContent = `Quality: ${settings.quality === "auto" ? `Auto (${tierName})` : tierName}. Change it any time in settings.`;

  $("enter").addEventListener("click", async () => {
    titleEl.classList.add("is-leaving");
    setTimeout(() => (titleEl.hidden = true), 650);
    hudTop.hidden = false;
    if (TOUCH) stick.hidden = false;
    else {
      hint.hidden = false;
      hint.textContent = "Click or drag to look around · W A S D to walk · Shift to hurry · F to view a photo · Esc for settings";
    }
    running = true;
    startAudio();
    if (!TOUCH) capture();
    toast(regions.lobby.def.name, regions.lobby.def.tagline);
  });

  $("homeBtn").addEventListener("click", () => goTo("lobby"));
  muteBtn.addEventListener("click", () => {
    settings.muted = !settings.muted;
    saveSettings();
    if (!settings.muted) startAudio();
    applyVolume();
    syncMenu();
  });
  roomActionBtn.addEventListener("click", () => here?.api?.action?.run());
  $("gearBtn").addEventListener("click", () => toggleMenu(true));
  $("menuClose").addEventListener("click", () => toggleMenu(false));
  $("resume").addEventListener("click", () => {
    toggleMenu(false);
    if (!TOUCH) capture();
  });
  menuEl.addEventListener("click", (e) => { if (e.target === menuEl) toggleMenu(false); });

  function toggleMenu(open = !menuOpen) {
    menuOpen = open;
    menuEl.hidden = !open;
    if (open) { release(); held.clear(); syncMenu(); }
  }

  for (const b of $("qualitySeg").querySelectorAll("button")) {
    b.addEventListener("click", () => {
      settings.quality = b.dataset.q;
      saveSettings();
      setQuality(settings.quality === "auto" ? autoQuality() : settings.quality);
      syncMenu();
    });
  }
  $("motionToggle").addEventListener("click", () => {
    settings.reduceMotion = !settings.reduceMotion;
    saveSettings();
    syncMenu();
  });
  $("muteToggle").addEventListener("click", () => muteBtn.click());
  $("volume").addEventListener("input", (e) => {
    settings.volume = e.target.value / 100;
    settings.muted = false;
    saveSettings();
    startAudio();
    applyVolume();
    syncMenu();
  });
  $("sensitivity").addEventListener("input", (e) => {
    settings.sensitivity = e.target.value / 100;
    saveSettings();
  });

  function syncMenu() {
    for (const b of $("qualitySeg").querySelectorAll("button")) b.classList.toggle("is-on", b.dataset.q === settings.quality);
    $("qualityNote").textContent = settings.quality === "auto" ? `Auto picked ${tierName} for this device.` : `${tierName[0].toUpperCase() + tierName.slice(1)} on this device.`;
    $("motionToggle").setAttribute("aria-pressed", String(settings.reduceMotion));
    $("muteToggle").setAttribute("aria-pressed", String(settings.muted));
    $("volume").value = Math.round(settings.volume * 100);
    $("sensitivity").value = Math.round(settings.sensitivity * 100);
    renderRoomList();
  }
  function renderRoomList() {
    const list = $("roomList");
    const items = [["lobby", "spawn", regions.lobby?.def]];
    for (const slot of SLOTS) if (slot.room && regions[slot.room]) {
      items.push([slot.room, "spawn", regions[slot.room].def]);
      for (const [spot, s] of Object.entries(regions[slot.room].def.spots ?? {})) items.push([slot.room, spot, { name: s.name, color: regions[slot.room].def.color }]);
    }
    list.replaceChildren(...items.filter(([, , def]) => def).map(([id, spot, def]) => {
      const b = document.createElement("button");
      const dot = document.createElement("i");
      dot.style.background = `#${new THREE.Color(def.color ?? 0xe7c27d).getHexString()}`;
      b.append(dot, def.name);
      if (here?.id === id && spot === "spawn") b.classList.add("is-here");
      b.addEventListener("click", () => { toggleMenu(false); goTo(id, spot); });
      return b;
    }));
  }

  // Changing quality: new resolution and shadows at once, and every built
  // room is rebuilt so its grass and particles match.
  function setQuality(name) {
    tierName = name;
    Q = TIERS[name];
    renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
    renderer.setSize(innerWidth, innerHeight);
    const keep = here;
    for (const reg of Object.values(regions)) if (reg.loaded) { unloadRegion(reg); buildRegion(reg); }
    enter(keep, { quiet: true });
  }

  // The photo card, when you stop in front of one, and the full-screen view.
  let focusPhoto = null;
  let cardCheck = 0;
  const tmpV = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  function findPhoto() {
    let best = null;
    let bestD = Infinity;
    camera.getWorldDirection(camDir);
    for (const reg of [here]) {
      for (const p of reg.photos) {
        if (!p.mesh.visible) continue;
        p.mesh.getWorldPosition(tmpV);
        tmpN.set(0, 0, 1).transformDirection(p.mesh.matrixWorld);
        const dx = camera.position.x - tmpV.x;
        const dy = camera.position.y - tmpV.y;
        const dz = camera.position.z - tmpV.z;
        const d = Math.hypot(dx, dy, dz);
        const reach = Math.max(3, Math.max(p.w, p.h) * 2.4);
        if (d > reach || (dx * tmpN.x + dy * tmpN.y + dz * tmpN.z) / d < 0.25) continue;
        const ang = -(dx * camDir.x + dy * camDir.y + dz * camDir.z) / d;
        if (ang < Math.cos(THREE.MathUtils.degToRad(24 + Math.max(p.w, p.h) * 4 / d))) continue;
        if (d < bestD) { best = p; bestD = d; }
      }
    }
    return best;
  }
  let shownPhoto = null;
  function showCard(p) {
    if (p === focusPhoto && p?.photo === shownPhoto) return;
    focusPhoto = p;
    shownPhoto = p?.photo ?? null;
    photoCard.hidden = !p;
    if (!p) return;
    const P = p.photo;
    photoCard.querySelector("h2").textContent = P.title;
    photoCard.querySelector(".by").textContent = `Steven Guarino · ${P.category} · ${P.year}`;
    photoCard.querySelector(".settings").textContent = P.settings;
    const cap = photoCard.querySelector(".caption");
    cap.textContent = P.caption || "";
    cap.hidden = !P.caption;
  }
  photoCard.addEventListener("click", () => { if (focusPhoto) openViewer(focusPhoto.photo); });

  function openViewer(P) {
    viewerOpen = true;
    release();
    held.clear();
    const img = $("viewerImg");
    img.src = `full/${P.stem}.jpg`;
    img.alt = P.alt || P.title;
    viewer.querySelector("b").textContent = P.title;
    viewer.querySelector(".viewer-cap span").textContent = `Steven Guarino · ${P.settings}${P.caption ? ` · ${P.caption}` : ""}`;
    viewer.hidden = false;
  }
  function closeViewer() {
    viewerOpen = false;
    viewer.hidden = true;
    if (!TOUCH) capture();
  }
  viewer.addEventListener("click", closeViewer);

  // ---------- The loop ----------

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    if (running && !menuOpen && !viewerOpen) walk(dt);
    placeCamera(t);
    const cor = corridorInfo();
    for (const reg of Object.values(regions)) {
      if (!reg.loaded || !visibleNow(reg)) continue;
      reg.api.update?.(t, dt, { cor, here: reg === here });
      animatePeople(reg, t, dt);
    }
    if (++cardCheck % 5 === 0) showCard(running && !menuOpen && !viewerOpen ? findPhoto() : null);
    mixSound(t, dt);
    draw();
    manageRooms(performance.now());
  }
