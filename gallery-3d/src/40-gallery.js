  // ---------- The Gallery, and the Globe Room behind it ----------
  // An 18 by 14 m gallery hung with fourteen photos and the Osprey, with a
  // crowd round the Osprey and a few others wandering. Through its far
  // doorway, a tall dark room where every photo hangs on a turning globe and
  // little globes bounce about. You come in through the side wall.

  ROOMS.gallery = {
    name: "The Gallery",
    short: "Gallery",
    tagline: "The Osprey, and the crowd it draws",
    color: 0xd9b27c,
    leak: 0xc9a77a,
    frame: 0x1a1612,
    fogColor: 0x16151a,
    loudness: 2.4,
    ground: "wood",
    entrance: { x: -9, z: 8.6, nx: -1, nz: 0 },
    spawn: { x: -7.4, z: 8.6, yaw: -Math.PI / 2 },
    spots: {
      osprey: { name: "The Osprey", x: 0, z: 6.4, yaw: 0, pitch: 0.02 },
      globes: { name: "The Globe Room", x: 0, z: 15.4, yaw: Math.PI, pitch: 0.22 },
    },
    build(R) {
      const ROOM = { w: 18, d: 14, h: 3.8 };
      const ROOM2 = { w: 14, d: 14, h: 9, z: ROOM.d };
      R.scene.fog = new THREE.Fog(0x16151a, 14, 34);

      R.add(new THREE.HemisphereLight(0xfff1e2, 0x2a231d, 0.85));
      // The room light comes from high above, so the crowd's shadows land on
      // the floor and never reach a photo.
      const overhead = new THREE.DirectionalLight(0xfff1e0, 1.3);
      overhead.position.set(1.5, 9, 6.4);
      overhead.target.position.set(0, 0, 3);
      R.shadows(overhead, 11, 30);
      R.add(overhead, overhead.target);
      // A softer fill from the other side, so no wall falls into the dark.
      const fill = new THREE.DirectionalLight(0xffe8d0, 1.0);
      fill.position.set(-8, 5, 7);
      R.add(fill);

      const boards = boardsTexture(7);
      boards.repeat.set(9, 7);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ map: boards, roughness: 0.75 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.z = ROOM.d / 2;
      floor.receiveShadow = true;
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshLambertMaterial({ color: 0x3b3833 }));
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(0, ROOM.h, ROOM.d / 2);
      R.add(floor, ceiling);

      const WALLS = {
        back: (along) => ({ x: along, z: 0, rotY: 0 }),
        left: (along) => ({ x: -ROOM.w / 2, z: along, rotY: Math.PI / 2 }),
        right: (along) => ({ x: ROOM.w / 2, z: along, rotY: -Math.PI / 2 }),
        rear: (along) => ({ x: along, z: ROOM.d, rotY: Math.PI }),
      };
      const ENTRY = { z: 8.6 };
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x46433f, roughness: 0.95 });
      for (const [name, length, along] of [["back", ROOM.w, 0], ["left", ROOM.d, ROOM.d / 2], ["right", ROOM.d, ROOM.d / 2], ["rear", ROOM.w, 0]]) {
        const at = WALLS[name](along);
        const door = name === "rear" ? { x: 0, half: DOOR_HALF, h: DOOR_H } : name === "left" ? { x: -(ENTRY.z - ROOM.d / 2), half: DOOR_HALF, h: DOOR_H } : null;
        const wall = wallFaces(length, ROOM.h, wallMat, door);
        wall.position.set(at.x, 0, at.z);
        wall.rotation.y = at.rotY;
        R.add(wall);
      }
      const entryFrame = doorFrame(0x1a1612);
      entryFrame.position.set(-ROOM.w / 2 + 0.05, 0, ENTRY.z);
      entryFrame.rotation.y = Math.PI / 2;
      const rearFrame = doorFrame(0x1a1612);
      rearFrame.position.set(0, 0, ROOM.d - 0.05);
      rearFrame.rotation.y = Math.PI;
      R.add(entryFrame, rearFrame);

      // Track lights along every wall: the light pools on the walls come
      // from somewhere.
      for (const [x, z, len, rotY] of [[0, 1.4, 16, 0], [0, ROOM.d - 1.4, 16, 0], [-ROOM.w / 2 + 1.4, ROOM.d / 2, 12, Math.PI / 2], [ROOM.w / 2 - 1.4, ROOM.d / 2, 12, Math.PI / 2]]) {
        const track = part(new THREE.BoxGeometry(len, 0.03, 0.05), 0x141416, x, ROOM.h - 0.02, z);
        track.rotation.y = rotY;
        R.add(track);
      }

      // A pool of light on the wall round each photo, painted on rather than
      // lit, so twenty lights don't slow a phone down.
      const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x4d4030, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      function hang(stem, at, long, y = 1.6) {
        const g = new THREE.Group();
        g.position.set(at.x, 0, at.z);
        g.rotation.y = at.rotY;
        const piece = R.photo(stem, { long, label: "card" });
        piece.position.set(0, y, 0.02);
        const P = PHOTO[stem];
        const w = P.w >= P.h ? long : (long * P.w) / P.h;
        const h = P.w >= P.h ? (long * P.h) / P.w : long;
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 2 + 0.6, h * 1.9 + 0.4), glowMat);
        glow.position.set(0, y + 0.15, 0.003);
        const can = part(new THREE.CylinderGeometry(0.045, 0.055, 0.14, 8), 0x141416, 0, ROOM.h - 0.1, 1.4);
        can.rotation.x = -0.7;
        g.add(piece, glow, can);
        R.add(g);
        g.updateMatrixWorld(true);
        return new THREE.Vector3(at.x + Math.sin(at.rotY) * 0, y, at.z).add(new THREE.Vector3(0, 0, 0));
      }

      const osprey = hang("4", WALLS.back(0), 2.1, 1.65);
      for (const x of [-0.75, 0.75]) {
        const spot = new THREE.SpotLight(0xffe9cc, 14, 0, 0.5, 0.8, 2);
        spot.position.set(x, 3.6, 1.45);
        spot.target.position.set(x * 0.4, osprey.y, 0);
        R.add(spot, spot.target);
      }

      // The rest of the show, grouped loosely by subject.
      const HUNG = [
        ["back", -6.6, "DSC05851"], ["back", -3.8, "Cruise-6"], ["back", 3.8, "DSC04807"], ["back", 6.6, "5"],
        ["left", 2.6, "DSC06058"], ["left", 5.6, "2-alt"], ["left", 11.8, "5-alt"],
        ["right", 3.4, "2"], ["right", 7, "3"], ["right", 10.6, "Cruise-5"],
        ["rear", 6.2, "1"], ["rear", 3.4, "DSC04734"], ["rear", -3.4, "DSC05752"], ["rear", -6.2, "DSC04824"],
      ];
      const hung = {};
      for (const [wall, along, stem] of HUNG) {
        const at = WALLS[wall](along);
        hang(stem, at, 1.4);
        hung[stem] = { at, centre: new THREE.Vector3(at.x, 1.6, at.z) };
      }

      // A bench at the best spot for the Osprey.
      const bench = new THREE.Group();
      bench.add(part(new THREE.BoxGeometry(1.8, 0.08, 0.45), 0x6b4f36, 0, 0.44, 0));
      for (const x of [-0.78, 0.78]) bench.add(part(new THREE.BoxGeometry(0.06, 0.4, 0.38), 0x1d1d21, x, 0.2, 0));
      bench.position.set(0, 0, 7.6);
      bench.traverse((o) => { o.castShadow = true; });
      R.add(bench);

      // ---------- The Globe Room ----------
      const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x1a1b23, roughness: 0.9 });
      for (const [x, z, rotY, length, door] of [
        [0, ROOM2.z, 0, ROOM2.w, { x: 0, half: DOOR_HALF, h: DOOR_H }],
        [-ROOM2.w / 2, ROOM2.z + ROOM2.d / 2, Math.PI / 2, ROOM2.d, null],
        [ROOM2.w / 2, ROOM2.z + ROOM2.d / 2, -Math.PI / 2, ROOM2.d, null],
        [0, ROOM2.z + ROOM2.d, Math.PI, ROOM2.w, null],
      ]) {
        const wall = wallFaces(length, ROOM2.h, wallMat2, door);
        wall.position.set(x, 0, z);
        wall.rotation.y = rotY;
        R.add(wall);
      }
      const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM2.w, ROOM2.d), new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.45, metalness: 0.2 }));
      floor2.rotation.x = -Math.PI / 2;
      floor2.position.set(0, 0, ROOM2.z + ROOM2.d / 2);
      const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM2.w, ROOM2.d), new THREE.MeshLambertMaterial({ color: 0x0c0c10 }));
      ceiling2.rotation.x = Math.PI / 2;
      ceiling2.position.set(0, ROOM2.h, ROOM2.z + ROOM2.d / 2);
      R.add(floor2, ceiling2);
      // A sign by the door into it.
      const globeSign = labelMesh(["The Globe Room", "Every photo, turning", ""], "brass", 1.1);
      globeSign.position.set(0, DOOR_H + 0.5, ROOM.d - 0.03);
      globeSign.rotation.y = Math.PI;
      R.add(globeSign);

      // A globe of photos: a ring round the middle, then `rows` rings above
      // and below, each a little smaller, never fewer than four photos to a
      // ring and nothing at the very poles. Each ring turns its own way.
      const cardMats = new Map();
      const rings = [];
      let next = 0;
      function makeGlobe(radius, aroundMiddle, rows, step) {
        const group = new THREE.Group();
        const rowGap = THREE.MathUtils.degToRad(step);
        const spec = [[0, aroundMiddle]];
        for (let i = 1; i <= rows; i++) {
          const count = Math.max(4, Math.round(aroundMiddle * Math.cos(THREE.MathUtils.degToRad(i * step))));
          spec.push([i * step, count], [-i * step, count]);
        }
        for (const [lat, count] of spec) {
          const band = Math.round(Math.abs(lat) / step);
          const ring = new THREE.Group();
          ring.userData.speed = (band % 2 ? -1 : 1) * (0.1 + band * 0.02);
          const phi = THREE.MathUtils.degToRad(lat);
          const slotW = ((Math.PI * 2 * radius * Math.cos(phi)) / count) * 0.86;
          const slotH = radius * rowGap * 0.9;
          const geos = new Map();
          for (let k = 0; k < count; k++) {
            const P = PHOTOS[next++ % PHOTOS.length];
            const theta = (k / count) * Math.PI * 2 + band * 0.4;
            const at = new THREE.Vector3(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta)).multiplyScalar(radius);
            const fit = Math.min(slotW / P.w, slotH / P.h);
            const geo = new THREE.PlaneGeometry(P.w * fit, P.h * fit);
            const m = new THREE.Object3D();
            m.position.copy(at);
            m.lookAt(at.clone().multiplyScalar(2));
            m.updateMatrix();
            geo.applyMatrix4(m.matrix);
            if (!geos.has(P.stem)) geos.set(P.stem, []);
            geos.get(P.stem).push(geo);
          }
          // One mesh per photo per ring: far fewer draw calls than a mesh
          // per card.
          for (const [stem, list] of geos) {
            if (!cardMats.has(stem)) cardMats.set(stem, new THREE.MeshBasicMaterial({ map: photoTexture(stem, R.reg), toneMapped: false, fog: false }));
            ring.add(new THREE.Mesh(list.length > 1 ? mergeGeometries(list) : list[0], cardMats.get(stem)));
          }
          group.add(ring);
          rings.push(ring);
        }
        R.add(group);
        return group;
      }

      const BIG = 4;
      const globe = makeGlobe(BIG, 14, 5, 14);
      globe.position.set(0, 4.4, ROOM2.z + 8);
      globe.rotation.z = 0.1;
      const globeLight = new THREE.PointLight(0x9fb4ff, 36, 0, 2);
      globeLight.position.copy(globe.position);
      R.add(globeLight);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x26304a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(globe.position.x, 0.01, globe.position.z);
      R.add(pool);

      const GRAVITY = 5;
      const bouncers = [[-4.5, 17, 0.9, 3.2], [4.6, 18.5, 0.75, 2.6], [-4, 25, 0.8, 3.6], [4.2, 25.5, 0.65, 2.2], [0.5, 26.5, 0.7, 3]]
        .slice(0, Q.density < 0.5 ? 3 : 5)
        .map(([x, z, r, apex], i) => {
          const g = makeGlobe(r, 7, 2, 28);
          g.position.set(x, r + apex * 0.5, z);
          const dir = i * 2.1 + 0.6;
          const speed = 0.9 + (i % 3) * 0.25;
          return { g, r, speed, hop: Math.sqrt(2 * GRAVITY * apex), v: new THREE.Vector3(Math.cos(dir) * speed, 0, Math.sin(dir) * speed), spin: (i % 2 ? -1 : 1) * (0.6 + i * 0.15) };
        });
      const toward = new THREE.Vector3();
      function bounce(dt) {
        const lim = { x0: -ROOM2.w / 2, x1: ROOM2.w / 2, z0: ROOM2.z, z1: ROOM2.z + ROOM2.d };
        const you = R.player;
        for (const b of bouncers) {
          const { g, r, v } = b;
          v.y -= GRAVITY * dt;
          g.position.addScaledVector(v, dt);
          g.rotation.y += b.spin * dt;
          if (g.position.y < r) { g.position.y = r; v.y = b.hop; }
          if (g.position.y > ROOM2.h - r) { g.position.y = ROOM2.h - r; v.y = -Math.abs(v.y); }
          if (g.position.x < lim.x0 + r) { g.position.x = lim.x0 + r; v.x = Math.abs(v.x); }
          if (g.position.x > lim.x1 - r) { g.position.x = lim.x1 - r; v.x = -Math.abs(v.x); }
          if (g.position.z < lim.z0 + r) { g.position.z = lim.z0 + r; v.z = Math.abs(v.z); }
          if (g.position.z > lim.z1 - r) { g.position.z = lim.z1 - r; v.z = -Math.abs(v.z); }
          toward.subVectors(g.position, globe.position);
          const d = toward.length();
          if (d < BIG + r) {
            toward.divideScalar(d);
            g.position.copy(globe.position).addScaledVector(toward, BIG + r);
            const into = v.dot(toward);
            if (into < 0) v.addScaledVector(toward, -2 * into);
          }
          const dx = g.position.x - you.x;
          const dz = g.position.z - you.z;
          const flat = Math.hypot(dx, dz);
          if (g.position.y - r < EYE + 0.15 && flat < r + BODY && flat > 1e-6) {
            g.position.x = you.x + (dx / flat) * (r + BODY);
            g.position.z = you.z + (dz / flat) * (r + BODY);
            const into = (v.x * dx + v.z * dz) / flat;
            if (into < 0) { v.x -= (2 * into * dx) / flat; v.z -= (2 * into * dz) / flat; }
          }
        }
        for (let i = 0; i < bouncers.length; i++) {
          for (let j = i + 1; j < bouncers.length; j++) {
            const a = bouncers[i];
            const b = bouncers[j];
            toward.subVectors(b.g.position, a.g.position);
            const d = toward.length();
            if (d >= a.r + b.r || d < 1e-6) continue;
            toward.divideScalar(d);
            const overlap = (a.r + b.r - d) / 2;
            a.g.position.addScaledVector(toward, -overlap);
            b.g.position.addScaledVector(toward, overlap);
            const closing = a.v.dot(toward) - b.v.dot(toward);
            if (closing > 0) { a.v.addScaledVector(toward, -closing); b.v.addScaledVector(toward, closing); }
          }
        }
        for (const b of bouncers) {
          const flat = Math.hypot(b.v.x, b.v.z);
          if (flat > 1e-6) { b.v.x *= b.speed / flat; b.v.z *= b.speed / flat; }
          b.v.y = clamp(b.v.y, -b.hop * 1.2, b.hop);
        }
      }

      // ---------- The crowd ----------
      // An arc round the Osprey that leaves the middle clear, so from the
      // bench you see the whole photo over the one person crouching.
      const SPOTS = [
        [0.1, 1.2, "Crouching to look"],
        [-1.35, 1.35, "Leaning in"],
        [1.4, 1.5, "Pointing"],
        [-2.2, 1.85, "Hand on chin"],
        [2.35, 2.0, "Arms crossed"],
        [-1.55, 2.6, "Arms crossed"],
        [1.75, 2.75, "Taking a photo"],
        [-2.6, 3.0, "Hands on hips"],
        [2.85, 3.2, "Hand on chin"],
        [-1.2, 3.6, "On tiptoe, peeking"],
        [1.25, 3.85, "On tiptoe, peeking"],
        [-2.2, 4.1, "Taking a photo"],
        [2.4, 4.3, "Arms crossed"],
      ];
      const rand = rng(42);
      const looks = [...PEOPLE, ...SPOTS.slice(PEOPLE.length).map(() => randomLook(rand))];
      const order = [3, 0, 2, 4, 7, 1, 5, 6, 8, 9, 10, 11, 12];
      const people = SPOTS.map(([x, z, poseName], i) => placePerson(R, looks[order[i]], { x: x + (rand() - 0.5) * 0.1, z: z + (rand() - 0.5) * 0.1 }, poseName, osprey, { lean: (rand() - 0.5) * 0.3, phase: rand() * 10 }));
      const crowdSize = people.length;

      // A few others round the room: which photo, how they stand, how far
      // along the wall from its centre, how far back. Off to the side, so
      // the photo stays in view.
      const VISITORS = [
        ["DSC05851", "Leaning in", 0.9, 1.3],
        ["DSC04807", "Hands on hips", -0.95, 1.7],
        ["2-alt", "Hand on chin", -0.95, 1.7],
        ["2-alt", "Leaning in", 1.0, 1.3],
        ["3", "Taking a photo", 1.0, 1.9],
        ["DSC05752", "Pointing", -0.95, 1.5],
        ["DSC05752", "Arms crossed", 1.05, 2.1],
      ];
      for (const [stem, poseName, along, back] of VISITORS) {
        const { at, centre } = hung[stem];
        const pos = { x: at.x + Math.cos(at.rotY) * along + Math.sin(at.rotY) * back, z: at.z - Math.sin(at.rotY) * along + Math.cos(at.rotY) * back };
        people.push(placePerson(R, randomLook(rand), pos, poseName, centre, { lean: (rand() - 0.5) * 0.2 }));
      }

      // Beside "Lunch on the Wing", a gull making off with a slice of pizza:
      // someone pointing at it and cracking up.
      const gull = hung["Cruise-6"];
      const laughPose = {
        name: "Pointing and laughing",
        spine: [-0.06, 0, 0], neck: [-0.08, 0, 0], head: [-0.18, 0.1, 0.08],
        rShoulder: [-1.5, 0, -0.1], rElbow: [-0.15, 0, 0], rWrist: [-0.2, 0, 0],
        lHand: { on: "pelvis", at: [0.03, 0.15, 0.17], pole: [1, -0.4, 0] },
        lHip: [0, 0, 0.07], rHip: [-0.08, 0, -0.05], rKnee: [0.1, 0, 0],
      };
      const laugherEntry = placePerson(R, { height: 1.0, build: 1.22, skin: 1, hair: ["short", 0x6e3b1f], beard: 0x5a321b, top: 0xe8c547, sleeves: "short", legs: 0x33475b, shoes: 0xe9e4da }, { x: gull.centre.x + 1.15, z: 1.5 }, laughPose, gull.centre, { lean: 0.32 });
      people.push(laugherEntry);
      const laugher = laugherEntry.fig;
      laugher.baseY = laugher.root.position.y;
      const grin = part(new THREE.BoxGeometry(0.055, 0.026, 0.012), 0x3a1512, 0, 0.074, 0.107);
      laugher.J.head.add(grin);

      let laughNext = 2;
      let laughEnd = 0;
      let laughAmt = 0;
      const api = {
        walls: [
          [-ROOM.w / 2, 0, ROOM.w / 2, 0],
          [ROOM.w / 2, 0, ROOM.w / 2, ROOM.d],
          [-ROOM.w / 2, 0, -ROOM.w / 2, ENTRY.z - DOOR_HALF],
          [-ROOM.w / 2, ENTRY.z + DOOR_HALF, -ROOM.w / 2, ROOM.d],
          [-ROOM.w / 2, ROOM.d, -DOOR_HALF, ROOM.d],
          [DOOR_HALF, ROOM.d, ROOM.w / 2, ROOM.d],
          [-ROOM2.w / 2, ROOM2.z, -ROOM2.w / 2, ROOM2.z + ROOM2.d],
          [ROOM2.w / 2, ROOM2.z, ROOM2.w / 2, ROOM2.z + ROOM2.d],
          [-ROOM2.w / 2, ROOM2.z + ROOM2.d, ROOM2.w / 2, ROOM2.z + ROOM2.d],
        ],
        blockers: [-0.6, 0, 0.6].map((dx) => ({ x: bench.position.x + dx, z: bench.position.z, r: 0.3 })),
        people,
        crowdSize,
        laugher,
        laughs: [],
        update(t, dt) {
          if (!settings.reduceMotion) {
            for (const ring of rings) ring.rotation.y += ring.userData.speed * dt;
            bounce(dt);
          }
          // He breaks into a laugh every few seconds.
          if (t >= laughNext) {
            laughEnd = t + 1.7;
            laughNext = t + 5 + Math.random() * 5;
            api.laughs.forEach((f) => f());
          }
          laughAmt += ((t < laughEnd ? 1 : 0) - laughAmt) * Math.min(1, dt * 8);
          grin.scale.y = 1 + laughAmt * 1.6;
          if (settings.reduceMotion || laughAmt < 0.001) return;
          const shake = Math.sin(t * 22) * laughAmt;
          laugher.J.chest.rotation.x += shake * 0.05 - laughAmt * 0.06;
          laugher.J.head.rotation.x -= laughAmt * 0.18 + shake * 0.05;
          laugher.root.position.y = laugher.baseY + Math.abs(shake) * 0.012;
        },
      };
      return api;
    },
    sound(A, R, api) {
      const V = voiceKit(A);
      // Talk heard across a room: muffled, with some echo.
      const muffle = A.filter("lowpass", 2000, 0.7);
      muffle.connect(A.bus);
      const echo = A.ctx.createConvolver();
      echo.buffer = roomEcho(A.ctx, 1.8);
      const echoSend = A.gain(0.4);
      echoSend.connect(echo).connect(muffle);
      const centroid = (list) => {
        const c = new THREE.Vector3();
        for (const f of list) c.add(f.fig.root.position);
        return c.divideScalar(list.length);
      };
      const groups = [];
      const group = (n, loud, where) => {
        const out = A.gain(loud);
        let pan = null;
        if (where) {
          const at = where();
          pan = A.placed(at.x, 1.5, at.z, 1.2, 1.4);
          pan.disconnect();
          out.connect(pan);
          pan.connect(muffle);
          pan.connect(echoSend);
        } else {
          const far = A.filter("lowpass", 900);
          out.connect(far).connect(muffle);
          far.connect(echoSend);
        }
        for (let i = 0; i < n; i++) V.voice(out, i % 2 === 0);
        groups.push({ pan, where });
      };
      const people = api.people;
      group(6, 0.2, () => centroid(people.slice(0, api.crowdSize)));
      group(2, 0.15, () => centroid(people.slice(api.crowdSize + 2, api.crowdSize + 4)));
      group(2, 0.15, () => centroid(people.slice(api.crowdSize + 5, api.crowdSize + 7)));
      group(4, 0.06, null);
      const laughOut = A.gain(0.5);
      const lp = api.laugher.root.position;
      const laughPan = A.placed(lp.x, 1.65, lp.z, 1.2, 1.4);
      laughPan.disconnect();
      laughOut.connect(laughPan);
      laughPan.connect(muffle);
      laughPan.connect(echoSend);
      const laugh = V.laugher(laughOut);
      api.laughs = [laugh];
      return {
        update() {
          for (const g of groups) if (g.pan) { const c = g.where(); A.move(g.pan, c.x, 1.5, c.z); }
          A.move(laughPan, lp.x, 1.65, lp.z);
        },
      };
    },
  };
