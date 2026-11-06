  // ---------- The launcher, and what it does to things ----------
  // The launcher from the Range can be carried out of it. Whatever room you
  // carry it into decides whether it can be fired there: a room that can
  // take a missile gives its api a `launch(from, dir)` (in its own
  // coordinates). Elsewhere it's slung on your back, out of sight.
  //
  // Shared by the Range and the lobby: the launcher model, the smoke, fire,
  // dust and glass (`fxKit`), and missiles in flight (`missileKit`).

  // Soft lumps for smoke and dust, so a puff reads as billowing rather than
  // as a blurred disc.
  let smokeTexCache = null;
  function smokeTexture() {
    smokeTexCache ??= shared(canvasTex(128, 128, (g) => {
      const r = rng(83);
      for (let i = 0; i < 18; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 24;
        const x = 64 + Math.cos(a) * d;
        const y = 64 + Math.sin(a) * d;
        const rad = 16 + r() * 22;
        const grad = g.createRadialGradient(x, y, 0, x, y, rad);
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.3 + r() * 0.25})`);
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        g.fillStyle = grad;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }, { repeat: false }));
    return smokeTexCache;
  }

  // Smoke, dust, fire and glass for one room, a flash of light for blasts
  // and scorch marks on the floor. `low` halves what can be in the air.
  // `flash: false` leaves out the light (adding a light changes every
  // shader in a room, so the lobby lends one of its lamps instead).
  function fxKit(R, { low = false, flash: withFlash = true, flashRange = 140, scorchY = 0.12 } = {}) {
    const STRIDE = 20;
    function particles(max, additive, map) {
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      const at = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
      const tint = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
      const turn = new THREE.InstancedBufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("at", at);
      geo.setAttribute("tint", tint);
      geo.setAttribute("turn", turn);
      geo.instanceCount = 0;
      const mat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: map } }]),
        vertexShader: `
          attribute vec4 at;
          attribute vec4 tint;
          attribute float turn;
          varying vec4 vTint;
          varying vec2 vUv;
          varying float vUp;
          #include <fog_pars_vertex>
          void main() {
            vTint = tint;
            vUv = position.xy + 0.5;
            float c = cos(turn);
            float s = sin(turn);
            vec2 corner = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
            vUp = corner.y + 0.5;
            vec4 mvPosition = modelViewMatrix * vec4(at.xyz, 1.0);
            mvPosition.xy += corner * at.w;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `
          uniform sampler2D map;
          varying vec4 vTint;
          varying vec2 vUv;
          varying float vUp;
          #include <fog_pars_fragment>
          void main() {
            float lump = texture2D(map, vUv).a;
            float a = lump * vTint.a;
            if (a < 0.004) discard;
            vec3 col = vTint.rgb;
            ${additive ? "" : "col *= mix(0.72, 1.12, vUp) * (1.0 - 0.18 * lump);"}
            float f = 0.0;
            #ifdef USE_FOG
              #ifdef FOG_EXP2
                f = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
              #else
                f = smoothstep(fogNear, fogFar, vFogDepth);
              #endif
            #endif
            ${additive ? "a *= 1.0 - f;" : "col = mix(col, fogColor, f);"}
            gl_FragColor = vec4(col, a);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
        fog: true,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      mat.userData.noClip = true;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = additive ? 2 : 1;
      R.add(mesh);
      const d = new Float32Array(max * STRIDE);
      const col = new THREE.Color();
      let n = 0;
      let shown = 0;
      return {
        add(x, y, z, o) {
          if (n >= max) return;
          const k = n++ * STRIDE;
          col.setHex(o.color);
          d[k] = x; d[k + 1] = y; d[k + 2] = z;
          d[k + 3] = o.vx; d[k + 4] = o.vy; d[k + 5] = o.vz;
          d[k + 6] = o.size; d[k + 7] = o.grow; d[k + 8] = o.life; d[k + 9] = 0;
          d[k + 10] = col.r; d[k + 11] = col.g; d[k + 12] = col.b; d[k + 13] = o.peak;
          d[k + 14] = o.drag; d[k + 15] = o.gravity;
          d[k + 16] = Math.random() * Math.PI * 2; d[k + 17] = (Math.random() - 0.5) * o.swirl;
          d[k + 18] = o.kind;
        },
        step(dt) {
          if (!n && !shown) return;
          const A = at.array;
          const T = tint.array;
          const U = turn.array;
          for (let i = 0; i < n; i++) {
            const k = i * STRIDE;
            d[k + 9] += dt;
            if (d[k + 9] >= d[k + 8]) {
              // Gone: the last one takes its place.
              n--;
              if (i < n) d.copyWithin(k, n * STRIDE, n * STRIDE + STRIDE);
              i--;
              continue;
            }
            const age = d[k + 9];
            const u = age / d[k + 8];
            const drag = Math.exp(-d[k + 14] * dt);
            d[k + 3] *= drag;
            d[k + 5] *= drag;
            d[k + 4] = d[k + 4] * drag - d[k + 15] * dt;
            d[k] += d[k + 3] * dt;
            d[k + 1] += d[k + 4] * dt;
            d[k + 2] += d[k + 5] * dt;
            d[k + 16] += d[k + 17] * dt;
            const kind = d[k + 18];
            const a = kind === 1 ? d[k + 13] * (1 - u)
              : kind === 2 ? d[k + 13] * (1 - u) * (0.3 + 0.7 * Math.abs(Math.sin(age * 31 + i * 1.7)))
                : d[k + 13] * Math.min(1, age * 3) * Math.pow(1 - u, 1.4);
            const cool = kind === 1 ? u : 0;
            const j = i * 4;
            A[j] = d[k]; A[j + 1] = d[k + 1]; A[j + 2] = d[k + 2]; A[j + 3] = d[k + 6] + d[k + 7] * age;
            T[j] = d[k + 10] + (0.06 - d[k + 10]) * cool;
            T[j + 1] = d[k + 11] + (0.012 - d[k + 11]) * cool;
            T[j + 2] = d[k + 12] + (0.003 - d[k + 12]) * cool;
            T[j + 3] = a;
            U[i] = d[k + 16];
          }
          geo.instanceCount = n;
          shown = n;
          for (const attr of [at, tint, turn]) {
            attr.clearUpdateRanges();
            attr.addUpdateRange(0, Math.max(1, n) * attr.itemSize);
            attr.needsUpdate = true;
          }
        },
        clear() { n = 0; },
        // Age everything within `r` metres (across the ground) of `at` by
        // an extra `by` seconds.
        hurry(at, r, by) {
          for (let i = 0; i < n; i++) {
            const k = i * STRIDE;
            if (Math.hypot(d[k] - at.x, d[k + 2] - at.z) < r) d[k + 9] += by;
          }
        },
      };
    }
    const smoke = particles(low ? 500 : 1400, false, smokeTexture());
    const glow = particles(low ? 300 : 800, true, glowTex);
    function puff(x, y, z, { size = 6, grow = 3, life = 6, vy = 2, vx = 0, vz = 0, drag = 0.15, color = 0x6a645e, fire = false, spread = 2, peak } = {}) {
      (fire ? glow : smoke).add(
        x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread * 0.5, z + (Math.random() - 0.5) * spread,
        { vx, vy, vz, size, grow: grow * (fire ? 1 : 0.8), life, color, peak: peak ?? (fire ? 0.9 : 0.6), drag: fire ? 0 : drag, gravity: fire ? 0 : -0.25, swirl: fire ? 0 : 0.5, kind: fire ? 1 : 0 },
      );
    }
    // A shard of glass, flashing as it tumbles down.
    function glint(at, vx, vy, vz, spread = 1.6) {
      const k = () => 0.6 + Math.random() * 0.6;
      glow.add(at.x + (Math.random() - 0.5) * spread, at.y + (Math.random() - 0.5) * spread, at.z + (Math.random() - 0.5) * spread, {
        vx: vx * k(), vy: vy * k(), vz: vz * k(), size: 0.7 + Math.random() * 0.6, grow: 0, life: 1.5 + Math.random() * 1.8,
        color: 0xfff4dc, peak: 1, drag: 0.6, gravity: 7, swirl: 0, kind: 2,
      });
    }
    const flash = withFlash ? new THREE.PointLight(0xffa860, 0, flashRange, 1.2) : null;
    if (flash) R.add(flash);
    let flashT = 0;
    let flashPeak = 0;
    // Scorch marks where a blast hits the floor.
    const scorchMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const scorches = Array.from({ length: 10 }, () => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), scorchMat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.userData.keep = true;
      R.add(m);
      return m;
    });
    let nextScorch = 0;
    return {
      smoke, glow, puff, glint,
      scorch(at, size = 9 + Math.random() * 5) {
        const m = scorches[nextScorch];
        nextScorch = (nextScorch + 1) % scorches.length;
        m.position.set(at.x, scorchY, at.z);
        m.scale.setScalar(size);
        m.rotation.z = Math.random() * Math.PI * 2;
        m.visible = true;
      },
      // The fireball, the white flash at its heart, the smoke column and the
      // dust thrown out sideways. `k` scales it (1 out on the range).
      burst(at, k = 1, lightFrom = null) {
        if (flash) {
          flash.position.copy(lightFrom ?? at);
          flashPeak = 900 * k;
          flash.intensity = flashPeak;
          flashT = 0;
        }
        for (let i = 0; i < 10; i++) puff(at.x, at.y, at.z, { size: (5 + Math.random() * 5) * k, grow: 9 * k, life: 0.9 + Math.random() * 0.5, vy: 3 * k, color: 0xffa040, fire: true, spread: 4 * k });
        for (let i = 0; i < 4; i++) puff(at.x, at.y, at.z, { size: 14 * k, grow: 30 * k, life: 0.25, vy: 0, color: 0xfff0d0, fire: true, spread: k });
        for (let i = 0; i < 14; i++) puff(at.x, at.y + 2 * k, at.z, { size: 7 * k, grow: 5 * k * k, life: (7 + Math.random() * 5) * Math.sqrt(k), vy: (3 + Math.random() * 3) * k, color: 0x4a4440, spread: 7 * k });
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = (14 + Math.random() * 12) * k;
          puff(at.x, at.y, at.z, { size: 4 * k, grow: 6 * k * k, life: (4 + Math.random() * 3) * Math.sqrt(k), vy: (1 + Math.random() * 3) * k, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, drag: 2.2, color: 0xa89a88, spread: 2 * k, peak: 0.5 });
        }
      },
      step(dt) {
        smoke.step(dt);
        glow.step(dt);
        if (flash?.intensity > 0) {
          flashT += dt;
          flash.intensity = Math.max(0, flashPeak * Math.exp(-flashT * 6));
        }
      },
      clear() {
        smoke.clear();
        glow.clear();
        if (flash) flash.intensity = 0;
        for (const s of scorches) s.visible = false;
      },
    };
  }

  // The launcher: a fat tube with a grip, a sight and a warhead peeking out
  // the front. One copy rests on the Range's bench; the other is carried.
  function launcherModel() {
    const g = new THREE.Group();
    const olive = new THREE.MeshStandardMaterial({ color: 0x4b5235, roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d1f1c, roughness: 0.6, metalness: 0.4 });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.1, 14), olive);
    tube.rotation.x = Math.PI / 2;
    g.add(tube);
    for (const z of [-0.55, 0.55]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 14), dark);
      ring.rotation.x = Math.PI / 2;
      ring.position.z = z;
      g.add(ring);
    }
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.06), dark);
    grip.position.set(0, -0.13, 0.05);
    grip.rotation.x = 0.25;
    const grip2 = grip.clone();
    grip2.position.z = -0.25;
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.09), dark);
    sight.position.set(-0.06, 0.1, -0.3);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0x6d6a4a, roughness: 0.6 }));
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.62;
    g.add(grip, grip2, sight, tip);
    g.userData.tip = tip;
    return g;
  }

  // Missiles in flight in one room. `hit(p)` says where one going through
  // `p` goes off (a point, or null to fly on); `boom(at)` sets it off.
  // `drop` is how fast the flight path sags (m/s²); `light` is the reach of
  // the glow that travels with it (0 for none).
  function missileKit(R, fx, { hit, boom, speed = 140, drop = 2.5, light = 45 }) {
    const rocket = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), new THREE.MeshLambertMaterial({ color: 0x6d6a4a }));
    body.rotation.x = Math.PI / 2;
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.scale.setScalar(1.6);
    flame.position.z = 0.5;
    rocket.add(body, flame);
    rocket.visible = false;
    rocket.userData.keep = true;
    R.add(rocket);
    const glowLight = light > 0 ? new THREE.PointLight(0xffb060, 0, light, 1.4) : null;
    if (glowLight) R.add(glowLight);
    const list = [];
    const look = new THREE.Vector3();
    return {
      get flying() { return list.length; },
      launch(from, dir) {
        const m = rocket.clone();
        m.visible = true;
        R.add(m);
        list.push({ m, p: from.clone(), v: dir.clone().multiplyScalar(speed), age: 0 });
        for (let i = 0; i < 5; i++) {
          const ahead = 2.5 + Math.random() * 4;
          fx.puff(from.x + dir.x * ahead, from.y + dir.y * ahead, from.z + dir.z * ahead, { size: 0.8, grow: 2, life: 1.4, vy: 0.3, color: 0xd8d2c8, spread: 0.6, peak: 0.35 });
        }
        fx.puff(from.x + dir.x * 0.6, from.y + dir.y * 0.6, from.z + dir.z * 0.6, { size: 0.25, grow: 2.5, life: 0.07, vy: 0, color: 0xffd090, fire: true, spread: 0.05, peak: 0.7 });
      },
      // March each one along this frame in short steps, so nothing thin is
      // skipped over.
      step(dt) {
        for (let i = list.length - 1; i >= 0; i--) {
          const M = list[i];
          M.age += dt;
          M.v.y -= drop * dt;
          const steps = Math.ceil((M.v.length() * dt) / 0.3);
          let at = null;
          for (let s = 0; s < steps && !at; s++) {
            M.p.addScaledVector(M.v, dt / steps);
            at = hit(M.p, M.v);
          }
          M.m.position.copy(M.p);
          M.m.lookAt(look.copy(M.p).sub(M.v));
          if (M.age > 0.04) fx.puff(M.p.x, M.p.y, M.p.z, { size: 0.6, grow: 2.2, life: 2.2, vy: 0.2, color: 0xd8d2c8, spread: 0.2, peak: 0.5 });
          if (at || M.age > 7) {
            if (at) boom(at);
            R.root.remove(M.m);
            list.splice(i, 1);
          }
        }
        if (glowLight) {
          const lead = list[list.length - 1];
          glowLight.intensity = lead ? 70 : 0;
          if (lead) glowLight.position.copy(lead.p);
        }
      },
      clear() {
        for (const M of list) R.root.remove(M.m);
        list.length = 0;
        if (glowLight) glowLight.intensity = 0;
      },
    };
  }

  // The carried launcher. It's drawn on its own after everything else, with
  // the depth cleared, so it never pokes into a wall you're standing at.
  const ARMS = {
    carrying: false,
    aiming: false,
    aim: 0, // 0 at the hip, 1 looking through the sight
    kick: 0,
    reload: 0,
    scene: null,
    held: null,
    told: new Set(),
    // Can you fire it where you are?
    active() { return this.carrying && !!here?.api?.launch; },
    setup() {
      this.scene = new THREE.Scene();
      this.scene.add(new THREE.HemisphereLight(0xd8d4cc, 0x2a2622, 1.1));
      const key = new THREE.DirectionalLight(0xfff0dc, 1.4);
      key.position.set(1, 2, 1);
      this.scene.add(key);
      this.rig = new THREE.Group();
      this.held = launcherModel();
      this.held.position.set(0.34, -0.29, -0.22);
      this.held.scale.setScalar(0.85);
      this.held.rotation.y = 0.04;
      this.rig.add(this.held);
      this.scene.add(this.rig);
    },
    pickUp() {
      if (this.carrying) return;
      this.carrying = true;
    },
    onAim(on) { this.aiming = on && this.active(); },
    zoom() { return 1 + this.aim * 3; },
    fire() {
      if (!this.active() || this.reload > 0) return false;
      const reg = here;
      this.reload = 0.9;
      this.kick = 1;
      this.held.userData.tip.visible = false;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      // The tube sits off to the side, but the missile starts on the line
      // of sight just ahead of you, so it goes where the crosshair points.
      // At 140 m/s it's a couple of metres on by the next frame anyway.
      const from = camera.position.clone().addScaledVector(dir, 0.9);
      from.y -= 0.06;
      reg.root.worldToLocal(from);
      const inv = reg.root.getWorldQuaternion(new THREE.Quaternion()).invert();
      dir.applyQuaternion(inv);
      reg.api.launch(from, dir);
      return true;
    },
    update(dt) {
      if (!this.scene) this.setup();
      if (here !== regions.lobby && hurtEl) hurtEl.style.opacity = "0";
      const on = this.active() && running;
      if (!on) this.aiming = false;
      this.aim += ((this.aiming ? 1 : 0) - this.aim) * Math.min(1, dt * 10);
      this.rig.visible = on;
      if (this.reload > 0) {
        this.reload -= dt;
        if (this.reload <= 0) this.held.userData.tip.visible = true;
      }
      this.kick = Math.max(0, this.kick - dt * 4);
      if (!on) return;
      this.rig.position.copy(camera.position);
      this.rig.quaternion.copy(camera.quaternion);
      this.held.position.z = -0.22 + this.kick * 0.12;
      // Through the sight, the tube drops out of the way.
      this.held.position.y = -0.29 - this.aim * 0.5;
      this.held.rotation.x = this.kick * 0.18;
      // A word the first time you bring it somewhere new.
      const say = here.api.armsHint;
      if (say && !this.told.has(here.id)) {
        this.told.add(here.id);
        setTimeout(() => toast(say[0], say[1]), 2700);
      }
    },
    draw() {
      if (!this.rig?.visible) return;
      renderer.clearDepth();
      renderer.render(this.scene, camera);
    },
  };
