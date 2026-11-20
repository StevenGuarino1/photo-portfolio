// ---------- Sound ----------
// All made here, no files: the rumble of the train and the clack of the
// rail joints, the wind (loud between cars), and the guns, the guards and
// the doors. Sounds from guards are panned to where they are.
const AU = { ctx: null };
function audioStart() {
  if (AU.ctx) { AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  AU.ctx = ctx;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);
  AU.master = ctx.createGain();
  AU.master.gain.value = 0.8;
  AU.master.connect(comp);
  // A short metal-room reverb.
  const len = ctx.sampleRate * 1.4;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  AU.verb = ctx.createConvolver();
  AU.verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  AU.verb.connect(wet).connect(AU.master);
  AU.dry = ctx.createGain();
  AU.dry.connect(AU.master);
  AU.dry.connect(AU.verb);
  // White noise to shape everything else from.
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  AU.noise = nb;
  // The train itself: a low rumble and the wind outside.
  const loop = (filterType, freq, q, gain) => {
    const s = ctx.createBufferSource();
    s.buffer = nb;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(f).connect(g).connect(AU.master);
    s.start();
    return { f, g };
  };
  AU.rumble = loop("lowpass", 110, 0.7, 0.55);
  AU.rumble2 = loop("bandpass", 320, 1.2, 0.05);
  AU.wind = loop("bandpass", 700, 0.6, 0.03);
  AU.lastJoint = Math.floor(scroll / 25);
}
const now = () => AU.ctx.currentTime;
function noiseHit({ t = 0, dur = 0.2, type = "lowpass", f0 = 2000, f1 = f0, q = 0.8, gain = 0.5, pan = 0, out = AU.dry, attack = 0.002 }) {
  if (!AU.ctx) return;
  const ctx = AU.ctx;
  const s = ctx.createBufferSource();
  s.buffer = AU.noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  const at = now() + t;
  f.frequency.setValueAtTime(f0, at);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const p = ctx.createStereoPanner();
  p.pan.value = clamp(pan, -1, 1);
  s.connect(f).connect(g).connect(p).connect(out);
  s.start(at, Math.random() * 1.5);
  s.stop(at + dur + 0.05);
}
function tone({ t = 0, dur = 0.2, type = "sine", f0 = 440, f1 = f0, gain = 0.3, pan = 0, out = AU.dry, attack = 0.005, filter = 0 }) {
  if (!AU.ctx) return;
  const ctx = AU.ctx;
  const o = ctx.createOscillator();
  o.type = type;
  const at = now() + t;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const p = ctx.createStereoPanner();
  p.pan.value = clamp(pan, -1, 1);
  let node = o;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = filter;
    f.Q.value = 2;
    node = o.connect(f);
  }
  node.connect(g).connect(p).connect(out);
  o.start(at);
  o.stop(at + dur + 0.05);
}
// Where a guard is, as pan and loudness.
function place(e) {
  const dx = e.x - camera.position.x;
  const dz = e.z - camera.position.z;
  const d = Math.hypot(dx, dz);
  const rx = Math.cos(P.yaw);
  const rz = -Math.sin(P.yaw);
  return { pan: d > 0.01 ? ((dx * rx + dz * rz) / d) * 0.8 : 0, vol: 1 / (1 + d * 0.09) };
}
const sfx = {
  shot(kind) {
    if (kind === "scatter") {
      noiseHit({ dur: 0.38, f0: 7000, f1: 500, gain: 0.9 });
      tone({ dur: 0.25, f0: 140, f1: 38, gain: 0.8, type: "sine" });
      noiseHit({ t: 0.33, dur: 0.06, type: "bandpass", f0: 3200, q: 4, gain: 0.08 });
    } else {
      noiseHit({ dur: 0.12, type: "bandpass", f0: 3000, f1: 900, q: 0.7, gain: 0.55 });
      tone({ dur: 0.09, f0: 170, f1: 60, gain: 0.45 });
    }
  },
  reload(kind, dur) {
    const tick = (t, f) => noiseHit({ t, dur: 0.05, type: "bandpass", f0: f, q: 5, gain: 0.25 });
    if (kind === "scatter") { tick(0.1, 2400); tick(dur * 0.45, 1800); tick(dur * 0.6, 1800); tick(dur - 0.12, 2800); }
    else { tick(0.15, 2200); tick(dur * 0.5, 1500); tick(dur - 0.15, 3000); }
  },
  swap() { noiseHit({ dur: 0.08, type: "bandpass", f0: 2000, q: 3, gain: 0.18 }); },
  empty() { noiseHit({ dur: 0.03, type: "bandpass", f0: 3500, q: 6, gain: 0.2 }); },
  guardShot(e) {
    const { pan, vol } = place(e);
    noiseHit({ dur: 0.16, type: "highpass", f0: 1400, f1: 600, gain: 0.6 * vol, pan });
    tone({ dur: 0.12, f0: 220, f1: 70, gain: 0.35 * vol, pan });
  },
  guardHurt(e) {
    const { pan, vol } = place(e);
    tone({ dur: 0.16, type: "sawtooth", f0: 210 * (e.T.boss ? 0.6 : 1), f1: 120, gain: 0.22 * vol, pan, filter: 750 });
  },
  guardDown(e) {
    const { pan, vol } = place(e);
    tone({ dur: 0.5, type: "sawtooth", f0: 180 * (e.T.boss ? 0.6 : 1), f1: 60, gain: 0.28 * vol, pan, filter: 600 });
    noiseHit({ t: 0.3, dur: 0.25, f0: 300, f1: 80, gain: 0.5 * vol, pan });
  },
  radio(e) {
    const { pan, vol } = place(e);
    for (const [t, f] of [[0, 1180], [0.09, 880]]) tone({ t, dur: 0.07, type: "square", f0: f, gain: 0.08 * vol, pan, filter: f });
    noiseHit({ t: 0.18, dur: 0.25, type: "bandpass", f0: 1800, q: 1.5, gain: 0.06 * vol, pan });
  },
  swing(e) {
    const { pan, vol } = place(e);
    noiseHit({ dur: 0.3, type: "bandpass", f0: 600, f1: 2400, q: 2, gain: 0.25 * vol, pan, attack: 0.15 });
  },
  zap(e) {
    tone({ dur: 0.2, type: "square", f0: 92, f1: 70, gain: 0.25, filter: 900 });
    noiseHit({ dur: 0.15, type: "highpass", f0: 4000, gain: 0.3 });
  },
  hurt() {
    tone({ dur: 0.25, f0: 90, f1: 40, gain: 0.7 });
    noiseHit({ dur: 0.18, f0: 600, f1: 150, gain: 0.4 });
  },
  door() {
    noiseHit({ dur: 0.5, type: "highpass", f0: 3500, f1: 2000, gain: 0.18 });
    noiseHit({ t: 0.08, dur: 0.55, f0: 400, f1: 120, gain: 0.35 });
  },
  unlock() {
    tone({ dur: 0.35, f0: 660, gain: 0.12 });
    tone({ t: 0.14, dur: 0.6, f0: 990, gain: 0.12 });
  },
  pickup() {
    tone({ dur: 0.14, f0: 520, f1: 1040, gain: 0.14 });
    tone({ t: 0.08, dur: 0.2, f0: 780, f1: 1560, gain: 0.08 });
  },
  down() {
    tone({ dur: 1.4, f0: 180, f1: 40, gain: 0.5, type: "triangle" });
    noiseHit({ t: 0.5, dur: 0.4, f0: 300, f1: 60, gain: 0.6 });
  },
  end() {
    for (const [t, f] of [[0, 196], [0.4, 247], [0.8, 294], [1.2, 392]]) tone({ t, dur: 2.4, f0: f, gain: 0.08, type: "triangle" });
  },
  crackle() { noiseHit({ dur: 0.03, type: "bandpass", f0: 1500 + Math.random() * 2500, q: 3, gain: 0.05 + Math.random() * 0.06 }); },
};
// Every frame: the rail joints, the wind, the fire.
function updateAudio(dt, inVest, c) {
  if (!AU.ctx) return;
  const joint = Math.floor(scroll / 25);
  if (joint !== AU.lastJoint) {
    AU.lastJoint = joint;
    // Two bogies, two wheels each: clack-clack . . . clack-clack.
    for (const t of [0, 0.11, 0.62, 0.73]) {
      noiseHit({ t, dur: 0.07, type: "bandpass", f0: 900, f1: 500, q: 1.2, gain: inVest ? 0.5 : 0.22 });
      tone({ t, dur: 0.09, f0: 80, f1: 50, gain: inVest ? 0.4 : 0.22 });
    }
  }
  const tgt = inVest ? 0.22 : c.glassRoof ? 0.06 : 0.03;
  AU.wind.g.gain.value += (tgt * (0.6 + windGust * 0.6) - AU.wind.g.gain.value) * Math.min(1, dt * 3);
  AU.wind.f.frequency.value = 500 + windGust * 500;
  AU.rumble.g.gain.value += ((inVest ? 0.85 : 0.5) - AU.rumble.g.gain.value) * Math.min(1, dt * 3);
  if (c.fires && Math.random() < dt * 9) sfx.crackle();
}
