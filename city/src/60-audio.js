// ---------- Sound ----------
// All made here, no files: your engine (following the revs through the
// gears), the tyres when they slide, the wind at speed, gravel under the
// wheels off the road, crashes, horns, birds, and the sea near the shore.
const AU = { ctx: null };
function audioStart() {
  if (AU.ctx) { AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  AU.ctx = ctx;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);
  AU.out = ctx.createGain();
  AU.out.gain.value = 0.85;
  AU.out.connect(comp);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = nb;
  const loop = (type, f, q) => {
    const s = ctx.createBufferSource();
    s.buffer = nb;
    s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    s.connect(fl).connect(g).connect(AU.out);
    s.start();
    return { f: fl, g };
  };
  // The engine: a sawtooth and a sub an octave down, through a filter that
  // opens with the throttle, and a little rasp on top.
  const eng = ctx.createGain();
  eng.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 3;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * 2.2); }
  shaper.curve = curve;
  const o1 = ctx.createOscillator();
  o1.type = "sawtooth";
  const o2 = ctx.createOscillator();
  o2.type = "square";
  const o3 = ctx.createOscillator();
  o3.type = "sawtooth";
  const g2 = ctx.createGain();
  g2.gain.value = 0.6;
  const g3 = ctx.createGain();
  g3.gain.value = 0.35;
  o1.connect(shaper);
  o2.connect(g2).connect(shaper);
  o3.connect(g3).connect(shaper);
  shaper.connect(lp).connect(eng).connect(AU.out);
  for (const o of [o1, o2, o3]) o.start();
  AU.engine = { o1, o2, o3, lp, eng };
  AU.tyre = loop("bandpass", 1400, 4);
  AU.wind = loop("lowpass", 700, 0.5);
  AU.gravel = loop("lowpass", 260, 0.8);
  AU.sea = loop("lowpass", 500, 0.4);
  // The horn.
  const hg = ctx.createGain();
  hg.gain.value = 0;
  const hf = ctx.createBiquadFilter();
  hf.type = "lowpass";
  hf.frequency.value = 1800;
  for (const f of [370, 466]) { const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = f; o.connect(hf); o.start(); }
  hf.connect(hg).connect(AU.out);
  AU.horn = hg;
}
const anow = () => AU.ctx.currentTime;
function where(x, z) {
  const dx = x - camera.position.x;
  const dz = z - camera.position.z;
  const d = Math.hypot(dx, dz);
  const f = new THREE.Vector3();
  camera.getWorldDirection(f);
  const rx = -f.z;
  const rz = f.x;
  const n = Math.hypot(rx, rz) || 1;
  return { pan: d > 0.1 ? clamp(((dx * rx + dz * rz) / n / d) * 0.85, -1, 1) : 0, vol: 1 / (1 + d * 0.06) };
}
function burst({ t = 0, dur = 0.2, type = "lowpass", f0 = 1000, f1 = f0, q = 0.8, gain = 0.4, pan = 0 }) {
  if (!AU.ctx) return;
  const ctx = AU.ctx;
  const s = ctx.createBufferSource();
  s.buffer = AU.noise;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.Q.value = q;
  const at = anow() + t;
  fl.frequency.setValueAtTime(f0, at);
  fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  s.connect(fl).connect(g).connect(p).connect(AU.out);
  s.start(at, Math.random());
  s.stop(at + dur + 0.05);
}
function tone({ t = 0, dur = 0.2, type = "sine", f0 = 440, f1 = f0, gain = 0.2, pan = 0, band = 0 }) {
  if (!AU.ctx) return;
  const ctx = AU.ctx;
  const o = ctx.createOscillator();
  o.type = type;
  const at = anow() + t;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  let node = o;
  if (band) { const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = band; f.Q.value = 3; node = o.connect(f); }
  node.connect(g).connect(p).connect(AU.out);
  o.start(at);
  o.stop(at + dur + 0.05);
}
const sfx = {
  crash(power, x, z) {
    const { pan, vol } = where(x, z);
    const k = clamp(power / 14, 0.1, 1) * vol;
    burst({ dur: 0.35 + k * 0.4, f0: 3000, f1: 300, gain: 0.9 * k, pan });
    tone({ dur: 0.3, f0: 110, f1: 40, gain: 0.8 * k, pan });
    if (k > 0.4) for (let i = 0; i < 5; i++) burst({ t: 0.05 + Math.random() * 0.3, dur: 0.06, type: "bandpass", f0: 3000 + Math.random() * 4000, q: 6, gain: 0.25 * k, pan });
  },
  land(k) { tone({ dur: 0.25, f0: 90, f1: 40, gain: 0.6 * k }); burst({ dur: 0.2, f0: 600, f1: 150, gain: 0.4 * k }); },
  thud(p, k) { const { pan, vol } = where(p.x, p.z); tone({ dur: 0.2, f0: 120, f1: 50, gain: k * vol, pan }); },
  shout(p) {
    const { pan, vol } = where(p.x, p.z);
    const f = 200 + Math.random() * 140;
    tone({ dur: 0.28, type: "sawtooth", f0: f, f1: f * 1.3, gain: 0.25 * vol, pan, band: 900 + Math.random() * 400 });
  },
  door() { burst({ dur: 0.12, type: "bandpass", f0: 900, q: 2, gain: 0.4 }); tone({ t: 0.05, dur: 0.1, f0: 160, f1: 90, gain: 0.3 }); },
  honk(x, z) {
    const { pan, vol } = where(x, z);
    for (const f of [350, 440]) tone({ dur: 0.35, type: "square", f0: f, gain: 0.08 * vol, pan, band: 900 });
  },
  bird() {
    const f = 2600 + Math.random() * 1600;
    const pan = Math.random() * 1.6 - 0.8;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) tone({ t: k * 0.12, dur: 0.09, f0: f, f1: f * (Math.random() < 0.5 ? 1.4 : 0.7), gain: 0.035, pan });
  },
  splash() { burst({ dur: 0.9, f0: 2500, f1: 200, gain: 0.7 }); },
};
function honkAt(c) { if (Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < 120) sfx.honk(c.x, c.z); }
// Every frame.
function updateAudio(dt, car, honking) {
  if (!AU.ctx) return;
  const e = AU.engine;
  const t = anow();
  const ease = (param, v, k = 0.06) => param.setTargetAtTime(v, t, k);
  if (car) {
    const rpm = car.rpm;
    const f = (rpm / 60) * 2;
    ease(e.o1.frequency, f, 0.03);
    ease(e.o2.frequency, f / 2, 0.03);
    ease(e.o3.frequency, f * 1.503, 0.03);
    const thr = car.in.thr;
    ease(e.lp.frequency, 260 + thr * 1500 + rpm * 0.18, 0.05);
    ease(e.eng.gain, (0.09 + thr * 0.12) * (car.shift ? 0.4 : 1), 0.05);
    const sp = Math.hypot(car.vx, car.vz);
    ease(AU.tyre.g.gain, car.grounded && car.slip > 2.5 && sp > 4 ? clamp((car.slip - 2.5) * 0.04, 0, 0.22) : 0, 0.05);
    ease(AU.tyre.f.frequency, 1100 + car.slip * 30, 0.1);
    ease(AU.wind.g.gain, clamp((sp * sp) / 9000, 0, 0.3), 0.2);
    ease(AU.gravel.g.gain, car.offroad && car.grounded ? clamp(sp * 0.012, 0, 0.35) : 0, 0.1);
  } else {
    ease(e.eng.gain, 0, 0.2);
    ease(AU.tyre.g.gain, 0, 0.1);
    ease(AU.wind.g.gain, 0, 0.3);
    ease(AU.gravel.g.gain, 0, 0.1);
  }
  ease(AU.horn.gain, honking ? 0.09 : 0, 0.02);
  // The sea, louder near the shore.
  const h = terrainH(camera.position.x, camera.position.z);
  ease(AU.sea.g.gain, clamp((6 - h) * 0.03, 0, 0.16) * (0.6 + 0.4 * Math.sin(t * 0.4)), 0.4);
  if (Math.random() < dt * 0.35 && !townAt(camera.position.x, camera.position.z) || Math.random() < dt * 0.12) sfx.bird();
}
