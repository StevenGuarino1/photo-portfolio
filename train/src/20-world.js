// ---------- Outside ----------
// The train stands still and the world runs past it: the snowfield and the
// track bed scroll, the trees, poles and the odd lit cabin go by in chunks
// that wrap round, the mountains slide slowly, and the snow streaks back
// past the windows. The sky (aurora, stars, moon) goes wherever you go, as
// far off as the real thing.
let scroll = 0; // metres travelled
const MOON_DIR = new THREE.Vector3(0.78, 0.55, 0.3).normalize(); // up toward the moon, off the right-hand side

const skyGroup = new THREE.Group();
scene.add(skyGroup);
const skyMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vDir;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
    }
    void main() {
      float y = vDir.y;
      vec3 c = mix(vec3(0.05, 0.075, 0.14), vec3(0.008, 0.014, 0.04), pow(clamp(y, 0.0, 1.0), 0.45));
      if (y < 0.0) c = vec3(0.04, 0.05, 0.08);
      // The aurora: curtains hanging in a band that wanders across the sky.
      float az = atan(vDir.x, vDir.z);
      float mid = 0.38 + 0.1 * sin(az * 1.7 + uTime * 0.03);
      float band = exp(-pow((y - mid) / 0.17, 2.0)) * smoothstep(0.02, 0.2, y);
      float cur = noise(vec2(az * 6.0 + uTime * 0.05, uTime * 0.04)) * 0.65 + noise(vec2(az * 26.0 - uTime * 0.12, 3.1)) * 0.35;
      cur = smoothstep(0.38, 0.95, cur);
      float rays = 0.6 + 0.4 * noise(vec2(az * 60.0, y * 3.0 - uTime * 0.2));
      vec3 aur = mix(vec3(0.12, 0.95, 0.55), vec3(0.45, 0.3, 0.95), smoothstep(mid - 0.05, mid + 0.22, y));
      c += aur * band * cur * rays * 0.42;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});
{
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), skyMat);
  dome.renderOrder = -3;
  const N = 2600;
  const sp = new Float32Array(N * 3);
  const sc = new Float32Array(N * 3);
  const r = rng(71);
  for (let i = 0; i < N; i++) {
    const y = 0.02 + r() * 0.98;
    const a = r() * Math.PI * 2;
    const h = Math.sqrt(1 - y * y);
    sp.set([Math.cos(a) * h * 900, y * 900, Math.sin(a) * h * 900], i * 3);
    const k = r() < 0.1 ? 1 : 0.3 + r() * 0.4;
    sc.set([0.8 * k, 0.86 * k, k], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sg.setAttribute("color", new THREE.BufferAttribute(sc, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  stars.renderOrder = -2;
  const moonTex = pixelTex(16, 16, (g) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d <= 7) px(g, d > 6 ? "#b9c3e6" : (x * 3 + y * 5) % 13 === 0 ? "#c4cdeb" : "#eef1fc", x, y);
    }
  }, { repeat: false });
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, alphaTest: 0.5, fog: false, depthWrite: false }));
  moon.position.copy(MOON_DIR).multiplyScalar(850);
  moon.lookAt(0, 0, 0);
  moon.renderOrder = -2;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0x6070a0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.copy(MOON_DIR).multiplyScalar(860);
  halo.scale.setScalar(260);
  halo.renderOrder = -2;
  skyGroup.add(dome, stars, moon, halo);
}

// The ground: a snowfield and the track bed, scrolled under the train.
const GROUND_Y = -1.3;
const outside = new THREE.Group();
scene.add(outside);
const snowTex = T.snow.clone();
snowTex.repeat.set(300, 300); // 8 m tiles
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshBasicMaterial({ map: snowTex, color: 0x4c5874 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
const trackTex = T.track.clone();
trackTex.repeat.set(1, 600); // 4 m tiles
const trackBed = new THREE.Mesh(new THREE.PlaneGeometry(4, 2400), new THREE.MeshBasicMaterial({ map: trackTex, color: 0x3c424e }));
trackBed.rotation.x = -Math.PI / 2;
trackBed.position.y = GROUND_Y + 0.03;
const rails = new THREE.Mesh(mergeGeometries([-0.72, 0.72].map((x) => box(0.08, 0.14, 2400).translate(x, GROUND_Y + 0.1, 0))), new THREE.MeshBasicMaterial({ color: 0x5a606c }));
outside.add(ground, trackBed, rails);

// Mountains far off either side.
const mountMats = [];
for (const s of [-1, 1]) {
  const t = T.mountains.clone();
  t.repeat.set(4, 1);
  const m = new THREE.MeshBasicMaterial({ map: t, color: 0x9aa8c8, transparent: true, alphaTest: 0.5, fog: false });
  mountMats.push(m);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4800, 190), m);
  mesh.position.set(s * 700, 70, 0);
  mesh.rotation.y = -s * Math.PI / 2;
  mesh.renderOrder = -1;
  outside.add(mesh);
}

// Scenery in chunks that wrap: pines, telegraph poles, now and then a cabin
// with its lights on.
const CHUNK = 220;
const CHUNKS = 4;
const pineMat = new THREE.MeshBasicMaterial({ map: T.pine, color: 0x56627c, alphaTest: 0.5, side: THREE.DoubleSide });
const poleMat = new THREE.MeshBasicMaterial({ map: T.dark, color: 0x3a3028 });
const cabinMat = new THREE.MeshBasicMaterial({ map: T.planks, color: 0x505868 });
const roofMat = new THREE.MeshBasicMaterial({ map: T.snow, color: 0x6a7690 });
const litMat = new THREE.MeshBasicMaterial({ color: 0xffb35c });
const chunks = [];
for (let k = 0; k < CHUNKS; k++) {
  const r = rng(100 + k);
  const grp = new THREE.Group();
  const pines = [];
  for (let i = 0; i < 90; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (10 + Math.pow(r(), 1.6) * 170);
    const z = r() * CHUNK;
    const h = 5 + r() * 7;
    for (const ry of [0, Math.PI / 2]) {
      const g = plane(h * 0.5, h, h * 0.5, h);
      g.rotateY(ry);
      g.translate(x, GROUND_Y + h / 2, z);
      pines.push(g);
    }
  }
  grp.add(new THREE.Mesh(mergeGeometries(pines), pineMat));
  const poles = [];
  for (let z = 0; z < CHUNK; z += 44) {
    poles.push(box(0.22, 8, 0.22).translate(-7, GROUND_Y + 4, z));
    poles.push(box(2.2, 0.16, 0.16).translate(-7, GROUND_Y + 7.4, z));
  }
  grp.add(new THREE.Mesh(mergeGeometries(poles), poleMat));
  if (k % 2 === 0 || r() < 0.5) {
    const side = r() < 0.5 ? -1 : 1;
    const cx = side * (34 + r() * 60);
    const cz = 40 + r() * 140;
    const cabin = new THREE.Group();
    const body = new THREE.Mesh(box(6, 3.2, 5, 2, 2), cabinMat);
    body.position.y = GROUND_Y + 1.6;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.4, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = GROUND_Y + 4.4;
    cabin.add(body, roof);
    for (const wz of [-1.2, 1.2]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), litMat);
      w.position.set(-side * 3.01, GROUND_Y + 1.7, wz);
      w.rotation.y = -side * Math.PI / 2;
      cabin.add(w);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff9a40, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(-side * 3.6, GROUND_Y + 1.7, 0);
    glow.scale.setScalar(9);
    cabin.add(glow);
    cabin.position.set(cx, 0, cz);
    grp.add(cabin);
  }
  outside.add(grp);
  chunks.push({ grp, base: k * CHUNK });
}
// The wires between the poles (straight; they run the whole way).
{
  const wires = new THREE.Mesh(mergeGeometries([-7.9, -6.1].map((x) => box(0.025, 0.025, 2400).translate(x, GROUND_Y + 7.5, 0))), new THREE.MeshBasicMaterial({ color: 0x1a1e26 }));
  outside.add(wires);
}

// Snow streaking past: each flake a short line along its motion.
const FLAKES = TOUCH ? 900 : 1800;
const flakePos = new Float32Array(FLAKES * 6);
const flake = new Float32Array(FLAKES * 4); // x, y, z, fall speed
const snowGeo = new THREE.BufferGeometry();
snowGeo.setAttribute("position", new THREE.BufferAttribute(flakePos, 3));
const snowLines = new THREE.LineSegments(snowGeo, new THREE.LineBasicMaterial({ color: 0xb8c6e0 }));
snowLines.frustumCulled = false;
scene.add(snowLines);
const insideTrain = (x, y) => Math.abs(x) < HW + 0.3 && y < H + 0.5;
function placeFlake(i, z0, z1, zc) {
  let x, y;
  do {
    x = (Math.random() - 0.5) * 90;
    y = GROUND_Y + Math.random() * 24;
  } while (insideTrain(x, y));
  flake[i * 4] = x;
  flake[i * 4 + 1] = y;
  flake[i * 4 + 2] = zc + z0 + Math.random() * (z1 - z0);
  flake[i * 4 + 3] = 1.5 + Math.random() * 2.5;
}
for (let i = 0; i < FLAKES; i++) placeFlake(i, -60, 60, 0);

let windGust = 0;
function updateWorld(dt, t, pz) {
  scroll += SPEED * dt;
  skyMat.uniforms.uTime.value = t;
  skyGroup.position.copy(camera.position);
  // The ground follows you and its texture runs backward.
  ground.position.z = trackBed.position.z = rails.position.z = pz;
  snowTex.offset.y = -((scroll + pz) / 8) % 1;
  trackTex.offset.y = -((scroll + pz) / 4) % 1;
  for (const m of mountMats) m.map.offset.x = ((scroll / 1200) % 1) * (m === mountMats[0] ? -1 : 1);
  for (const c of chunks) {
    const span = CHUNK * CHUNKS;
    let z = (((c.base - scroll) % span) + span) % span;
    c.grp.position.z = pz - span / 2 + z;
  }
  // Snow.
  windGust = 0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.13);
  const vx = -2 - windGust * 3;
  for (let i = 0; i < FLAKES; i++) {
    const o = i * 4;
    flake[o] += vx * dt;
    flake[o + 1] -= flake[o + 3] * dt;
    flake[o + 2] -= SPEED * dt;
    if (flake[o + 2] < pz - 60 || flake[o + 1] < GROUND_Y || insideTrain(flake[o], flake[o + 1])) placeFlake(i, 40, 60, pz);
    else if (flake[o + 2] > pz + 60) placeFlake(i, -60, -40, pz);
    const p = i * 6;
    flakePos[p] = flake[o];
    flakePos[p + 1] = flake[o + 1];
    flakePos[p + 2] = flake[o + 2];
    flakePos[p + 3] = flake[o] - vx * 0.03;
    flakePos[p + 4] = flake[o + 1] + flake[o + 3] * 0.03;
    flakePos[p + 5] = flake[o + 2] + SPEED * 0.03;
  }
  snowGeo.attributes.position.needsUpdate = true;
}
