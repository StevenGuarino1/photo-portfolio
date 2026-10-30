  // ---------- The Range ----------
  // A firing range at dusk. A covered concrete firing line looks out over
  // open scrubland to a small town of block-built towers a few hundred
  // metres off. A launcher lies on the bench: pick it up, fire, and the
  // missile takes a couple of seconds to get there. Each building is a grid
  // of blocks; a hit blows out the blocks round it, anything left with no
  // path down to the ground falls, falling blocks smash what they land on,
  // and a building that loses too much of its base comes down whole. The
  // boom arrives late, at the speed of sound. R puts the town back.

  ROOMS.range = {
    name: "The Range",
    short: "Range",
    tagline: "Grab the launcher off the bench",
    hint: "Walk up to the bench for the launcher",
    color: 0xe39a5a,
    leak: 0xf0a868,
    leakStyle: "sun",
    frame: 0x4a4a4a,
    fogColor: 0x8a7a72,
    loudness: 1,
    ground: "concrete",
    entrance: { x: 0, z: 0, nx: 0, nz: -1 },
    spawn: { x: 0, z: 2.2, yaw: Math.PI, pitch: 0.04 },
    spots: { line: { name: "The Firing Line", x: 1.2, z: 6.6, yaw: Math.PI, pitch: 0.05 } },
    build(R) {
      const S = 1.6; // one building block, metres
      const GRAV = 9.8;
      const BOX = { x0: -9, x1: 9, z0: 0, z1: 7.6 }; // where you can walk

      R.scene.fog = new THREE.Fog(0x8f7d74, 120, 1100);
      const SUN = new THREE.Vector3(-0.45, 0.16, 0.88).normalize();
      R.add(new THREE.HemisphereLight(0xb9b6d6, 0x4a3a2c, 0.95));
      const sun = new THREE.DirectionalLight(0xffb27a, 2.1);
      sun.position.set(0, 0, 260).addScaledVector(new THREE.Vector3(-0.5, 0.45, 0.75).normalize(), 400);
      sun.target.position.set(0, 0, 260);
      R.shadows(sun, 240, 900);
      R.add(sun, sun.target);

      // Dusk sky, the sun low over the town, and far ridges for depth.
      const sky = new THREE.Group();
      sky.add(skyDome({ top: 0x2c3352, mid: 0x8a6f7c, low: 0xf0a66a, sunDir: SUN, glow: [1, 0.62, 0.35], tight: 200, spread: 5, glowAmt: [1.3, 0.3] }));
      {
        const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe0b0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
        disc.position.copy(SUN).multiplyScalar(1290);
        disc.scale.setScalar(120);
        disc.renderOrder = -1;
        sky.add(disc);
      }
      R.add(sky);
      [[1500, 70, 0x7a6a78], [1150, 48, 0x6a5c66], [900, 30, 0x5a4f55]].forEach(([r0, amp, color], i) => {
        const rr = rng(700 + i);
        const ph = [rr() * 6, rr() * 6];
        const pos = [];
        const n = 120;
        for (let k = 0; k <= n; k++) {
          const a = -1.4 + (k / n) * 2.8;
          const h = amp * (0.5 + 0.3 * Math.sin(a * 5 + ph[0]) + 0.2 * Math.sin(a * 13 + ph[1]));
          pos.push(Math.sin(a) * r0, -5, Math.cos(a) * r0, Math.sin(a) * r0, h, Math.cos(a) * r0);
        }
        const idx = [];
        for (let k = 0; k < n; k++) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        R.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })));
      });

      // Scrubland out to the hills, with tufts.
      const dirt = canvasTex(256, 256, (g) => {
        const r = rng(71);
        g.fillStyle = "#6b5e45";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 3000; i++) {
          const v = r();
          g.fillStyle = v < 0.5 ? `rgba(90, 80, 52, ${r() * 0.5})` : `rgba(140, 120, 80, ${r() * 0.35})`;
          g.fillRect(r() * 256, r() * 256, 2 + r() * 5, 2 + r() * 5);
        }
      });
      dirt.repeat.set(160, 160);
      const land = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshLambertMaterial({ map: dirt }));
      land.rotation.x = -Math.PI / 2;
      land.position.set(0, -0.02, 600);
      land.receiveShadow = true;
      R.add(land);
      {
        const tuft = new THREE.IcosahedronGeometry(0.5, 0);
        tuft.scale(1.2, 0.45, 1.2);
        const n = R.density(1800);
        const tufts = new THREE.InstancedMesh(tuft, new THREE.MeshLambertMaterial({ color: 0x6d6a3a, flatShading: true }), n);
        const r = rng(73);
        const m = new THREE.Matrix4();
        for (let i = 0; i < n; i++) {
          const x = (r() - 0.5) * 500;
          const z = 12 + r() * 120;
          const s = 0.6 + r() * 1.2;
          m.makeScale(s, s * (0.6 + r() * 0.6), s).setPosition(x, 0.1, z);
          tufts.setMatrixAt(i, m);
        }
        R.add(tufts);
      }
      // Distance markers down the range.
      for (const d of [50, 100, 150, 200]) {
        const sign = new THREE.Group();
        sign.add(part(new THREE.BoxGeometry(0.15, 2, 0.15), 0x3a3530, 0, 1, 0));
        const board = labelMesh([`${d} m`, "", ""], "card", 1.6);
        board.position.set(0, 2.2, 0.09);
        board.rotation.y = Math.PI;
        sign.add(board);
        sign.position.set(-14, 0, d);
        R.add(sign);
      }

      // ---------- The firing line ----------
      const concrete = canvasTex(256, 256, (g) => {
        const r = rng(75);
        g.fillStyle = "#8a857c";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2500; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? "40,38,34" : "200,196,186"}, ${r() * 0.12})`;
          g.fillRect(r() * 256, r() * 256, 2, 2);
        }
        g.fillStyle = "rgba(40, 38, 34, 0.35)";
        g.fillRect(0, 0, 256, 3);
      });
      concrete.repeat.set(6, 3);
      const padMat = new THREE.MeshLambertMaterial({ map: concrete });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 10), padMat);
      pad.position.set(0, -0.15, 4);
      pad.receiveShadow = true;
      R.add(pad);
      // Back wall with the doorway, side walls, a roof.
      const wallMat = new THREE.MeshLambertMaterial({ color: 0x7c776e });
      const back = wallFaces(22, 3.6, wallMat, { x: 0, half: DOOR_HALF, h: DOOR_H }, 0x3a3834);
      back.rotation.y = 0;
      R.add(back);
      const frame = doorFrame(0x4a4a4a);
      frame.position.set(0, 0, 0.05);
      R.add(frame);
      for (const s of [-1, 1]) {
        const side = part(new THREE.BoxGeometry(0.3, 3.6, 9), 0x7c776e, s * 11, 1.8, 4.5);
        side.castShadow = true;
        R.add(side);
      }
      const roof = part(new THREE.BoxGeometry(22.6, 0.25, 9.4), 0x5d5953, 0, 3.7, 4.6);
      roof.castShadow = true;
      R.add(roof);
      // Rafters under the roof, and two rows of strip lights between them.
      for (let z = 0.8; z < 9.2; z += 1.4) R.add(part(new THREE.BoxGeometry(22.4, 0.16, 0.12), 0x46423d, 0, 3.5, z));
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
      for (const z of [3.2, 6.9]) {
        for (const x of [-7.5, -2.5, 2.5, 7.5]) {
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.22), lampMat);
          lamp.position.set(x, 3.55, z);
          R.add(lamp);
        }
      }
      for (const z of [3.2, 6.9]) {
        const under = new THREE.PointLight(0xffe8c8, 9, 16, 1.4);
        under.position.set(0, 3.25, z);
        R.add(under);
      }
      for (const x of [-4.5, 4.5]) R.add(part(new THREE.BoxGeometry(0.08, 1.6, 2.4), 0x55524c, x, 0.8, 6.3));
      const rail = new THREE.Group();
      rail.add(part(new THREE.BoxGeometry(22, 0.08, 0.08), 0x9a7a3a, 0, 1.05, 0));
      rail.add(part(new THREE.BoxGeometry(22, 0.06, 0.06), 0x9a7a3a, 0, 0.55, 0));
      for (let x = -10.5; x <= 10.5; x += 3) rail.add(part(new THREE.BoxGeometry(0.08, 1.08, 0.08), 0x6a6a6a, x, 0.54, 0));
      rail.position.z = 8.6;
      R.add(rail);
      {
        const bag = new THREE.CapsuleGeometry(0.22, 0.45, 2, 6);
        bag.rotateZ(Math.PI / 2);
        const bags = new THREE.InstancedMesh(bag, new THREE.MeshLambertMaterial({ color: 0x8e7d58, flatShading: true }), 60);
        const m = new THREE.Matrix4();
        const r = rng(77);
        let i = 0;
        for (const x0 of [-10.2, 7.2]) for (let row = 0; row < 3; row++) for (let k = 0; k < 10 && i < 60; k++) {
          m.makeRotationY((r() - 0.5) * 0.2).setPosition(x0 + k * 0.32 + (row % 2) * 0.16, 0.22 + row * 0.36, 9.4 + (r() - 0.5) * 0.1);
          bags.setMatrixAt(i++, m);
        }
        bags.count = i;
        R.add(bags);
      }
      // The bench, and the launcher lying on it.
      const BENCH = { x: 2.6, z: 6.2 };
      const bench = new THREE.Group();
      bench.add(part(new THREE.BoxGeometry(2.4, 0.08, 0.8), 0x6b5038, 0, 0.95, 0));
      for (const x of [-1.05, 1.05]) bench.add(part(new THREE.BoxGeometry(0.08, 0.95, 0.7), 0x3a3834, x, 0.47, 0));
      bench.position.set(BENCH.x, 0, BENCH.z);
      bench.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      R.add(bench);

      // The launcher: a fat tube with a grip, a sight and a warhead peeking
      // out the front. One copy rests on the bench; the other is carried.
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
      const resting = launcherModel();
      resting.position.set(BENCH.x, 1.06, BENCH.z);
      resting.rotation.set(0, 0.4, Math.PI / 2 - 0.05);
      resting.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      R.add(resting);
      // Carried: placed in front of the camera every frame.
      const carried = new THREE.Group();
      const held = launcherModel();
      held.position.set(0.34, -0.29, -0.22);
      held.scale.setScalar(0.85);
      held.rotation.y = 0.04;
      carried.add(held);
      carried.visible = false;
      R.scene.add(carried);
      let armed = false;
      let reload = 0;
      let kick = 0;

      // ---------- The town ----------
      // [centre x, near edge z, width, depth, height] in blocks.
      const PLAN = [
        [-120, 200, 9, 8, 14], [-80, 150, 8, 8, 9], [-55, 260, 10, 9, 26], [-20, 175, 7, 7, 18],
        [10, 230, 11, 9, 34], [45, 160, 9, 7, 11], [70, 280, 10, 10, 22], [105, 190, 8, 8, 16],
        [140, 250, 9, 8, 12], [-160, 300, 12, 10, 30], [30, 360, 12, 10, 40], [-90, 380, 10, 9, 20],
        [180, 360, 10, 10, 28],
      ];
      const lowTier = Q.density < 0.5;
      const plan = lowTier ? PLAN.filter((_, i) => i % 2 === 0 || i === 4) : PLAN;
      const blockGeo = new THREE.BoxGeometry(S * 0.98, S * 0.98, S * 0.98);
      const blockMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const C = new THREE.Color();
      const buildings = plan.map(([cx, nz, W, D, H], bi) => {
        const r = rng(900 + bi);
        const ox = cx - (W * S) / 2;
        const oz = nz;
        const n = W * H * D;
        const state = new Uint8Array(n); // 0 empty, 1 standing
        const glass = new Uint8Array(n);
        const inst = new Int32Array(n).fill(-1);
        const color = new Float32Array(n * 3);
        const tone = [0.55 + r() * 0.15, 0.52 + r() * 0.14, 0.5 + r() * 0.12];
        const cells = [];
        for (let j = 0; j < H; j++) for (let k = 0; k < D; k++) for (let i = 0; i < W; i++) {
          const shell = i === 0 || i === W - 1 || k === 0 || k === D - 1;
          const slab = j % 3 === 0;
          const core = Math.abs(i - W / 2 + 0.5) < 1 && Math.abs(k - D / 2 + 0.5) < 1;
          if (!(shell || slab || core)) continue;
          const id = i + W * (k + D * j);
          state[id] = 1;
          const window = shell && !slab && (i + k) % 2 === 1 && j > 0;
          glass[id] = window ? 1 : 0;
          const v = 0.9 + r() * 0.2;
          if (window) {
            if (r() < 0.12) C.setRGB(0.95, 0.68, 0.35);
            else C.setRGB(0.16 * v, 0.19 * v, 0.24 * v);
          } else C.setRGB(tone[0] * v, tone[1] * v, tone[2] * v);
          color.set([C.r, C.g, C.b], id * 3);
          cells.push(id);
        }
        const mesh = new THREE.InstancedMesh(blockGeo, blockMat, cells.length);
        const m = new THREE.Matrix4();
        cells.forEach((id, k) => {
          inst[id] = k;
          const i = id % W;
          const kk = Math.floor(id / W) % D;
          const j = Math.floor(id / (W * D));
          m.makeTranslation(ox + (i + 0.5) * S, (j + 0.5) * S, oz + (kk + 0.5) * S);
          mesh.setMatrixAt(k, m);
          C.fromArray(color, id * 3);
          mesh.setColorAt(k, C);
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        R.add(mesh);
        const base = cells.filter((id) => id < W * D).length;
        return { W, H, D, ox, oz, n, state, glass, inst, color, mesh, initial: state.slice(), base, down: false, dirty: false, smoke: 0 };
      });
      const cellOf = (b, x, y, z) => {
        const i = Math.floor((x - b.ox) / S);
        const j = Math.floor(y / S);
        const k = Math.floor((z - b.oz) / S);
        if (i < 0 || j < 0 || k < 0 || i >= b.W || j >= b.H || k >= b.D) return -1;
        return i + b.W * (k + b.D * j);
      };
      const cellCentre = (b, id, out) => {
        const i = id % b.W;
        const k = Math.floor(id / b.W) % b.D;
        const j = Math.floor(id / (b.W * b.D));
        return out.set(b.ox + (i + 0.5) * S, (j + 0.5) * S, b.oz + (k + 0.5) * S);
      };
      const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
      function hideCell(b, id) {
        b.state[id] = 0;
        if (b.inst[id] >= 0) b.mesh.setMatrixAt(b.inst[id], ZERO);
        b.mesh.instanceMatrix.needsUpdate = true;
      }

      // ---------- Debris ----------
      const MAXD = lowTier ? 1800 : 5000;
      const debrisMesh = new THREE.InstancedMesh(blockGeo, blockMat, MAXD);
      debrisMesh.castShadow = true;
      debrisMesh.frustumCulled = false;
      for (let i = 0; i < MAXD; i++) { debrisMesh.setMatrixAt(i, ZERO); debrisMesh.setColorAt(i, C.setRGB(0.5, 0.5, 0.5)); }
      // Only the part of the pool that's been used gets drawn.
      debrisMesh.count = 0;
      R.add(debrisMesh);
      const D_ = {
        p: new Float32Array(MAXD * 3), v: new Float32Array(MAXD * 3), r: new Float32Array(MAXD * 3), w: new Float32Array(MAXD * 3),
        s: new Float32Array(MAXD), live: new Uint8Array(MAXD), b: new Int16Array(MAXD), heavy: new Uint8Array(MAXD),
      };
      let nextDebris = 0;
      let activeDebris = 0;
      function spawnDebris(b, id, vx, vy, vz, scale, heavy) {
        const d = nextDebris;
        nextDebris = (nextDebris + 1) % MAXD;
        debrisMesh.count = Math.max(debrisMesh.count, d + 1);
        if (!D_.live[d]) activeDebris++;
        const c = cellCentre(b, id, tmpA);
        D_.p.set([c.x, c.y, c.z], d * 3);
        D_.v.set([vx, vy, vz], d * 3);
        D_.r.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], d * 3);
        const spin = heavy ? 1.2 : 6;
        D_.w.set([(Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin], d * 3);
        D_.s[d] = scale;
        D_.live[d] = 1;
        D_.b[d] = buildings.indexOf(b);
        D_.heavy[d] = heavy ? 1 : 0;
        C.fromArray(b.color, id * 3);
        debrisMesh.setColorAt(d, C);
        debrisMesh.instanceColor.needsUpdate = true;
      }
      const tmpA = new THREE.Vector3();
      const tmpB = new THREE.Vector3();
      const tmpQ = new THREE.Quaternion();
      const tmpE = new THREE.Euler();
      const tmpS = new THREE.Vector3();
      const tmpM = new THREE.Matrix4();

      // Anything standing with no path of standing blocks down to the
      // ground comes loose and falls, keeping a shared drift so whole
      // sections drop together.
      function settle(b) {
        b.dirty = false;
        if (b.down) return;
        const { W, H, D, state } = b;
        const seen = new Uint8Array(b.n);
        const stack = [];
        for (let id = 0; id < W * D; id++) if (state[id]) { seen[id] = 1; stack.push(id); }
        while (stack.length) {
          const id = stack.pop();
          const i = id % W;
          const k = Math.floor(id / W) % D;
          const j = Math.floor(id / (W * D));
          const near = [i > 0 ? id - 1 : -1, i < W - 1 ? id + 1 : -1, k > 0 ? id - W : -1, k < D - 1 ? id + W : -1, j > 0 ? id - W * D : -1, j < H - 1 ? id + W * D : -1];
          for (const nb of near) if (nb >= 0 && state[nb] && !seen[nb]) { seen[nb] = 1; stack.push(nb); }
        }
        const drift = [(Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2];
        let fell = 0;
        for (let id = 0; id < b.n; id++) {
          if (!state[id] || seen[id]) continue;
          hideCell(b, id);
          spawnDebris(b, id, drift[0], -0.5, drift[2], 1, true);
          fell++;
        }
        // A floor that's lost most of its blocks can't hold up what's above
        // it: everything above the lowest such floor comes down, pancaking
        // and drifting toward the damaged side.
        // Only the walls carry load, so floors (every third row) don't count.
        for (let j = 1; j < H - 1; j++) {
          if (j % 3 === 0) continue;
          let left = 0;
          let had = 0;
          let lx = 0;
          let lz = 0;
          for (let id = j * W * D; id < (j + 1) * W * D; id++) {
            if (!b.initial[id]) continue;
            had++;
            if (state[id]) left++;
            else { lx += (id % W) - W / 2; lz += (Math.floor(id / W) % D) - D / 2; }
          }
          if (!had || left > had * 0.7) continue;
          const len = Math.hypot(lx, lz) || 1;
          const dx = lx / len;
          const dz = lz / len;
          for (let id = (j + 1) * W * D; id < b.n; id++) {
            if (!state[id]) continue;
            const up = Math.floor(id / (W * D)) - j;
            hideCell(b, id);
            spawnDebris(b, id, dx * up * 0.18 + (Math.random() - 0.5) * 0.6, -1.5, dz * up * 0.18 + (Math.random() - 0.5) * 0.6, 1, true);
            fell++;
          }
          break;
        }
        // Too little left standing at the base: the whole thing comes down,
        // toppling the way it's weakest.
        let base = 0;
        let lean = 0;
        for (let id = 0; id < W * D; id++) if (state[id]) { base++; lean += (id % W) - W / 2; }
        if (base < b.base * 0.5 && b.H > 4) {
          b.down = true;
          const dir = lean > 0 ? -1 : 1;
          for (let id = 0; id < b.n; id++) {
            if (!state[id]) continue;
            const j = Math.floor(id / (W * D));
            hideCell(b, id);
            spawnDebris(b, id, dir * j * 0.12 + (Math.random() - 0.5) * 0.6, -j * 0.05, (Math.random() - 0.5) * 0.6, 1, true);
            fell++;
          }
          rumble(b, fell);
          surge(b, fell);
        } else if (fell > 40) {
          rumble(b, fell);
          surge(b, fell * 0.5);
        }
      }
      // The dust a collapse pushes out along the ground: a ring of it
      // rolling outward from the foot of the building and slowing, with
      // more boiling up as the wreckage lands.
      function surge(b, fell) {
        const cx = b.ox + (b.W * S) / 2;
        const cz = b.oz + (b.D * S) / 2;
        const r0 = (Math.max(b.W, b.D) * S) / 2;
        const n = Math.min(lowTier ? 18 : 42, 8 + fell / 40);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
          const sp = 9 + Math.random() * 9;
          puff(cx + Math.cos(a) * r0, 2 + Math.random() * 4, cz + Math.sin(a) * r0, {
            size: 10 + Math.random() * 7, grow: 3.4, life: 18 + Math.random() * 12, vy: 0.4 + Math.random() * 1.6,
            vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, drag: 0.45, color: 0xa09383, spread: 3, peak: 0.6,
          });
        }
      }

      // ---------- Effects: fire, smoke, dust, glass, flash ----------
      const flash = new THREE.PointLight(0xffa860, 0, 140, 1.2);
      R.add(flash);
      let flashT = 0;
      // Smoke and dust are drawn from a cluster of soft lumps, so a puff
      // reads as billowing rather than as a blurred disc.
      const smokeTex = canvasTex(128, 128, (g) => {
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
      }, { repeat: false });
      // Every puff, flame and glint is one instance of a square turned to
      // face you: one draw for all the smoke and dust, one for all the fire
      // and glass, however much is in the air. A particle drifts (with drag,
      // rising or falling), grows, turns slowly and fades; fire cools from
      // yellow to a dull red, glass twinkles as it tumbles.
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
                f = smoothstep(fogNear, fogFar, vFogDepth);
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
        };
      }
      const smoke = particles(lowTier ? 500 : 1400, false, smokeTex);
      const glow = particles(lowTier ? 300 : 800, true, glowTex);
      function puff(x, y, z, { size = 6, grow = 3, life = 6, vy = 2, vx = 0, vz = 0, drag = 0.15, color = 0x6a645e, fire = false, spread = 2, peak } = {}) {
        (fire ? glow : smoke).add(
          x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread * 0.5, z + (Math.random() - 0.5) * spread,
          { vx, vy, vz, size, grow: grow * (fire ? 1 : 0.8), life, color, peak: peak ?? (fire ? 0.9 : 0.6), drag: fire ? 0 : drag, gravity: fire ? 0 : -0.25, swirl: fire ? 0 : 0.5, kind: fire ? 1 : 0 },
        );
      }
      // A shard of window glass, flashing as it tumbles down.
      function glint(at, vx, vy, vz) {
        const k = () => 0.6 + Math.random() * 0.6;
        glow.add(at.x + (Math.random() - 0.5) * S, at.y + (Math.random() - 0.5) * S, at.z + (Math.random() - 0.5) * S, {
          vx: vx * k(), vy: vy * k(), vz: vz * k(), size: 0.7 + Math.random() * 0.6, grow: 0, life: 1.5 + Math.random() * 1.8,
          color: 0xfff4dc, peak: 1, drag: 0.6, gravity: 7, swirl: 0, kind: 2,
        });
      }
      // Scorch marks where a blast hits the ground.
      const scorchMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const scorches = Array.from({ length: 10 }, () => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), scorchMat);
        m.rotation.x = -Math.PI / 2;
        m.visible = false;
        R.add(m);
        return m;
      });
      let nextScorch = 0;
      function scorch(at) {
        const m = scorches[nextScorch];
        nextScorch = (nextScorch + 1) % scorches.length;
        m.position.set(at.x, 0.12, at.z);
        m.scale.setScalar(9 + Math.random() * 5);
        m.rotation.z = Math.random() * Math.PI * 2;
        m.visible = true;
      }

      // ---------- The missile ----------
      const rocket = new THREE.Group();
      {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), new THREE.MeshLambertMaterial({ color: 0x6d6a4a }));
        body.rotation.x = Math.PI / 2;
        const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        flame.scale.setScalar(1.6);
        flame.position.z = 0.5;
        rocket.add(body, flame);
      }
      rocket.visible = false;
      R.add(rocket);
      const rocketLight = new THREE.PointLight(0xffb060, 0, 45, 1.4);
      R.add(rocketLight);
      const missiles = [];
      const rootInv = new THREE.Quaternion();
      function fire() {
        if (!armed || reload > 0) return;
        reload = 0.9;
        kick = 1;
        const tip = held.userData.tip;
        tip.visible = false;
        const from = new THREE.Vector3();
        tip.getWorldPosition(from);
        R.root.worldToLocal(from);
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        R.root.getWorldQuaternion(rootInv).invert();
        dir.applyQuaternion(rootInv);
        const m = rocket.clone();
        m.visible = true;
        R.add(m);
        missiles.push({ m, p: from.clone(), v: dir.clone().multiplyScalar(140), age: 0 });
        api.launches.forEach((f) => f());
        for (let i = 0; i < 5; i++) {
          const ahead = 2.5 + Math.random() * 4;
          puff(from.x + dir.x * ahead, from.y + dir.y * ahead, from.z + dir.z * ahead, { size: 0.8, grow: 2, life: 1.4, vy: 0.3, color: 0xd8d2c8, spread: 0.6, peak: 0.35 });
        }
        puff(from.x + dir.x * 0.6, from.y + dir.y * 0.6, from.z + dir.z * 0.6, { size: 0.25, grow: 2.5, life: 0.07, vy: 0, color: 0xffd090, fire: true, spread: 0.05, peak: 0.7 });
      }

      function explode(at) {
        flash.position.copy(at).add(tmpB.set(0, 6, -6));
        flash.intensity = 900;
        flashT = 0;
        for (let i = 0; i < 10; i++) puff(at.x, at.y, at.z, { size: 5 + Math.random() * 5, grow: 9, life: 0.9 + Math.random() * 0.5, vy: 3, color: 0xffa040, fire: true, spread: 4 });
        for (let i = 0; i < 4; i++) puff(at.x, at.y, at.z, { size: 14, grow: 30, life: 0.25, vy: 0, color: 0xfff0d0, fire: true, spread: 1 });
        for (let i = 0; i < 14; i++) puff(at.x, at.y + 2, at.z, { size: 7, grow: 5, life: 7 + Math.random() * 5, vy: 3 + Math.random() * 3, color: 0x4a4440, spread: 7 });
        // Dust thrown out by the blast, slowing fast.
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 14 + Math.random() * 12;
          puff(at.x, at.y, at.z, { size: 4, grow: 6, life: 4 + Math.random() * 3, vy: 1 + Math.random() * 3, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, drag: 2.2, color: 0xa89a88, spread: 2, peak: 0.5 });
        }
        if (at.y < 1) scorch(at);
        // Blow out the blocks round the blast.
        const RAD = 4.8 * S;
        let hit = false;
        for (const b of buildings) {
          if (at.x < b.ox - RAD || at.x > b.ox + b.W * S + RAD || at.z < b.oz - RAD || at.z > b.oz + b.D * S + RAD || at.y > b.H * S + RAD) continue;
          const i0 = Math.max(0, Math.floor((at.x - RAD - b.ox) / S));
          const i1 = Math.min(b.W - 1, Math.floor((at.x + RAD - b.ox) / S));
          const j0 = Math.max(0, Math.floor((at.y - RAD) / S));
          const j1 = Math.min(b.H - 1, Math.floor((at.y + RAD) / S));
          const k0 = Math.max(0, Math.floor((at.z - RAD - b.oz) / S));
          const k1 = Math.min(b.D - 1, Math.floor((at.z + RAD - b.oz) / S));
          for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
            const id = i + b.W * (k + b.D * j);
            if (!b.state[id]) continue;
            cellCentre(b, id, tmpA);
            const d = tmpA.distanceTo(at);
            if (d > RAD * (0.8 + Math.random() * 0.35)) continue;
            const pane = b.glass[id];
            hideCell(b, id);
            const push = (1 - d / RAD) * 34 + 6;
            tmpB.subVectors(tmpA, at).normalize();
            spawnDebris(b, id, tmpB.x * push, tmpB.y * push + 8, tmpB.z * push, 0.45 + Math.random() * 0.3, false);
            // A window going: a spray of glass catching the low sun.
            if (pane) for (let g = 0; g < 4; g++) glint(tmpA, tmpB.x * push * 0.8, tmpB.y * push + 6, tmpB.z * push * 0.8);
            hit = true;
          }
          if (hit) { b.dirty = true; b.smoke = 25; b.smokeAt = at.clone(); }
        }
        api.booms.forEach((f) => f(at));
        return hit;
      }

      // ---------- Walking, input ----------
      const blockers = [{ x: BENCH.x - 0.8, z: BENCH.z, r: 0.45 }, { x: BENCH.x, z: BENCH.z, r: 0.45 }, { x: BENCH.x + 0.8, z: BENCH.z, r: 0.45 }];
      for (const x of [-4.5, 4.5]) blockers.push({ x, z: 5.6, r: 0.1 }, { x, z: 6.3, r: 0.1 }, { x, z: 7, r: 0.1 });
      const walls = [
        [BOX.x0, 0, -DOOR_HALF, 0], [DOOR_HALF, 0, BOX.x1, 0],
        [BOX.x0 - 1.7, 0, BOX.x0 - 1.7, 9], [BOX.x1 + 1.7, 0, BOX.x1 + 1.7, 9],
        [BOX.x0 - 2, 8.4, BOX.x1 + 2, 8.4],
      ];

      function reset() {
        for (const b of buildings) {
          b.state.set(b.initial);
          b.down = false;
          b.dirty = false;
          b.smoke = 0;
          const m = new THREE.Matrix4();
          for (let id = 0; id < b.n; id++) {
            if (b.inst[id] < 0) continue;
            cellCentre(b, id, tmpA);
            b.mesh.setMatrixAt(b.inst[id], m.makeTranslation(tmpA.x, tmpA.y, tmpA.z));
          }
          b.mesh.instanceMatrix.needsUpdate = true;
        }
        D_.live.fill(0);
        activeDebris = 0;
        for (let i = 0; i < MAXD; i++) debrisMesh.setMatrixAt(i, ZERO);
        debrisMesh.instanceMatrix.needsUpdate = true;
        smoke.clear();
        glow.clear();
        for (const sc of scorches) sc.visible = false;
        debrisMesh.count = 0;
      }

      let shake = 0;
      const rumbles = [];
      function rumble(b, count) {
        rumbles.push(() => api.collapses.forEach((f) => f(b, count)));
      }

      const api = {
        floor: () => 0,
        walls,
        blockers,
        crosshair: true,
        booms: [],
        launches: [],
        collapses: [],
        action: { label: "Rebuild the town", run: reset },
        onKey: (code) => { if (code === "KeyR") reset(); },
        onFire: fire,
        cameraFx() {
          if (shake <= 0.001) return null;
          return { x: (Math.random() - 0.5) * shake * 0.08, y: (Math.random() - 0.5) * shake * 0.06, roll: (Math.random() - 0.5) * shake * 0.01 };
        },
        update(t, dt, info) {
          sky.position.copy(R.camLocal);
          // Pick the launcher up by walking to the bench.
          const you = R.player;
          if (!armed && info.here && Math.hypot(you.x - BENCH.x, you.z - BENCH.z) < 1.7) {
            armed = true;
            resting.visible = false;
            toast("Launcher", TOUCH ? "Tap to fire · Rebuild button resets" : "Click to fire · R rebuilds the town");
          }
          carried.visible = armed && info.here;
          if (carried.visible) {
            carried.position.copy(camera.position);
            carried.quaternion.copy(camera.quaternion);
            kick = Math.max(0, kick - dt * 4);
            held.position.z = -0.22 + kick * 0.12;
            held.rotation.x = kick * 0.18;
          }
          if (reload > 0) {
            reload -= dt;
            if (reload <= 0) held.userData.tip.visible = true;
          }
          shake *= Math.exp(-dt * 5);

          // Missiles in flight: march along each step, checking the ground
          // and every block they pass.
          for (let mi = missiles.length - 1; mi >= 0; mi--) {
            const M = missiles[mi];
            M.age += dt;
            M.v.y -= 2.5 * dt;
            const steps = Math.ceil((M.v.length() * dt) / 0.6);
            let boom = null;
            for (let s = 0; s < steps && !boom; s++) {
              M.p.addScaledVector(M.v, dt / steps);
              if (M.p.y <= 0.1) { boom = M.p.clone().setY(0.4); break; }
              for (const b of buildings) {
                const id = cellOf(b, M.p.x, M.p.y, M.p.z);
                if (id >= 0 && b.state[id]) { boom = M.p.clone(); break; }
              }
            }
            M.m.position.copy(M.p);
            M.m.lookAt(tmpA.copy(M.p).sub(M.v));
            if (M.age > 0.04) puff(M.p.x, M.p.y, M.p.z, { size: 0.6, grow: 2.2, life: 2.2, vy: 0.2, color: 0xd8d2c8, spread: 0.2, peak: 0.5 });
            if (boom || M.age > 7) {
              if (boom) explode(boom);
              R.root.remove(M.m);
              missiles.splice(mi, 1);
            }
          }
          const lead = missiles[missiles.length - 1];
          rocketLight.intensity = lead ? 70 : 0;
          if (lead) rocketLight.position.copy(lead.p);

          // Buildings that lost blocks this frame: let loose sections fall.
          for (const b of buildings) if (b.dirty) settle(b);
          while (rumbles.length) rumbles.shift()();

          // Debris: gravity, tumbling, landing on the ground or on standing
          // blocks, and heavy pieces smashing what they land on.
          let breaks = 0;
          let moved = false;
          let dusts = 0;
          const p = D_.p;
          const v = D_.v;
          for (let d = 0; d < MAXD; d++) {
            if (D_.live[d] !== 1) continue;
            moved = true;
            const o = d * 3;
            v[o + 1] -= GRAV * dt;
            const drag = D_.heavy[d] ? 1 : Math.exp(-dt * 0.4);
            v[o] *= drag;
            v[o + 2] *= drag;
            p[o] += v[o] * dt;
            p[o + 1] += v[o + 1] * dt;
            p[o + 2] += v[o + 2] * dt;
            D_.r[o] += D_.w[o] * dt;
            D_.r[o + 1] += D_.w[o + 1] * dt;
            D_.r[o + 2] += D_.w[o + 2] * dt;
            const half = (S * D_.s[d]) / 2;
            let landed = false;
            if (p[o + 1] - half < 0) { p[o + 1] = half; landed = true; }
            else if (v[o + 1] < 0) {
              const b = buildings[D_.b[d]];
              const id = b ? cellOf(b, p[o], p[o + 1] - half, p[o + 2]) : -1;
              if (id >= 0 && b.state[id]) {
                if (D_.heavy[d] && v[o + 1] < -9 && breaks < 30 && Math.random() < 0.55) {
                  // A falling section punches through.
                  hideCell(b, id);
                  spawnDebris(b, id, v[o] * 0.5 + (Math.random() - 0.5) * 3, v[o + 1] * 0.4, v[o + 2] * 0.5 + (Math.random() - 0.5) * 3, 1, true);
                  b.dirty = true;
                  breaks++;
                  v[o + 1] *= 0.7;
                } else {
                  const j = Math.floor((p[o + 1] - half) / S);
                  p[o + 1] = (j + 1) * S + half;
                  landed = true;
                }
              }
            }
            if (landed) {
              const speed = Math.abs(v[o + 1]);
              v[o + 1] = speed > 3 ? speed * 0.22 : 0;
              v[o] *= 0.55;
              v[o + 2] *= 0.55;
              D_.w[o] *= 0.5;
              D_.w[o + 1] *= 0.5;
              D_.w[o + 2] *= 0.5;
              // A falling section hitting the ground throws up dust that rolls
              // outward from the building, low and slow: a collapse ends in a
              // cloud.
              if (D_.heavy[d] && speed > 7 && dusts < 6 && Math.random() < 0.2) {
                dusts++;
                const b = buildings[D_.b[d]];
                const ox = p[o] - (b.ox + (b.W * S) / 2);
                const oz = p[o + 2] - (b.oz + (b.D * S) / 2);
                const l = Math.hypot(ox, oz) || 1;
                const out = 3 + Math.random() * 6;
                puff(p[o], Math.max(1.5, p[o + 1]), p[o + 2], { size: 8 + Math.random() * 7, grow: 3.2, life: 14 + Math.random() * 12, vy: 0.3 + Math.random() * 0.8, vx: (ox / l) * out, vz: (oz / l) * out, drag: 0.3, color: 0x9c8f80, spread: 2, peak: 0.55 });
              } else if (speed > 12 && Math.random() < 0.06) puff(p[o], p[o + 1], p[o + 2], { size: 4, grow: 5, life: 4, vy: 1, color: 0x8a7e70, spread: 2 });
              if (speed < 1.5 && Math.hypot(v[o], v[o + 2]) < 0.6) D_.live[d] = 2; // at rest
            }
            tmpE.set(D_.r[o], D_.r[o + 1], D_.r[o + 2]);
            tmpQ.setFromEuler(tmpE);
            tmpS.setScalar(D_.s[d]);
            debrisMesh.setMatrixAt(d, tmpM.compose(tmpA.set(p[o], p[o + 1], p[o + 2]), tmpQ, tmpS));
          }
          if (moved) debrisMesh.instanceMatrix.needsUpdate = true;

          // Smoke rising from damaged buildings for a while.
          for (const b of buildings) {
            if (b.smoke <= 0) continue;
            b.smoke -= dt;
            if (Math.random() < dt * 2.2) puff(b.smokeAt.x, Math.max(1, b.smokeAt.y), b.smokeAt.z, { size: 6, grow: 4, life: 9, vy: 4, color: 0x3e3a38, spread: 4 });
            if (Math.random() < dt * 1.5) puff(b.smokeAt.x, Math.max(1, b.smokeAt.y), b.smokeAt.z, { size: 3, grow: 1, life: 0.8, vy: 2, color: 0xff8a30, fire: true, spread: 3 });
          }
          smoke.step(dt);
          glow.step(dt);
          if (flash.intensity > 0) {
            flashT += dt;
            flash.intensity = Math.max(0, 900 * Math.exp(-flashT * 6));
          }
        },
        shakeAt(at, strength) {
          const d = Math.max(30, at.distanceTo(R.camLocal));
          shake = Math.max(shake, strength * Math.min(1, 160 / d));
        },
      };
      // The ground shakes when the blast wave gets here, not when it happens.
      api.booms.push((at) => {
        const delay = at.distanceTo(R.camLocal) / 343;
        setTimeout(() => api.shakeAt(at, 1.4), delay * 1000);
      });
      return api;
    },
    sound(A, R, api) {
      // Wind across the range, the launch, booms that arrive at the speed of
      // sound, and the long roar of a building coming down.
      const wind = A.gain(0.05);
      A.hiss().connect(A.filter("lowpass", 420, 0.6)).connect(wind).connect(A.bus);
      const ctx = A.ctx;
      const oneShot = (at, len) => {
        const src = ctx.createBufferSource();
        src.buffer = audio.noise;
        src.start(at, Math.random() * 1.5, len);
        return src;
      };
      api.launches.push(() => {
        const t = ctx.currentTime;
        const f = A.filter("bandpass", 900, 0.8);
        const g = A.gain(0);
        oneShot(t, 1.4).connect(f).connect(g).connect(A.bus);
        f.frequency.setValueAtTime(1400, t);
        f.frequency.exponentialRampToValueAtTime(280, t + 1.2);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.9, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
        const thump = A.osc("sine", 90);
        const tg = A.gain(0);
        thump.connect(tg).connect(A.bus);
        tg.gain.setValueAtTime(0.8, t);
        tg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        thump.frequency.exponentialRampToValueAtTime(40, t + 0.25);
        thump.stop(t + 0.3);
      });
      api.booms.push((at) => {
        const dist = at.distanceTo(R.camLocal);
        const t = ctx.currentTime + dist / 343;
        const loud = Math.min(1.4, 220 / Math.max(40, dist));
        const low = A.filter("lowpass", 220, 0.7);
        const g = A.gain(0);
        oneShot(t, 3.5).connect(low).connect(g).connect(A.bus);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(loud * 2.2, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
        low.frequency.setValueAtTime(600, t);
        low.frequency.exponentialRampToValueAtTime(90, t + 1.5);
        const sub = A.osc("sine", 55);
        const sg = A.gain(0);
        sub.connect(sg).connect(A.bus);
        sg.gain.setValueAtTime(0, t);
        sg.gain.linearRampToValueAtTime(loud * 1.6, t + 0.02);
        sg.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        sub.frequency.setValueAtTime(70, t);
        sub.frequency.exponentialRampToValueAtTime(28, t + 1.1);
        sub.stop(t + 1.3);
        // The crack on top, which dies off with distance faster than the boom.
        const crack = A.filter("highpass", 1800, 0.7);
        const cg = A.gain(0);
        oneShot(t, 0.6).connect(crack).connect(cg).connect(A.bus);
        cg.gain.setValueAtTime(loud * loud * 0.8, t);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      });
      api.collapses.push((b, count) => {
        const at = new THREE.Vector3(b.ox + (b.W * S_RANGE) / 2, 10, b.oz + (b.D * S_RANGE) / 2);
        const dist = at.distanceTo(R.camLocal);
        const t = ctx.currentTime + dist / 343;
        const len = Math.min(7, 2 + count / 300);
        const loud = Math.min(1, 200 / Math.max(40, dist)) * Math.min(1, count / 200 + 0.3);
        const low = A.filter("lowpass", 160, 0.5);
        const g = A.gain(0);
        oneShot(t, len + 0.5).connect(low).connect(g).connect(A.bus);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(loud * 1.8, t + 0.6);
        g.gain.setTargetAtTime(0, t + len * 0.6, len * 0.25);
        // Rattle of falling concrete over the roar.
        const rattle = A.filter("bandpass", 900, 0.8);
        const rg = A.gain(0);
        oneShot(t, len).connect(rattle).connect(rg).connect(A.bus);
        for (let k = 0; k < len; k += 0.05 + Math.random() * 0.08) rg.gain.setValueAtTime(Math.random() < 0.5 ? 0 : loud * 0.5 * Math.random(), t + k);
        rg.gain.setValueAtTime(0, t + len);
      });
      return {};
    },
  };
  const S_RANGE = 1.6;
