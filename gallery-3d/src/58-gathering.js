  // ---------- The Gathering ----------
  // You step out of a doorway in a cliff onto a stone lookout high above a
  // great basin at dusk. Below, a tribe of ancient people has gathered
  // in their hundreds: most kneel and bow toward the far side, some stand
  // with their arms raised, some dance round bonfires, a few fight. Across
  // the basin, hung from a timber frame as tall as a tower, one of the
  // photographs, huge, facing them all. Every so often it changes; a hush,
  // then a roar rolls back through the crowd.

  ROOMS.gathering = {
    name: "The Gathering",
    short: "Gathering",
    tagline: "They came to see the picture",
    color: 0xe0904a,
    leak: 0xff9a50,
    leakStyle: "flicker",
    frame: 0x3a2a1e,
    fogColor: 0x2a1a20,
    loudness: 1.0,
    ground: "gravel",
    entrance: { x: 0, z: 0, nx: 0, nz: -1 },
    spawn: { x: 0, z: 1.4, yaw: Math.PI, pitch: -0.08 },
    spots: {
      edge: { name: "At the Edge", x: 0, z: 5.3, yaw: Math.PI, pitch: -0.18 },
    },
    build(R) {
      const D = Q.density;
      const FLOOR = -38; // the basin, far below the lookout
      const PZ = 175; // the photo, across the basin
      R.scene.fog = new THREE.FogExp2(0x2a1a20, 0.0032);

      // ---------- Light ----------
      R.add(new THREE.HemisphereLight(0x6a5070, 0x24160e, 0.55));
      const dusk = new THREE.DirectionalLight(0xff9a6a, 0.6);
      dusk.position.set(-60, 40, 200);
      R.add(dusk, dusk.target);
      const sky = skyDome({ top: 0x14122a, mid: 0x4a2a44, low: 0xd8704a, sunDir: new THREE.Vector3(-0.3, 0.05, 1), glow: [1.0, 0.5, 0.3], tight: 30, spread: 4, glowAmt: [0.6, 0.2] });
      R.add(sky);

      // ---------- The lookout and the cliffs ----------
      const rockTex = canvasTex(256, 256, (g) => {
        const r = rng(3101);
        g.fillStyle = "#4a3e36";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 400; i++) {
          const v = 40 + r() * 50;
          g.fillStyle = `rgba(${v + 10}, ${v}, ${v - 8}, 0.5)`;
          g.fillRect(r() * 256, r() * 256, 4 + r() * 30, 2 + r() * 10);
        }
      });
      rockTex.repeat.set(6, 6);
      const rock = new THREE.MeshLambertMaterial({ map: rockTex, flatShading: true });
      const stone = new THREE.MeshLambertMaterial({ color: 0x6a5a4c, flatShading: true });
      // The cliff face you come out of, with the doorway.
      const face = wallFaces(60, 30, rock, { x: 0, half: DOOR_HALF, h: DOOR_H }, null);
      R.add(face);
      // The cliff dropping away beneath the lookout, and the ledge itself.
      const cliff = new THREE.Mesh(new THREE.BoxGeometry(60, -FLOOR, 7), rock);
      cliff.position.set(0, FLOOR / 2 - 0.3, 3.5);
      R.add(cliff);
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.3, 6.4), stone);
      ledge.position.set(0, -0.15, 3.2);
      R.add(ledge);
      // A rough parapet of stacked stones along the edge.
      const r0 = rng(3102);
      for (let x = -5; x <= 5; x += 0.4) {
        const s = 0.26 + r0() * 0.14;
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stone);
        b.position.set(x, s * 0.7, 6.15 + (r0() - 0.5) * 0.1);
        b.rotation.set(r0() * 3, r0() * 3, 0);
        R.add(b);
      }
      for (const s of [-1, 1]) {
        for (let z = 0.4; z < 6; z += 0.6) {
          const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + r0() * 0.12, 0), stone);
          b.position.set(s * 5.1, 0.22, z);
          b.rotation.set(r0() * 3, r0() * 3, 0);
          R.add(b);
        }
      }
      // Torches either side of the lookout.
      const flames = [];
      const flameMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      const torchLight = new THREE.PointLight(0xff9040, 8, 14, 1.5);
      torchLight.position.set(0, 2.2, 5.6);
      R.add(torchLight);
      for (const s of [-1, 1]) {
        R.add(part(new THREE.CylinderGeometry(0.05, 0.07, 2.0, 6), 0x3a2a1a, s * 4.4, 1.0, 5.8));
        const f = new THREE.Sprite(flameMat.clone());
        f.position.set(s * 4.4, 2.15, 5.8);
        f.scale.set(0.7, 1.0, 1);
        R.add(f);
        flames.push({ sp: f, base: 0.7, phase: s * 2 });
      }
      // The basin floor, and the ring of cliffs round it.
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshLambertMaterial({ color: 0x3a2a20 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, FLOOR, 120);
      R.add(ground);
      {
        const segs = 48;
        const pos = [];
        const r = rng(3103);
        const hts = Array.from({ length: segs + 1 }, () => 50 + r() * 70);
        hts[segs] = hts[0];
        const cx = 0, cz = 110, RAD = 190;
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * Math.PI * 2;
          const a1 = ((i + 1) / segs) * Math.PI * 2;
          const p = (a, rr, y) => [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
          const A = p(a0, RAD, FLOOR), B = p(a1, RAD, FLOOR), C = p(a1, RAD - 25, FLOOR + hts[i + 1]), Dd = p(a0, RAD - 25, FLOOR + hts[i]);
          pos.push(...A, ...C, ...B, ...A, ...Dd, ...C);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.computeVertexNormals();
        const ring = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x3a2e28, flatShading: true, side: THREE.DoubleSide }));
        R.add(ring);
      }

      // ---------- The photograph ----------
      // Hung from a crossbeam between two great timber posts, lashed with
      // rope, braziers burning at their feet. The picture itself is always
      // shown as it is: no light or haze over it.
      const FW = 46; // the opening the picture hangs in
      const FH = 32;
      const PY = FLOOR + 9 + FH / 2; // its centre
      const timber = 0x3a2818;
      for (const s of [-1, 1]) {
        R.add(part(new THREE.CylinderGeometry(0.9, 1.2, FH + 22, 8), timber, s * (FW / 2 + 2), FLOOR + (FH + 22) / 2, PZ));
        // Bones and skulls strung from the posts.
        for (let k = 0; k < 6; k++) R.add(part(new THREE.IcosahedronGeometry(0.5, 0), 0xd8ccb0, s * (FW / 2 + 3.1), FLOOR + 6 + k * 3.5, PZ - 0.5));
      }
      R.add(part(new THREE.BoxGeometry(FW + 9, 1.6, 1.6), timber, 0, PY + FH / 2 + 4, PZ));
      const ropeMat = new THREE.MeshLambertMaterial({ color: 0x8a7050 });
      const pics = [0, 1].map((k) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false, fog: false, transparent: true, opacity: k ? 0 : 1, depthWrite: false }));
        m.position.set(0, PY, PZ - 0.3 - k * 0.05);
        m.rotation.y = Math.PI;
        m.renderOrder = 5 + k;
        R.add(m);
        return m;
      });
      const ropes = [-1, 1].map((s) => {
        const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 5), ropeMat);
        R.add(rp);
        return { rp, s };
      });
      const SHOW = ["4", "DSC06067", "3", "Cruise-6", "Cruise-5", "2-alt", "DSC06060", "DSC05238", "DSC04824", "5-alt", "DSC05752", "a2"].filter((st) => PHOTO[st]);
      let showing = -1;
      let changedAt = -100;
      let fading = false;
      const record = { mesh: pics[0], photo: null, w: 80, h: 60 };
      R.reg.photos.push(record);
      function hang(m, stem) {
        const P = PHOTO[stem];
        const asp = P.w / P.h;
        const w = Math.min(FW, FH * asp);
        const h = w / asp;
        m.material.map = photoTexture(stem, R.reg);
        m.material.needsUpdate = true;
        m.scale.set(w, h, 1);
        return h;
      }
      function show(i, t) {
        showing = i;
        changedAt = t;
        // The incoming picture goes on the back plane and fades in over the
        // old one, then swaps to the front.
        const h = hang(pics[1], SHOW[i]);
        pics[1].userData.h = h;
        fading = true;
        record.photo = PHOTO[SHOW[i]];
      }
      {
        const h = hang(pics[0], SHOW[0]);
        pics[0].userData.h = h;
        showing = 0;
        record.photo = PHOTO[SHOW[0]];
      }
      // Braziers at the foot of the frame.
      const brazierLight = new THREE.PointLight(0xff8a3a, 900, 70, 1.4);
      brazierLight.position.set(0, FLOOR + 6, PZ - 14);
      R.add(brazierLight);
      for (const s of [-1, 1]) {
        R.add(part(new THREE.CylinderGeometry(1.4, 0.8, 1.6, 8), 0x2a2420, s * (FW / 2 - 2), FLOOR + 0.8, PZ - 8));
        const f = new THREE.Sprite(flameMat.clone());
        f.position.set(s * (FW / 2 - 2), FLOOR + 3.2, PZ - 8);
        f.scale.set(4, 5.5, 1);
        R.add(f);
        flames.push({ sp: f, base: 4, phase: s * 3 });
      }

      // ---------- Bonfires ----------
      const FIRES = [];
      {
        const r = rng(3201);
        for (let i = 0; i < (D < 0.5 ? 7 : 12); i++) FIRES.push({ x: (r() - 0.5) * 110, z: 45 + r() * 95, rad: 4.5 + r() * 2 });
      }
      const fireLights = FIRES.slice(0, D < 0.5 ? 2 : 4).map((f) => {
        const l = new THREE.PointLight(0xff8a3a, 420, 40, 1.4);
        l.position.set(f.x, FLOOR + 3, f.z);
        R.add(l);
        return l;
      });
      const smokeMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x2a2224, transparent: true, depthWrite: false, opacity: 0.35 });
      const smoke = [];
      for (const f of FIRES) {
        R.add(part(new THREE.ConeGeometry(1.1, 1.0, 6), 0x2a1a10, f.x, FLOOR + 0.5, f.z));
        const fl = new THREE.Sprite(flameMat.clone());
        fl.position.set(f.x, FLOOR + 1.8, f.z);
        fl.scale.set(2.6, 3.6, 1);
        R.add(fl);
        flames.push({ sp: fl, base: 2.6, phase: f.x });
        for (let k = 0; k < 4; k++) {
          const sp = new THREE.Sprite(smokeMat);
          R.add(sp);
          smoke.push({ sp, f, phase: k / 4 });
        }
      }

      // ---------- The people ----------
      // Chunky, primitive figures in skins and paint, one merged shape per
      // pose, drawn in their hundreds as instances. Skin and hide are baked
      // in as vertex colours; each person's colour varies them a little.
      const SKIN = new THREE.Color(0x9a6a48);
      const HIDE = new THREE.Color(0x5a4030);
      const HAIR = new THREE.Color(0x1e1610);
      const figure = (bits) => {
        const geos = bits.map(([w, h, d, x, y, z, col, rx = 0, rz = 0]) => {
          const g = new THREE.BoxGeometry(w, h, d);
          g.rotateX(rx);
          g.rotateZ(rz);
          g.translate(x, y, z);
          const c = new Float32Array(g.attributes.position.count * 3);
          for (let i = 0; i < c.length; i += 3) col.toArray(c, i);
          g.setAttribute("color", new THREE.BufferAttribute(c, 3));
          g.deleteAttribute("uv");
          return g;
        });
        return mergeGeometries(geos);
      };
      const head = [[0.24, 0.26, 0.24, 0, 0, 0, SKIN], [0.27, 0.12, 0.27, 0, 0.12, -0.02, HAIR]];
      const at = (list, dx, dy, dz) => list.map(([w, h, d, x, y, z, c, rx, rz]) => [w, h, d, x + dx, y + dy, z + dz, c, rx, rz]);
      // Kneeling, bent forward, arms reaching out on the ground.
      const kneelGeo = figure([
        [0.36, 0.2, 0.55, 0, 0.12, -0.1, SKIN],
        [0.4, 0.55, 0.26, 0, 0.5, 0.05, HIDE, 0.9],
        ...at(head, 0, 0.62, 0.42),
        [0.1, 0.1, 0.6, -0.18, 0.18, 0.55, SKIN],
        [0.1, 0.1, 0.6, 0.18, 0.18, 0.55, SKIN],
      ]);
      // Standing, arms raised to the picture.
      const raiseGeo = figure([
        [0.13, 0.8, 0.16, -0.1, 0.4, 0, SKIN],
        [0.13, 0.8, 0.16, 0.1, 0.4, 0, SKIN],
        [0.44, 0.45, 0.26, 0, 0.95, 0, HIDE],
        [0.4, 0.25, 0.24, 0, 1.25, 0, SKIN],
        ...at(head, 0, 1.55, 0),
        [0.1, 0.7, 0.1, -0.32, 1.7, 0.05, SKIN, 0, 0.45],
        [0.1, 0.7, 0.1, 0.32, 1.7, 0.05, SKIN, 0, -0.45],
      ]);
      // Dancing: one arm up, one out, a knee lifted.
      const danceGeo = figure([
        [0.13, 0.8, 0.16, -0.1, 0.4, 0, SKIN],
        [0.13, 0.5, 0.16, 0.12, 0.6, 0.15, SKIN, -0.9],
        [0.44, 0.45, 0.26, 0, 0.95, 0, HIDE],
        [0.4, 0.25, 0.24, 0, 1.25, 0, SKIN],
        ...at(head, 0, 1.55, 0),
        [0.1, 0.7, 0.1, -0.35, 1.65, 0, SKIN, 0, 0.6],
        [0.6, 0.1, 0.1, 0.5, 1.3, 0, SKIN],
      ]);
      // Fighting: a club raised overhead, leaning in.
      const fightGeo = figure([
        [0.13, 0.8, 0.16, -0.14, 0.4, -0.08, SKIN],
        [0.13, 0.8, 0.16, 0.14, 0.4, 0.1, SKIN],
        [0.46, 0.48, 0.28, 0, 0.98, 0, HIDE, 0.25],
        [0.42, 0.25, 0.25, 0, 1.28, 0.08, SKIN],
        ...at(head, 0, 1.56, 0.14),
        [0.1, 0.65, 0.1, 0.3, 1.65, 0.0, SKIN, 0.4, -0.3],
        [0.12, 0.9, 0.12, 0.42, 2.15, -0.15, new THREE.Color(0x4a3420), -0.5, -0.3],
        [0.1, 0.55, 0.1, -0.3, 1.2, 0.3, SKIN, -1.2],
      ]);
      const crowdMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const scale = D < 0.5 ? 0.55 : 1;
      const groups = [];
      const crowdGroup = (geo, list) => {
        const mesh = new THREE.InstancedMesh(geo, crowdMat, Math.max(1, list.length));
        mesh.count = list.length;
        mesh.frustumCulled = false;
        list.forEach((p, i) => mesh.setColorAt(i, new THREE.Color().setHSL(0.07, 0.25 + p.c * 0.3, 0.45 + p.c * 0.35)));
        R.add(mesh);
        groups.push({ mesh, list });
        return { mesh, list };
      };
      const r = rng(3301);
      const nearFire = (x, z) => FIRES.some((f) => Math.hypot(x - f.x, z - f.z) < f.rad + 1.5);
      const toPhoto = (x, z) => Math.atan2(0 - x, PZ - z);
      // Kneelers fill the ground nearest the picture, thickest in front.
      const kneelers = [];
      for (let i = 0; i < 900 * scale; i++) {
        const z = PZ - 14 - Math.pow(r(), 1.3) * 80;
        const spread = 25 + (PZ - z) * 0.45;
        const x = (r() - 0.5) * 2 * spread;
        if (nearFire(x, z)) continue;
        kneelers.push({ x, z, yaw: toPhoto(x, z) + (r() - 0.5) * 0.3, ph: r() * 6, sp: 0.6 + r() * 0.5, c: r() });
      }
      // Standing worshippers further back, arms raised.
      const raisers = [];
      for (let i = 0; i < 520 * scale; i++) {
        const z = 30 + r() * 90;
        const x = (r() - 0.5) * 2 * (30 + (PZ - z) * 0.25);
        if (nearFire(x, z)) continue;
        raisers.push({ x, z, yaw: toPhoto(x, z) + (r() - 0.5) * 0.4, ph: r() * 6, sp: 0.8 + r() * 0.6, c: r() });
      }
      // Dancers circling every fire.
      const dancers = [];
      for (const f of FIRES) {
        const n = 10 + Math.floor(r() * 8);
        for (let k = 0; k < n; k++) dancers.push({ f, a: (k / n) * Math.PI * 2, rad: f.rad - 0.5 + r() * 1.2, ph: r() * 6, sp: 0.25 + r() * 0.15, c: r() });
      }
      // A few fights out at the edges, pairs circling and swinging.
      const fighters = [];
      for (let k = 0; k < 8; k++) {
        const side = k % 2 ? 1 : -1;
        const cx = side * (35 + r() * 25);
        const cz = 40 + r() * 80;
        for (const s of [0, 1]) fighters.push({ cx, cz, s, ph: r() * 6, c: r() });
      }
      const gK = crowdGroup(kneelGeo, kneelers);
      const gR = crowdGroup(raiseGeo, raisers);
      const gD = crowdGroup(danceGeo, dancers);
      const gF = crowdGroup(fightGeo, fighters);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler(0, 0, 0, "YXZ");
      const v = new THREE.Vector3();
      const one = new THREE.Vector3(1, 1, 1);
      const put = (mesh, i, x, y, z, yaw, pitch = 0, roll = 0, s = 1) => {
        e.set(pitch, yaw, roll);
        q.setFromEuler(e);
        m4.compose(v.set(x, y, z), q, one.set(s, s, s));
        mesh.setMatrixAt(i, m4);
      };

      // ---------- Where you can walk ----------
      const walls = [[-5, 0, -0.8, 0], [0.8, 0, 5, 0], [-5, 0, -5, 6], [5, 0, 5, 6], [-5, 5.9, 5, 5.9]];

      const motion = { cheer: 0, changedAt: -100 };
      return {
        walls,
        blockers: [],
        people: [],
        noShove: true,
        crowd: motion,
        update(t, dt) {
          sky.position.copy(R.camLocal);
          // Every 45 seconds, the next picture.
          if (t - changedAt > 45 && t > 20) {
            show((showing + 1) % SHOW.length, t);
            motion.changedAt = t;
          }
          const since = t - changedAt;
          if (since < 3) {
            pics[1].material.opacity = THREE.MathUtils.smoothstep(since, 0, 3);
          } else if (fading) {
            fading = false;
            // Settle: the new picture becomes the front one.
            pics[0].material.map = pics[1].material.map;
            pics[0].scale.copy(pics[1].scale);
            pics[0].userData.h = pics[1].userData.h;
            pics[0].material.needsUpdate = true;
            pics[1].material.opacity = 0;
          }
          for (const { rp, s } of ropes) {
            const h = Math.max(pics[0].userData.h ?? FH, pics[1].material.opacity > 0.5 ? pics[1].userData.h ?? FH : 0);
            const top = PY + FH / 2 + 3.2;
            const bot = PY + h / 2;
            rp.scale.y = top - bot;
            rp.position.set(s * (FW / 2 - 4), (top + bot) / 2, PZ - 0.25);
          }
          // Flames flicker.
          for (const f of flames) {
            const k = 0.85 + 0.15 * Math.sin(t * 13 + f.phase) * Math.sin(t * 7.1 + f.phase * 2);
            f.sp.scale.set(f.base * k, f.base * 1.4 * (0.9 + 0.2 * Math.sin(t * 9 + f.phase)), 1);
          }
          torchLight.intensity = 8 * (0.85 + 0.15 * Math.sin(t * 11));
          fireLights.forEach((l, k) => { l.intensity = 420 * (0.8 + 0.2 * Math.sin(t * 9 + k * 2)); });
          brazierLight.intensity = 900 * (0.85 + 0.15 * Math.sin(t * 7));
          for (const s of smoke) {
            const u = (t * 0.08 + s.phase) % 1;
            s.sp.position.set(s.f.x + Math.sin(u * 5 + s.f.z) * 2 + u * 6, FLOOR + 3 + u * 30, s.f.z + u * 3);
            s.sp.scale.setScalar(3 + u * 14);
            s.sp.material.opacity = 0.35;
          }
          // The crowd's roar when the picture changes: a wave rolling back
          // from the front, at about 25 m a second.
          const wave = (z) => {
            const d = PZ - z;
            const w = since - 3 - d / 25;
            return w > 0 ? Math.exp(-w * w * 1.5) : 0;
          };
          gK.list.forEach((p, i) => {
            const bow = 0.5 + 0.5 * Math.sin(t * p.sp + p.ph);
            const up = wave(p.z);
            put(gK.mesh, i, p.x, FLOOR, p.z, p.yaw, bow * 0.35 - up * 0.6);
          });
          gR.list.forEach((p, i) => {
            const up = wave(p.z);
            const hop = Math.max(0, Math.sin(t * 2.2 * p.sp + p.ph)) * 0.08 + up * 0.5 * Math.abs(Math.sin(t * 9 + p.ph));
            put(gR.mesh, i, p.x, FLOOR + hop, p.z, p.yaw, -up * 0.2, Math.sin(t * p.sp + p.ph) * 0.15);
          });
          gD.list.forEach((p, i) => {
            const a = p.a + t * p.sp;
            const hop = Math.abs(Math.sin(t * 4 + p.ph)) * 0.35;
            const x = p.f.x + Math.cos(a) * p.rad;
            const z = p.f.z + Math.sin(a) * p.rad;
            put(gD.mesh, i, x, FLOOR + hop, z, -a + Math.sin(t * 3 + p.ph) * 0.8, 0, Math.sin(t * 4 + p.ph) * 0.25);
          });
          gF.list.forEach((p, i) => {
            const a = t * 0.6 + p.ph * 0.1 + (p.s ? Math.PI : 0);
            const lunge = Math.max(0, Math.sin(t * 2.6 + p.ph + p.s * 1.5));
            const rad = 1.1 - lunge * 0.4;
            const x = p.cx + Math.cos(a) * rad;
            const z = p.cz + Math.sin(a) * rad;
            put(gF.mesh, i, x, FLOOR, z, Math.atan2(p.cx - x, p.cz - z), lunge * 0.35);
          });
          for (const g of groups) g.mesh.instanceMatrix.needsUpdate = true;
          motion.cheer = wave(PZ - 40);
        },
      };
    },
    sound(A, R, api) {
      const c = api.crowd;
      // The crowd: a low murmur, drums, a deep chant, and a roar when the
      // picture changes. Nothing high or steady.
      const murmur = A.gain(0.06);
      A.hiss().connect(A.filter("bandpass", 420, 0.6)).connect(A.filter("lowpass", 1200)).connect(murmur).connect(A.bus);
      const rumble = A.gain(0.08);
      A.hiss().connect(A.filter("lowpass", 120, 0.7)).connect(rumble).connect(A.bus);
      // Drums, from somewhere down by the fires: boom, boom, tak.
      const drum = A.osc("sine", 58);
      const drumAmp = A.gain(0);
      drum.connect(drumAmp).connect(A.bus);
      const tak = A.gain(0);
      A.hiss().connect(A.filter("bandpass", 900, 1.5)).connect(tak).connect(A.bus);
      // A chant: many low voices on "hoo - ah", rising and falling.
      const chant = A.osc("sawtooth", 98);
      const chant2 = A.osc("sawtooth", 147);
      const chantTone = A.filter("bandpass", 420, 1.2);
      const chantAmp = A.gain(0);
      chant.connect(chantTone);
      chant2.connect(chantTone);
      chantTone.connect(A.filter("lowpass", 900)).connect(chantAmp).connect(A.bus);
      const roar = A.gain(0);
      A.hiss().connect(A.filter("bandpass", 700, 0.5)).connect(A.filter("lowpass", 2400)).connect(roar).connect(A.bus);
      const BEAT = 60 / 92;
      let beat = A.ctx.currentTime + 0.5;
      let n = 0;
      A.extras.push((until) => {
        beat = Math.max(beat, A.ctx.currentTime);
        while (beat < until) {
          const k = n % 4;
          if (k !== 3) {
            drumAmp.gain.setValueAtTime(0.0001, beat);
            drumAmp.gain.linearRampToValueAtTime(k === 0 ? 0.35 : 0.22, beat + 0.01);
            drumAmp.gain.exponentialRampToValueAtTime(0.0001, beat + 0.35);
            drum.frequency.setValueAtTime(70, beat);
            drum.frequency.exponentialRampToValueAtTime(45, beat + 0.3);
          } else {
            tak.gain.setValueAtTime(0.0001, beat);
            tak.gain.linearRampToValueAtTime(0.08, beat + 0.005);
            tak.gain.exponentialRampToValueAtTime(0.0001, beat + 0.08);
          }
          if (n % 8 === 0) {
            // Hoo...
            chantTone.frequency.setValueAtTime(380, beat);
            chantAmp.gain.setTargetAtTime(0.03, beat, 0.15);
            chantAmp.gain.setTargetAtTime(0.0, beat + BEAT * 2.2, 0.2);
            // ...ah.
            chantTone.frequency.setValueAtTime(700, beat + BEAT * 4);
            chantAmp.gain.setTargetAtTime(0.035, beat + BEAT * 4, 0.1);
            chantAmp.gain.setTargetAtTime(0.0, beat + BEAT * 5.5, 0.25);
          }
          beat += BEAT;
          n++;
        }
      });
      let lastChange = -1;
      return {
        update() {
          const now = A.ctx.currentTime;
          if (c.changedAt !== lastChange) {
            lastChange = c.changedAt;
            if (c.changedAt > 0) {
              // A hush as it changes, then the roar.
              murmur.gain.setTargetAtTime(0.015, now, 0.3);
              murmur.gain.setTargetAtTime(0.06, now + 6, 1.5);
              roar.gain.setTargetAtTime(0.18, now + 3.2, 0.4);
              roar.gain.setTargetAtTime(0.0, now + 6.5, 1.8);
            }
          }
        },
      };
    },
  };
