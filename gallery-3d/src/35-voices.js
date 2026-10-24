  // ---------- Voices ----------
  // There are no recordings anywhere: each voice is a buzzing "vocal cord"
  // oscillator pushed through three vowel filters, babbling syllables in
  // short phrases with pauses to listen. Muffled and echoed, a few of them
  // read as people talking quietly across a room.

  // The first three resonances of the mouth for a handful of vowels, in Hz.
  const VOWELS = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240], [500, 1500, 2500], [660, 1720, 2410]];

  // A short burst of decaying noise, used as a room's echo.
  function roomEcho(ctx, seconds, power = 3) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, power);
    }
    return buffer;
  }

  function voiceKit(A) {
    const { ctx, chance } = A;
    // Harmonics fading off the way a real voice's do.
    const harmonics = 40;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let n = 1; n < harmonics; n++) imag[n] = 1 / Math.pow(n, 1.7);
    const glottal = ctx.createPeriodicWave(real, imag);

    // One voice, babbling into `out`. Returns its scheduler.
    function voice(out, low, { talk = 1 } = {}) {
      const f0 = low ? 95 + chance() * 45 : 170 + chance() * 55;
      const shift = (low ? 1 : 1.15) * (0.94 + chance() * 0.12);
      const cords = ctx.createOscillator();
      cords.setPeriodicWave(glottal);
      cords.frequency.value = f0;
      const wobble = A.osc("sine", 4.5 + chance() * 2);
      const wobbleDepth = A.gain(f0 * 0.012);
      wobble.connect(wobbleDepth).connect(cords.frequency);
      const breath = A.gain(0.06);
      A.hiss().connect(breath);
      const amp = A.gain(0);
      const formants = [[5, 1], [11, 0.45], [14, 0.2]].map(([q, level], k) => {
        const f = A.filter("bandpass", VOWELS[0][k] * shift, q);
        const g = A.gain(level);
        cords.connect(f);
        breath.connect(f);
        f.connect(g).connect(amp);
        return f;
      });
      amp.connect(out);
      const fric = A.filter("bandpass", 4000, 1.4);
      const fricAmp = A.gain(0);
      A.hiss().connect(fric).connect(fricAmp).connect(out);
      cords.start();
      A.nodes?.push(cords);
      let t = ctx.currentTime + chance() * 3;
      const sched = (until) => {
        t = Math.max(t, ctx.currentTime);
        while (t < until) {
          const syllables = 2 + Math.floor(chance() * 10);
          const question = chance() < 0.2;
          const startPitch = f0 * (1.05 + chance() * 0.15);
          const endPitch = f0 * (question ? 1.25 : 0.85 + chance() * 0.08);
          for (let i = 0; i < syllables; i++) {
            const along = i / Math.max(1, syllables - 1);
            const stressed = chance() < 0.3;
            const len = 0.11 + chance() * 0.16 + (stressed ? 0.05 : 0);
            if (chance() < 0.45) {
              const hissLen = 0.04 + chance() * 0.05;
              fric.frequency.setValueAtTime(2500 + chance() * 4000, t);
              fricAmp.gain.setTargetAtTime(0.08 + chance() * 0.1, t, 0.01);
              fricAmp.gain.setTargetAtTime(0, t + hissLen, 0.015);
              t += hissLen;
            }
            const v = VOWELS[Math.floor(chance() * VOWELS.length)];
            formants.forEach((f, k) => f.frequency.setTargetAtTime(v[k] * shift, t, 0.035));
            const pitch = (startPitch + (endPitch - startPitch) * along) * (stressed ? 1.08 : 1);
            cords.frequency.setTargetAtTime(pitch, t, 0.05);
            const peak = (stressed ? 0.85 : 0.5) + chance() * 0.15;
            amp.gain.setTargetAtTime(peak, t, 0.03);
            amp.gain.setTargetAtTime(peak * 0.3, t + len * 0.75, 0.035);
            t += len;
          }
          amp.gain.setTargetAtTime(0, t, 0.07);
          t += chance() < 0.3 / talk ? 2 + chance() * 5 : 0.3 + chance() * 1.2 / talk;
        }
      };
      A.extras.push(sched);
      return { sched, amp };
    }

    // A laugh: a run of breathy "ha"s, starting high and tumbling down.
    function laugher(out) {
      const cords = ctx.createOscillator();
      cords.setPeriodicWave(glottal);
      cords.frequency.value = 220;
      cords.start();
      A.nodes?.push(cords);
      const voiced = A.gain(0);
      const breathy = A.gain(0);
      cords.connect(voiced);
      A.hiss().connect(breathy);
      for (const [freq, q, level] of [[760, 5, 1], [1180, 11, 0.5], [2500, 14, 0.25]]) {
        const f = A.filter("bandpass", freq, q);
        const g = A.gain(level);
        voiced.connect(f);
        breathy.connect(f);
        f.connect(g).connect(out);
      }
      return () => {
        let t = ctx.currentTime + 0.02;
        let pitch = 290 + chance() * 50;
        const has = 5 + Math.floor(chance() * 4);
        for (let i = 0; i < has; i++) {
          breathy.gain.setTargetAtTime(0.6, t, 0.01);
          voiced.gain.setTargetAtTime(0, t, 0.01);
          t += 0.045;
          cords.frequency.setTargetAtTime(pitch, t, 0.02);
          breathy.gain.setTargetAtTime(0.2, t, 0.02);
          voiced.gain.setTargetAtTime(1, t, 0.015);
          t += 0.1 + chance() * 0.04;
          voiced.gain.setTargetAtTime(0, t, 0.025);
          breathy.gain.setTargetAtTime(0, t, 0.03);
          t += 0.05 + chance() * 0.04;
          pitch *= 0.93;
        }
      };
    }
    return { voice, laugher, glottal };
  }

  // The same clothes and builds everywhere, so every room's people look
  // like they belong to one world.
  const TOPS = [0x2f5d8c, 0xb8443a, 0x4f7d4c, 0x6b4a8a, 0xe0d6c3, 0x8a3b52, 0x2f8a86, 0xd2873a, 0x3d3d44, 0xc9b26a];
  const LEGS = [0x2b2b33, 0x3a3f6b, 0x6b5a45, 0x22303f, 0x4a4a4a, 0x1f1f26, 0x33475b, 0x7a6a55];
  const SHOES = [0x1c1c1c, 0xe9e4da, 0x3a2a1e, 0xc94f3d, 0x7a5b3c, 0x2a2a2a];
  const HAIR = [0x1a1412, 0x3b2a1e, 0x6e3b1f, 0xc9a35a, 0x8f8a84, 0x0f0c0b, 0x9b4a22];
  const STYLES = ["short", "short", "long", "ponytail", "bald", "beanie"];
  function randomLook(rand) {
    const pick = (list) => list[Math.floor(rand() * list.length)];
    const style = pick(STYLES);
    const longHair = style === "long" || style === "ponytail";
    return {
      height: 0.92 + rand() * 0.13,
      build: 0.9 + rand() * 0.35,
      skin: Math.floor(rand() * SKIN.length),
      hair: [style, style === "beanie" ? pick(TOPS) : pick(HAIR)],
      beard: !longHair && rand() < 0.35 ? pick(HAIR) : undefined,
      top: pick(TOPS),
      sleeves: rand() < 0.5 ? "long" : "short",
      legs: pick(LEGS),
      shoes: pick(SHOES),
      skirt: longHair && rand() < 0.5,
    };
  }
