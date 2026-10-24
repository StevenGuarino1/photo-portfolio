  // ---------- The Moor ----------
  // A lone doorframe in a broken fence on a moonlit moor: twilight sky, a
  // big low moon straight ahead, dead trees, mist in the hollows, and a
  // stepping-stone path up to a ring of standing stones. Night photos hang
  // in the air across the field.

  ROOMS.moor = {
    name: "The Moor",
    short: "Moor",
    tagline: "Night photos under a low moon",
    color: 0x6f86c9,
    leak: 0x5d73b8,
    leakStyle: "steady",
    frame: 0x0e0e10,
    fogColor: 0x141a30,
    loudness: 0.85,
    ground: "grass",
    entrance: { x: -9, z: 8.6, nx: 1, nz: 0 },
    spawn: { x: -10.8, z: 8.6, yaw: Math.PI / 2, pitch: 0.12 },
    spots: { stones: { name: "The Standing Stones", x: -23.6, z: 4.6, yaw: Math.PI / 2, pitch: 0.02 } },
    build(R) {
      const OUT = { x0: -48, x1: -9, z0: -16, z1: 32 };
      const MIDDLE = new THREE.Vector3(-28, 0, 8);
      const HILL = { x: -30, z: 4 };
      const DOOR_Z = 8.6;
      const STEP_OUT = { x: OUT.x1 - 0.6, z: DOOR_Z };
      const MOON_DIR = new THREE.Vector3(-Math.cos(THREE.MathUtils.degToRad(24)), Math.sin(THREE.MathUtils.degToRad(24)), 0);
      const FLOATING = [
        ["DSC06067", HILL.x, HILL.z, 1.3],
        ["DSC06058", -15.5, 13, 1.25],
        ["4-alt", -21.5, 17, 1.35],
        ["DSC06061", -24, -0.5, 1.3],
        ["DSC06052", -37, 11, 1.4],
        ["DSC06060", -16.5, -3, 1.25],
        ["5-alt", -34, -6, 1.35],
      ];

      // The ground: flat at the door, rolling further out, a hill for the
      // stones, and rising all round the edge into the dark.
      function groundAt(x, z) {
        const away = Math.hypot(x - STEP_OUT.x, z - STEP_OUT.z);
        const ease = smooth(away, 4, 20);
        const roll = Math.sin(x * 0.13 + 1.3) * Math.cos(z * 0.11 - 0.4) * 1.1 + Math.sin(x * 0.29 + z * 0.21) * 0.35 + Math.sin(z * 0.37 - x * 0.07) * 0.25;
        const hill = 2.6 * Math.exp(-((x - HILL.x) ** 2 + (z - HILL.z) ** 2) / 70);
        const rim = Math.min(9, Math.max(0, Math.hypot(x - MIDDLE.x, z - MIDDLE.z) - 34) ** 1.2 * 0.08);
        return ease * (roll + 0.6) + hill + rim;
      }

      R.scene.fog = new THREE.FogExp2(0x141a30, 0.022);
      R.add(new THREE.HemisphereLight(0x34426e, 0x0f0d0a, 0.34));
      const moonlight = new THREE.DirectionalLight(0xb4c4ff, 0.85);
      moonlight.position.copy(MIDDLE).addScaledVector(MOON_DIR, 80);
      moonlight.target.position.copy(MIDDLE);
      R.shadows(moonlight, 40, 200);
      R.add(moonlight, moonlight.target);

      // The sky, stars and moon travel with you, so they're always
      // infinitely far away.
      const sky = new THREE.Group();
      sky.add(skyDome({ top: 0x04060f, mid: 0x0d1331, low: 0x26223f, sunDir: MOON_DIR, glow: [0.45, 0.5, 0.7], tight: 60, spread: 8, glowAmt: [0.4, 0.07] }));
      const starDirs = [];
      const starRand = rng(11);
      while (starDirs.length < 1400 * 3) {
        const v = new THREE.Vector3(starRand() * 2 - 1, starRand(), starRand() * 2 - 1);
        if (v.lengthSq() > 1 || v.y < 0.04) continue;
        v.normalize().multiplyScalar(1400);
        starDirs.push(v.x, v.y, v.z);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starDirs, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd4dcff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false }));
      stars.renderOrder = -1;
      stars.frustumCulled = false;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x45528a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
      halo.position.copy(MOON_DIR).multiplyScalar(1300);
      halo.scale.setScalar(490);
      const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: 0xd8d8d8, depthWrite: false, fog: false, transparent: true }));
      moon.position.copy(MOON_DIR).multiplyScalar(1290);
      moon.scale.setScalar(114);
      halo.renderOrder = moon.renderOrder = -1;
      sky.add(stars, halo, moon);
      R.add(sky);

      // Far ridges, one behind another, each a shade closer to the sky.
      for (const [radius, height, color, seed] of [[260, 52, 0x1b2142, 1], [200, 36, 0x121731, 2], [150, 24, 0x0b0f20, 3]]) {
        const r = rng(seed);
        const phase = [r() * 6, r() * 6, r() * 6];
        const pos = [];
        const n = 160;
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2;
          const h = height * (0.55 + 0.25 * Math.sin(a * 3 + phase[0]) + 0.15 * Math.sin(a * 7 + phase[1]) + 0.08 * Math.sin(a * 17 + phase[2]));
          const x = MIDDLE.x + Math.cos(a) * radius;
          const z = MIDDLE.z + Math.sin(a) * radius;
          pos.push(x, -20, z, x, h, z);
        }
        const idx = [];
        for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        R.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, fog: false, side: THREE.DoubleSide })));
      }

      // Low-poly moor, faceted, in shades of dark heather and grass.
      const segs = Q.density < 0.5 ? 110 : 170;
      const terrainGeo = new THREE.PlaneGeometry(340, 340, segs, segs);
      terrainGeo.rotateX(-Math.PI / 2);
      terrainGeo.translate(MIDDLE.x, 0, MIDDLE.z);
      {
        const p = terrainGeo.attributes.position;
        const colors = [];
        const shade = rng(21);
        const a = new THREE.Color(0x181e16);
        const b = new THREE.Color(0x24231f);
        const c = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          p.setY(i, groundAt(p.getX(i), p.getZ(i)) - 0.01);
          c.copy(a).lerp(b, shade());
          colors.push(c.r, c.g, c.b);
        }
        terrainGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        terrainGeo.computeVertexNormals();
      }
      const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
      terrain.receiveShadow = true;
      R.add(terrain);

      // The doorframe, standing on its own in a broken-down fence that runs
      // off across the moor.
      const frame = doorFrame(0x0e0e10);
      frame.position.set(OUT.x1, 0, DOOR_Z);
      frame.rotation.y = -Math.PI / 2;
      frame.traverse((o) => { o.castShadow = true; });
      R.add(frame);
      {
        const r = rng(17);
        const parts = [];
        const x = OUT.x1 - 0.3;
        for (const [from, to] of [[OUT.z0 - 20, DOOR_Z - DOOR_HALF - 0.4], [DOOR_Z + DOOR_HALF + 0.4, OUT.z1 + 20]]) {
          let prevTop = null;
          for (let z = from; z <= to; z += 2 + r() * 0.6) {
            if (r() < 0.12) { prevTop = null; continue; }
            const h = 1 + r() * 0.35;
            const post = new THREE.BoxGeometry(0.1, h, 0.1);
            post.translate(0, h / 2, 0);
            post.rotateZ((r() - 0.5) * 0.25);
            post.rotateX((r() - 0.5) * 0.2);
            post.translate(x, groundAt(x, z) - 0.1, z);
            parts.push(post);
            const top = new THREE.Vector3(x, groundAt(x, z) + h * 0.8, z);
            if (prevTop && r() > 0.25) {
              const span = top.distanceTo(prevTop);
              const rail = new THREE.BoxGeometry(0.05, 0.06, span);
              rail.lookAt(new THREE.Vector3().subVectors(top, prevTop));
              rail.translate((top.x + prevTop.x) / 2, (top.y + prevTop.y) / 2 - r() * 0.15, (top.z + prevTop.z) / 2);
              parts.push(rail);
            }
            prevTop = top;
          }
        }
        const fence = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0x1d1813, roughness: 1, flatShading: true }));
        fence.castShadow = Q.shadow > 0;
        R.add(fence);
      }

      const blockers = [];
      const FLOAT_XZ = FLOATING.map(([, x, z]) => [x, z]);

      // Dead trees: a crooked trunk splitting into thinner and thinner
      // branches, merged into one mesh each.
      const bark = new THREE.MeshStandardMaterial({ color: 0x17130f, roughness: 1, flatShading: true });
      function deadTree(seed, scale) {
        const r = rng(seed);
        const parts = [];
        const grow = (matrix, length, radius, depth) => {
          const geo = new THREE.CylinderGeometry(radius * 0.65, radius, length, 5, 1);
          geo.translate(0, length / 2, 0);
          geo.applyMatrix4(matrix);
          parts.push(geo);
          if (depth === 0) return;
          const tip = matrix.clone().multiply(new THREE.Matrix4().makeTranslation(0, length * 0.95, 0));
          const forks = depth === 3 ? 2 + Math.floor(r() * 2) : 2;
          for (let i = 0; i < forks; i++) {
            const turn = new THREE.Matrix4().makeRotationY(r() * Math.PI * 2);
            const lean = new THREE.Matrix4().makeRotationZ(0.35 + r() * 0.55);
            grow(tip.clone().multiply(turn).multiply(lean), length * (0.55 + r() * 0.2), radius * 0.6, depth - 1);
          }
        };
        grow(new THREE.Matrix4().makeRotationZ((r() - 0.5) * 0.25), 2.6, 0.2, 3);
        const tree = new THREE.Mesh(mergeGeometries(parts), bark);
        tree.scale.setScalar(scale);
        tree.castShadow = Q.shadow > 0;
        return tree;
      }
      {
        const r = rng(31);
        let placed = 0;
        let tries = 0;
        const want = Math.max(24, Math.round(46 * Q.density));
        while (placed < want && tries++ < 2000) {
          const a = r() * Math.PI * 2;
          const d = 8 + r() * 46;
          const x = MIDDLE.x + Math.cos(a) * d;
          const z = MIDDLE.z + Math.sin(a) * d;
          if (x > OUT.x1 - 3) continue;
          if (Math.hypot(x - HILL.x, z - HILL.z) < 7) continue;
          if (FLOAT_XZ.some(([fx, fz]) => Math.hypot(x - fx, z - fz) < 3.5)) continue;
          if (Math.hypot(x - STEP_OUT.x, z - STEP_OUT.z) < 6) continue;
          if (Math.abs(z - (DOOR_Z - (x - STEP_OUT.x) * 0.2)) < 2.5 && x > HILL.x) continue;
          const tree = deadTree(100 + placed, 0.8 + r() * 0.7);
          tree.position.set(x, groundAt(x, z) - 0.1, z);
          R.add(tree);
          if (x > OUT.x0 && x < OUT.x1 && z > OUT.z0 && z < OUT.z1) blockers.push({ x, z, r: 0.3 });
          placed++;
        }
      }

      // Tufts of rough grass, all one instanced mesh.
      {
        const tuft = new THREE.ConeGeometry(0.09, 0.28, 4);
        tuft.translate(0, 0.12, 0);
        const grass = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ color: 0x242b1d, roughness: 1, flatShading: true }), R.density(3200));
        const r = rng(41);
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const e = new THREE.Euler();
        for (let i = 0; i < grass.count; i++) {
          const x = OUT.x0 - 6 + r() * (OUT.x1 - OUT.x0 + 5);
          const z = OUT.z0 - 6 + r() * (OUT.z1 - OUT.z0 + 12);
          e.set((r() - 0.5) * 0.9, r() * 6, (r() - 0.5) * 0.9);
          m.compose(new THREE.Vector3(x, groundAt(x, z) - 0.05, z), q.setFromEuler(e), new THREE.Vector3(1, 0.6 + r() * 0.9, 1));
          grass.setMatrixAt(i, m);
        }
        grass.receiveShadow = true;
        R.add(grass);
      }

      // Flat stepping stones curving from the door up to the hill.
      const curve = new THREE.QuadraticBezierCurve(new THREE.Vector2(STEP_OUT.x, STEP_OUT.z), new THREE.Vector2(-19, 13), new THREE.Vector2(HILL.x + 4.2, HILL.z + 0.5));
      {
        const r = rng(51);
        const parts = [];
        const steps = Math.floor(curve.getLength() / 0.85);
        for (let i = 1; i <= steps; i++) {
          const pt = curve.getPoint(i / steps);
          const x = pt.x + (r() - 0.5) * 0.35;
          const z = pt.y + (r() - 0.5) * 0.35;
          const geo = new THREE.CylinderGeometry(0.28 + r() * 0.1, 0.32 + r() * 0.1, 0.1, 7);
          geo.rotateY(r() * 3);
          geo.translate(x, groundAt(x, z) + 0.02, z);
          parts.push(geo);
        }
        const path = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0x4a4c52, roughness: 0.95, flatShading: true }));
        path.receiveShadow = true;
        R.add(path);
      }
      // A leaning signpost where the path starts.
      {
        const at = curve.getPoint(0.12);
        const post = new THREE.Group();
        post.add(part(new THREE.BoxGeometry(0.1, 1.5, 0.1), 0x2a2018, 0, 0.75, 0));
        const board = labelMesh(["To the stones", "Mind the mist", ""], "wood", 0.62);
        board.position.set(0.18, 1.3, 0.06);
        board.rotation.z = -0.06;
        post.add(board);
        post.position.set(at.x + 0.9, groundAt(at.x + 0.9, at.y + 0.8), at.y + 0.8);
        post.rotation.set(0, Math.PI / 2 + 0.3, 0.08);
        R.add(post);
        blockers.push({ x: at.x + 0.9, z: at.y + 0.8, r: 0.15 });
      }

      // The standing stones, in a ring on the hilltop.
      {
        const r = rng(61);
        const greyStone = new THREE.MeshStandardMaterial({ color: 0x5a5d66, roughness: 1, flatShading: true });
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + 0.2;
          if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.3) continue;
          const x = HILL.x + Math.cos(a) * 4.2;
          const z = HILL.z + Math.sin(a) * 4.2;
          const h = 1.6 + r() * 1.3;
          const geo = new THREE.BoxGeometry(0.55 + r() * 0.3, h, 0.35 + r() * 0.2, 1, 3, 1);
          const pos = geo.attributes.position;
          for (let k = 0; k < pos.count; k++) pos.setXYZ(k, pos.getX(k) * (0.85 + r() * 0.3), pos.getY(k), pos.getZ(k) * (0.85 + r() * 0.3));
          geo.computeVertexNormals();
          const slab = new THREE.Mesh(geo, greyStone);
          slab.position.set(x, groundAt(x, z) + h / 2 - 0.25, z);
          slab.rotation.set((r() - 0.5) * 0.18, -a + Math.PI / 2, (r() - 0.5) * 0.18);
          slab.castShadow = Q.shadow > 0;
          slab.receiveShadow = true;
          R.add(slab);
          blockers.push({ x, z, r: 0.45 });
        }
      }

      // The night photos, each hanging in the air in a thin black edge with
      // a little burned-wood label, turned toward the door, bobbing gently.
      const floaters = FLOATING.map(([stem, x, z, lift], i) => {
        const piece = R.photo(stem, { long: 1.4, frame: 0x0a0a0c, border: 0.02, depth: 0.02, label: "wood", labelSide: 0, labelWidth: 0.36 });
        const P = PHOTO[stem];
        const ph = P.w >= P.h ? (1.4 * P.h) / P.w : 1.4;
        const baseY = groundAt(x, z) + lift + ph / 2;
        const yaw = Math.atan2(STEP_OUT.x - x, STEP_OUT.z - z);
        piece.position.set(x, baseY, z);
        piece.rotation.y = yaw;
        R.add(piece);
        blockers.push({ x, z, r: 0.5 });
        return { piece, baseY, yaw, phase: i * 1.7 };
      });

      // A lantern on the ground beneath the photo in the ring of stones.
      const lanternAt = new THREE.Vector3(HILL.x + 0.4, groundAt(HILL.x + 0.4, HILL.z + 0.5), HILL.z + 0.5);
      const lantern = new THREE.Group();
      lantern.add(part(new THREE.BoxGeometry(0.2, 0.28, 0.2), 0x15120e, 0, 0.14, 0));
      const flame = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.17, 0.13), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
      flame.position.y = 0.15;
      lantern.add(flame, part(new THREE.BoxGeometry(0.24, 0.03, 0.24), 0x15120e, 0, 0.3, 0));
      lantern.position.copy(lanternAt);
      const lanternLight = new THREE.PointLight(0xffa955, 4, 9, 2);
      lanternLight.position.copy(lanternAt).add(new THREE.Vector3(0, 0.3, 0));
      const lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a40, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      lanternGlow.position.copy(lanternLight.position);
      lanternGlow.scale.setScalar(1.6);
      R.add(lantern, lanternLight, lanternGlow);

      // Low mist pooling in the hollows.
      const mistTex = canvasTex(512, 512, (g) => {
        const r = rng(71);
        for (let i = 0; i < 70; i++) {
          const x = r() * 512;
          const y = r() * 512;
          const rad = 40 + r() * 110;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, `rgba(255, 255, 255, ${0.12 + r() * 0.15})`);
          blob.addColorStop(1, "rgba(255, 255, 255, 0)");
          g.fillStyle = blob;
          for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
            g.save();
            g.translate(dx, dy);
            g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
            g.restore();
          }
        }
      }, { srgb: false });
      mistTex.repeat.set(4, 4);
      const mists = [0.2, 0.55, 0.95].slice(0, Q.density < 0.5 ? 2 : 3).map((y, i) => {
        const tex = mistTex.clone();
        tex.needsUpdate = true;
        tex.offset.set(i * 0.37, i * 0.21);
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ map: tex, color: 0x4a5476, transparent: true, opacity: 0.3 - i * 0.08, depthWrite: false }));
        sheet.rotation.x = -Math.PI / 2;
        sheet.position.set(MIDDLE.x, y, MIDDLE.z);
        sheet.renderOrder = 1;
        sheet.material.userData.noClip = true;
        R.add(sheet);
        return { tex, drift: new THREE.Vector2(0.004 + i * 0.002, 0.0025 - i * 0.002) };
      });

      // Fireflies, drifting and blinking low over the grass.
      const fireflies = Array.from({ length: R.density(90) }, (_, i) => {
        const r = rng(81 + i);
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xd9ff8f, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        s.scale.setScalar(0.22);
        const home = new THREE.Vector3(OUT.x0 + 4 + r() * (OUT.x1 - OUT.x0 - 6), 0, OUT.z0 + 4 + r() * (OUT.z1 - OUT.z0 - 8));
        R.add(s);
        return { s, home, phase: r() * 20, speed: 0.3 + r() * 0.4 };
      });

      // Bats: most circling over the stones, a few looping elsewhere.
      const batWing = new THREE.BufferGeometry();
      batWing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.08, 0.38, 0.04, -0.02, 0, 0, 0.1, 0.38, 0.04, -0.02, 0.24, -0.04, 0.12, 0, 0, 0.1], 3));
      batWing.computeVertexNormals();
      const batMat = new THREE.MeshBasicMaterial({ color: 0x07070a, side: THREE.DoubleSide });
      const bats = Array.from({ length: 10 }, (_, i) => {
        const r = rng(90 + i);
        const bat = new THREE.Group();
        const left = new THREE.Mesh(batWing, batMat);
        const right = new THREE.Mesh(batWing, batMat);
        right.scale.x = -1;
        bat.add(left, right, new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), batMat));
        R.add(bat);
        const around = i < 6 ? HILL : { x: -14 - r() * 22, z: -6 + r() * 30 };
        return { bat, left, right, cx: around.x, cz: around.z, radius: 3.5 + r() * 9, height: 5 + r() * 10, speed: (0.45 + r() * 0.5) * (r() < 0.35 ? -1 : 1), phase: r() * 6 };
      });

      // Moon-motes: faint specks drifting up through the air.
      const MOTES = R.density(900);
      const motePos = new Float32Array(MOTES * 3);
      const moteRand = rng(77);
      for (let i = 0; i < MOTES; i++) {
        motePos[i * 3] = OUT.x0 - 4 + moteRand() * (OUT.x1 - OUT.x0 + 4);
        motePos[i * 3 + 1] = moteRand() * 7;
        motePos[i * 3 + 2] = OUT.z0 - 4 + moteRand() * (OUT.z1 - OUT.z0 + 8);
      }
      const moteGeo = new THREE.BufferGeometry();
      moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
      const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ map: glowTex, color: 0x9fb0e6, size: 0.09, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      motes.frustumCulled = false;
      R.add(motes);

      // Now and then a shooting star.
      const streakGeo = new THREE.BufferGeometry();
      streakGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
      const streak = new THREE.Line(streakGeo, new THREE.LineBasicMaterial({ color: 0xe8eeff, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      streak.frustumCulled = false;
      sky.add(streak);
      const shooting = { next: 4, start: -10, from: new THREE.Vector3(), dir: new THREE.Vector3() };

      return {
        floor: (x, z) => (x < OUT.x1 ? Math.max(0, groundAt(x, z)) : 0),
        walls: [
          [OUT.x1, OUT.z0, OUT.x1, DOOR_Z - DOOR_HALF],
          [OUT.x1, DOOR_Z + DOOR_HALF, OUT.x1, OUT.z1],
          [OUT.x0, OUT.z0, OUT.x1, OUT.z0],
          [OUT.x0, OUT.z1, OUT.x1, OUT.z1],
          [OUT.x0, OUT.z0, OUT.x0, OUT.z1],
        ],
        blockers,
        update(t, dt) {
          const cam = R.camLocal;
          sky.position.copy(cam);
          for (const m of mists) m.tex.offset.addScaledVector(m.drift, dt);
          for (const f of fireflies) {
            const k = t * f.speed + f.phase;
            const x = f.home.x + Math.sin(k * 0.7) * 2.5 + Math.sin(k * 1.9) * 0.6;
            const z = f.home.z + Math.cos(k * 0.6) * 2.5 + Math.cos(k * 1.7) * 0.6;
            f.s.position.set(x, groundAt(x, z) + 0.6 + Math.sin(k * 1.3) * 0.4, z);
            f.s.material.opacity = Math.max(0, Math.sin(k * 2.3)) ** 3;
          }
          for (const b of bats) {
            const a = t * b.speed + b.phase;
            b.bat.position.set(b.cx + Math.cos(a) * b.radius, b.height + Math.sin(a * 2.3) * 0.8, b.cz + Math.sin(a) * b.radius);
            b.bat.rotation.y = -a + (b.speed < 0 ? Math.PI : 0);
            const flap = Math.sin(t * 16 + b.phase) * 0.7;
            b.left.rotation.z = flap;
            b.right.rotation.z = -flap;
          }
          const flicker = 0.85 + Math.sin(t * 9.3) * 0.06 + Math.sin(t * 23.1) * 0.05 + Math.sin(t * 3.7) * 0.04;
          lanternLight.intensity = 4 * flicker;
          lanternGlow.scale.setScalar(1.6 * flicker);
          const mp = moteGeo.attributes.position;
          for (let i = 0; i < MOTES; i++) {
            let y = mp.getY(i) + dt * (0.05 + (i % 7) * 0.012);
            if (y > 7) y = 0;
            mp.setXYZ(i, mp.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.08 + dt * 0.04, y, mp.getZ(i) + Math.cos(t * 0.27 + i * 1.3) * dt * 0.08);
          }
          mp.needsUpdate = true;
          for (const f of floaters) {
            f.piece.position.y = f.baseY + Math.sin(t * 0.6 + f.phase) * 0.08 * motion();
            f.piece.rotation.y = f.yaw + Math.sin(t * 0.25 + f.phase) * 0.07 * motion();
          }
          if (t > shooting.next) {
            const az = Math.random() * Math.PI * 2;
            const el = THREE.MathUtils.degToRad(30 + Math.random() * 40);
            shooting.from.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(1200);
            shooting.dir.set(-Math.sin(az), -0.35 - Math.random() * 0.3, Math.cos(az)).normalize().multiplyScalar(Math.random() < 0.5 ? 1 : -1);
            shooting.dir.y = -Math.abs(shooting.dir.y);
            shooting.start = t;
            shooting.next = t + 5 + Math.random() * 9;
          }
          const age = t - shooting.start;
          if (age < 0.9) {
            const head = shooting.from.clone().addScaledVector(shooting.dir, age * 440);
            const tail = head.clone().addScaledVector(shooting.dir, -120);
            const sp = streakGeo.attributes.position;
            sp.setXYZ(0, tail.x, tail.y, tail.z);
            sp.setXYZ(1, head.x, head.y, head.z);
            sp.needsUpdate = true;
            streak.material.opacity = Math.sin((age / 0.9) * Math.PI) * 0.9;
          } else streak.material.opacity = 0;
        },
        HILL,
      };
    },
    sound(A, R, api) {
      // Wind in gusts, crickets round the field, now and then an owl.
      const windTone = A.filter("bandpass", 400, 0.6);
      const wind = A.gain(0.2);
      A.hiss().connect(windTone).connect(wind).connect(A.bus);
      let gust = A.ctx.currentTime;
      A.extras.push((until) => {
        gust = Math.max(gust, A.ctx.currentTime);
        while (gust < until) {
          wind.gain.setTargetAtTime(0.1 + A.chance() * 0.25, gust, 1.2);
          windTone.frequency.setTargetAtTime(250 + A.chance() * 450, gust, 1.5);
          gust += 1.5 + A.chance() * 2.5;
        }
      });
      for (const [x, z] of [[-16, 3], [-22, 18], [-36, 12], [-27, -6], [-40, -2]]) {
        const chirp = A.osc("sine", 4200 + A.chance() * 700);
        const amp = A.gain(0);
        chirp.connect(amp).connect(A.placed(x, 0.2, z, 2, 1));
        let t = A.ctx.currentTime + A.chance();
        A.extras.push((until) => {
          t = Math.max(t, A.ctx.currentTime);
          while (t < until) {
            for (let i = 0; i < 3; i++) {
              amp.gain.setValueAtTime(0.05, t);
              amp.gain.setValueAtTime(0, t + 0.018);
              t += 0.032;
            }
            t += A.chance() < 0.08 ? 2 + A.chance() * 3 : 0.5 + A.chance() * 0.6;
          }
        });
      }
      const owl = A.osc("sine", 380);
      const owlAmp = A.gain(0);
      owl.connect(owlAmp).connect(A.placed(-42, 6, 20, 4, 0.8));
      let hoot = A.ctx.currentTime + 6;
      A.extras.push((until) => {
        hoot = Math.max(hoot, A.ctx.currentTime);
        while (hoot < until) {
          for (const [start, len, pitch] of [[0, 0.5, 390], [0.85, 0.2, 370], [1.15, 0.38, 360]]) {
            owl.frequency.setValueAtTime(pitch, hoot + start);
            owl.frequency.linearRampToValueAtTime(pitch * 0.9, hoot + start + len);
            owlAmp.gain.setTargetAtTime(0.3, hoot + start, 0.04);
            owlAmp.gain.setTargetAtTime(0, hoot + start + len, 0.06);
          }
          hoot += 14 + A.chance() * 14;
        }
      });
      return {};
    },
  };
