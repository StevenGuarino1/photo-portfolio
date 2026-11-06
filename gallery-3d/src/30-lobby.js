  // ---------- Shared building pieces for rooms ----------

  // A wall's face, with a doorway cut out of it if `door` is given (its
  // centre along the wall, its half-width and its height). Faces +z.
  function wallFaces(length, height, material, door, skirtColor = 0x1d1d21) {
    const g = new THREE.Group();
    const piece = (x0, x1, y0, y1) => {
      if (x1 - x0 < 0.001 || y1 - y0 < 0.001) return;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), material);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      m.receiveShadow = true;
      g.add(m);
    };
    const skirt = (x0, x1) => { if (skirtColor !== null && x1 - x0 > 0.001) g.add(part(new THREE.BoxGeometry(x1 - x0, 0.12, 0.03), skirtColor, (x0 + x1) / 2, 0.06, 0.015)); };
    if (!door) {
      piece(-length / 2, length / 2, 0, height);
      skirt(-length / 2, length / 2);
      return g;
    }
    const a = door.x - door.half;
    const b = door.x + door.half;
    piece(-length / 2, a, 0, height);
    piece(b, length / 2, 0, height);
    piece(a, b, door.h, height);
    skirt(-length / 2, a);
    skirt(b, length / 2);
    return g;
  }

  // A doorframe: two posts and a lintel round an opening, facing +z.
  function doorFrame(color, half = DOOR_HALF, h = DOOR_H, depth = 0.3, w = 0.09) {
    const g = new THREE.Group();
    g.add(
      part(new THREE.BoxGeometry(w, h + w, depth), color, -half - w / 2, (h + w) / 2, 0),
      part(new THREE.BoxGeometry(w, h + w, depth), color, half + w / 2, (h + w) / 2, 0),
      part(new THREE.BoxGeometry(half * 2 + w * 2, w, depth), color, 0, h + w / 2, 0),
    );
    return g;
  }

  // Floorboards, drawn once onto a canvas: 8 boards across one copy.
  function boardsTexture(seed, base = [44, 34, 26]) {
    return canvasTex(512, 512, (g) => {
      const r = rng(seed);
      for (let i = 0; i < 8; i++) {
        const v = r() * 12;
        g.fillStyle = `rgb(${base[0] + v + 10}, ${base[1] + v}, ${base[2] + v - 6})`;
        g.fillRect(i * 64, 0, 64, 512);
        g.fillStyle = "rgba(0, 0, 0, 0.45)";
        g.fillRect(i * 64, 0, 2, 512);
        g.fillRect(i * 64, r() * 512, 64, 2);
      }
    });
  }

  // Merge everything static under `group` into one mesh per material: far
  // fewer draw calls for rooms built from many small pieces. Anything marked
  // `keep` (or inside something marked `keep`) is left alone.
  function mergeStatic(group) {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map();
    const victims = [];
    group.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
      for (let p = o; p && p !== group; p = p.parent) if (p.userData.keep) return;
      const g = o.geometry;
      const key = o.material.uuid + "|" + Object.keys(g.attributes).sort().join(",") + "|" + (g.index ? "i" : "n");
      if (!buckets.has(key)) buckets.set(key, { material: o.material, list: [] });
      buckets.get(key).list.push(o);
    });
    for (const { material, list } of buckets.values()) {
      if (list.length < 2) continue;
      const geos = list.map((o) => o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
      const merged = new THREE.Mesh(mergeGeometries(geos), material);
      merged.castShadow = list.some((o) => o.castShadow);
      merged.receiveShadow = list.some((o) => o.receiveShadow);
      group.add(merged);
      victims.push(...list);
    }
    for (const o of victims) { o.parent.remove(o); o.geometry.dispose(); }
  }

  // ---------- The lobby ----------
  // A long, wide hall in matte black: plain dark walls, floor and ceiling,
  // a thin line of light down the middle of the ceiling. Doors down both
  // sides, each with the room's name over it in white and a short
  // vestibule beyond, whose walls take on the room's
  // colour as you go and whose floor catches its light. The way in is at
  // the near end, between two featured photos.

  ROOMS.lobby = {
    name: "The Lobby",
    tagline: "Every room starts here",
    color: 0xe7c27d,
    fogColor: 0x0a0a0a,
    loudness: 1.75,
    ground: "wood",
    spawn: { x: 0, z: 0.6, yaw: Math.PI, pitch: -0.03 },
    build(R) {
      const W = LOBBY.half;
      const H = LOBBY.height;
      const LEN = LOBBY.length;
      const Z0 = -1; // the entrance wall
      R.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.012);
      const fogBase = new THREE.Color(0x0a0a0a);

      R.add(new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.35));
      // A thin strip of light down the middle of the ceiling; real lights
      // follow you along under it.
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, LEN - Z0 - 2), new THREE.MeshBasicMaterial({ color: 0xf4f4f4, toneMapped: false }));
      strip.position.set(0, H - 0.01, (LEN + Z0) / 2);
      R.add(strip);
      const lamps = [0, 1, 2].map((k) => {
        const l = new THREE.PointLight(0xf2f2f2, 10, 14, 1.6);
        l.position.set(0, H - 1.2, 2 + k * LOBBY.spacing * 2);
        R.add(l);
        return l;
      });

      // Floor and ceiling: matte black, the floor with the faintest sheen.
      const floorGeo = new THREE.PlaneGeometry(W * 2, LEN - Z0);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.82 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.set(0, 0, (LEN + Z0) / 2);
      floor.receiveShadow = true;
      const ceilGeo = new THREE.PlaneGeometry(W * 2, LEN - Z0);
      ceilGeo.rotateX(Math.PI / 2);
      const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 });
      const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
      ceiling.position.set(0, H, (LEN + Z0) / 2);
      R.add(floor, ceiling);

      const walls = [];
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 1 });
      // The two long walls, with a doorway at each slot on that side. The
      // stretches between doorways have a material of their own (the same to
      // look at), so they merge into one piece that can be swapped out for
      // breakable block once the launcher comes in (32-hall.js).
      const segMat = wallMat.clone();
      const segments = [];
      for (const side of [-1, 1]) {
        const mine = SLOTS.filter((sl) => sl.dir.x === side && ROOMS[sl.room]).map((sl) => sl.base.z).sort((p, q) => p - q);
        let z = Z0;
        const piece = (z0, z1) => {
          if (z1 - z0 < 0.01) return;
          const w = wallFaces(z1 - z0, H, segMat, null, null);
          w.position.set(side * W, 0, (z0 + z1) / 2);
          w.rotation.y = -side * Math.PI / 2;
          R.add(w);
          walls.push([side * W, z0, side * W, z1]);
          segments.push({ side, z0, z1, doorBefore: z0 !== Z0, doorAfter: z1 !== LEN });
        };
        for (const dz of mine) {
          piece(z, dz - DOOR_HALF);
          // Above the doorway.
          const over = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_HALF * 2, H - DOOR_H), wallMat);
          over.position.set(side * W, DOOR_H + (H - DOOR_H) / 2, dz);
          over.rotation.y = -side * Math.PI / 2;
          R.add(over);
          z = dz + DOOR_HALF;
        }
        piece(z, LEN);
      }
      // The far end, and the entrance end.
      const far = wallFaces(W * 2, H, wallMat, null, null);
      far.position.set(0, 0, LEN);
      far.rotation.y = Math.PI;
      R.add(far);
      walls.push([-W, LEN, W, LEN]);
      const near = wallFaces(W * 2, H, wallMat, null, null);
      near.position.set(0, 0, Z0);
      R.add(near);
      walls.push([-W, Z0, W, Z0]);
      // The way in: a window onto the portfolio site (see 95-site.js).
      SITE.attach(R, Z0);

      const leaks = [];
      const lobbyTone = new THREE.Color(0x171717);
      for (const slot of SLOTS) {
        const def = ROOMS[slot.room];
        if (!def) continue;
        const d = slot.dir;
        const t = new THREE.Vector3(d.z, 0, -d.x); // across the doorway
        const turn = Math.atan2(d.x, d.z);
        const frame = doorFrame(0x0c0c0c, DOOR_HALF, DOOR_H, 0.2, 0.04);
        frame.position.copy(slot.base);
        frame.rotation.y = turn + Math.PI;
        R.add(frame);
        // The room's name over the door, and a stripe in its colour.
        const plate = labelMesh([def.name], "minimal", 1.5);
        plate.position.copy(slot.base).addScaledVector(d, -0.02).setY(DOOR_H + 0.62);
        plate.rotation.y = turn + Math.PI;
        R.add(plate);
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.05), new THREE.MeshBasicMaterial({ color: def.color }));
        stripe.scale.set(0.25, 0.6, 1);
        stripe.position.copy(slot.base).addScaledVector(d, -0.021).setY(DOOR_H + 0.22);
        stripe.rotation.y = turn + Math.PI;
        R.add(stripe);

        // The vestibule, built along its own +z from the hall wall.
        const L = LOBBY.corridor;
        const CH = LOBBY.corridorH;
        const CW = LOBBY.corridorHalf;
        const room = new THREE.Color(def.leak ?? def.color);
        const shadeWall = (geo, sign) => {
          const pos = geo.attributes.position;
          const cols = new Float32Array(pos.count * 3);
          const c = new THREE.Color();
          for (let i = 0; i < pos.count; i++) {
            const k = THREE.MathUtils.inverseLerp(-L / 2, L / 2, sign * pos.getX(i));
            c.copy(lobbyTone).lerp(room.clone().multiplyScalar(0.55), smooth(k, 0.2, 1) * 0.75);
            cols.set([c.r, c.g, c.b], i * 3);
          }
          geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
          return geo;
        };
        const vestibule = new THREE.Group();
        const vmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
        for (const s of [-1, 1]) {
          const m = new THREE.Mesh(shadeWall(new THREE.PlaneGeometry(L, CH, 10, 1), s), vmat);
          m.position.set(s * CW, CH / 2, L / 2);
          m.rotation.y = -s * Math.PI / 2;
          vestibule.add(m);
        }
        const vfloorGeo = new THREE.PlaneGeometry(CW * 2, L);
        vfloorGeo.rotateX(-Math.PI / 2);
        scaleUV(vfloorGeo, (CW * 2) / 4, L / 4);
        const vfloor = new THREE.Mesh(vfloorGeo, floorMat);
        vfloor.position.set(0, 0.001, L / 2);
        const vceilGeo = new THREE.PlaneGeometry(CW * 2, L);
        vceilGeo.rotateX(Math.PI / 2);
        const vceil = new THREE.Mesh(vceilGeo, ceilMat);
        vceil.position.set(0, CH, L / 2);
        vestibule.add(vfloor, vceil);
        // The stubs either side of the hall doorway, inside the vestibule.
        for (const s of [-1, 1]) {
          const stub = new THREE.Mesh(new THREE.PlaneGeometry(CW - DOOR_HALF, CH), vmat);
          stub.position.set(s * (CW + DOOR_HALF) / 2, CH / 2, 0.001);
          vestibule.add(stub);
        }
        const endWall = wallFaces(CW * 2, CH, new THREE.MeshStandardMaterial({ color: room.clone().multiplyScalar(0.3).lerp(lobbyTone, 0.3), roughness: 0.95 }), { x: 0, half: DOOR_HALF, h: DOOR_H }, null);
        endWall.position.set(0, 0, L);
        endWall.rotation.y = Math.PI;
        vestibule.add(endWall);
        const endFrame = doorFrame(def.frame ?? 0x2b2119);
        endFrame.position.set(0, 0, L - 0.05);
        endFrame.rotation.y = Math.PI;
        vestibule.add(endFrame);
        vestibule.add(part(new THREE.BoxGeometry(0.5, 0.04, 0.5), 0x0c0c0c, 0, CH - 0.02, 1.6));
        const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xfff0d8 }));
        bulb.rotation.x = Math.PI / 2;
        bulb.position.set(0, CH - 0.045, 1.6);
        vestibule.add(bulb);
        const spill = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, color: room.clone().multiplyScalar(0.55), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        spill.rotation.x = -Math.PI / 2;
        spill.position.set(0, 0.006, L - 0.9);
        vestibule.add(spill);
        const card = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_HALF * 4, DOOR_H * 1.6), new THREE.MeshBasicMaterial({ map: glowTex, color: room.clone().multiplyScalar(0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        card.position.set(0, DOOR_H / 2, L + 0.25);
        card.rotation.y = Math.PI;
        vestibule.add(card);
        vestibule.position.copy(slot.base);
        vestibule.rotation.y = turn;
        R.add(vestibule);
        leaks.push({ slot, spill, card, base: spill.material.color.clone(), style: def.leakStyle });

        // Bumping: the vestibule's sides and the stubs at each end.
        const at = (along, across) => slot.base.clone().addScaledVector(d, along).addScaledVector(t, across);
        for (const s of [-1, 1]) {
          const p0 = at(0, s * CW);
          const p1 = at(L, s * CW);
          const q = at(L, s * DOOR_HALF);
          const r = at(0, s * DOOR_HALF);
          walls.push([p0.x, p0.z, p1.x, p1.z], [p1.x, p1.z, q.x, q.z], [r.x, r.z, p0.x, p0.z]);
        }
      }

      // A few benches down the middle.
      const blockers = [];
      for (let z = 5.5; z < LEN - 3; z += LOBBY.spacing * 2) {
        const bench = new THREE.Group();
        bench.add(part(new THREE.BoxGeometry(0.45, 0.44, 1.8), 0x0e0e0e, 0, 0.22, 0));
        bench.position.set(0, 0, z);
        R.add(bench);
        for (const k of [-0.6, 0, 0.6]) blockers.push({ x: 0, z: z + k, r: 0.3 });
      }

      // Hundreds of small static pieces, drawn as a handful.
      mergeStatic(R.root);
      const segPlanes = [];
      R.root.traverse((o) => { if (o.isMesh && o.material === segMat) segPlanes.push(o); });

      // The fight (32-hall.js) is only built once the launcher is carried in.
      // Its sounds hook in through these lists, which exist from the start.
      const hooks = { booms: [], launches: [], crumbles: [], growls: [], hurts: [], deaths: [] };
      let fight = null;
      // A blast borrows the lamp nearest it for its flash: pulled over to
      // the blast, flaring orange, then easing back to its place. (A light
      // of its own would change every shader in the hall.)
      const FLARE = new THREE.Color(0xffa860);
      let flare = null;
      const settleLamp = (l) => { l.position.x = 0; l.position.y = H - 1.2; l.color.setHex(0xf2f2f2); l.intensity = 10; };
      const flashAt = (p) => {
        if (flare) settleLamp(flare.lamp);
        const lamp = lamps.reduce((a, b) => (a.position.distanceToSquared(p) <= b.position.distanceToSquared(p) ? a : b));
        flare = { lamp, at: new THREE.Vector3(p.x * 0.85, Math.max(0.6, p.y), p.z), t: 0 };
      };
      function arm() {
        if (fight) return fight;
        fight = hallFight(R, { segments, W, H, LEN, Z0, blockers, low: Q.density < 0.5, hooks, flashAt });
        for (const m of segPlanes) m.visible = false;
        // The new pieces take on the lobby's stencil and clipping as they
        // stand (it may be showing through a doorway right now).
        const was = R.reg.through;
        R.reg.through = undefined;
        setThrough(R.reg, !!was);
        hush();
        return fight;
      }

      // A doorway whose room isn't built yet is closed for the moment.
      const barriers = () => doors.filter((door) => !regions[door.room].loaded).map((door) => {
        const p0 = door.center.clone().addScaledVector(door.tangent, -DOOR_HALF - 0.1);
        const p1 = door.center.clone().addScaledVector(door.tangent, DOOR_HALF + 0.1);
        return [p0.x, p0.z, p1.x, p1.z];
      });

      return {
        walls,
        blockers,
        barriers,
        hooks,
        get fight() { return fight; },
        // With the launcher (31-arms.js, 32-hall.js).
        launch: (from, dir) => arm().launch(from, dir),
        armsHint: ["Hollow walls", "Something's moving behind them"],
        cameraFx: () => fight?.cameraFx() ?? null,
        action: { label: "Repair the hall", run: () => fight?.repair(), when: () => !!fight?.damaged },
        onKey: (code) => { if (code === "KeyR" && fight?.damaged) fight.repair(); },
        update(t, dt, { cor, here }) {
          // The launcher's come in: from now on the walls can break.
          if (here && ARMS.carrying && !fight) arm();
          // The lamps follow you down the hall.
          const you = R.player;
          lamps.forEach((l, k) => { l.position.z = clamp(Math.round(you.z / LOBBY.spacing) * LOBBY.spacing + 2 + (k - 1) * LOBBY.spacing, 2, LEN - 2); });
          fight?.update(t, dt, here);
          if (flare) {
            flare.t += dt;
            const l = flare.lamp;
            const k = Math.exp(-flare.t * 6);
            if (k < 0.02) {
              settleLamp(l);
              flare = null;
            } else {
              l.position.x = 0;
              l.position.y = H - 1.2;
              l.position.lerp(flare.at, Math.min(1, k * 1.5));
              l.color.setHex(0xf2f2f2).lerp(FLARE, k);
              l.intensity = 10 + 150 * k;
            }
          }
          // Walking down a vestibule, the air takes on the room's colour.
          const target = cor?.room ? fogBase.clone().lerp(new THREE.Color(ROOMS[cor.room].fogColor ?? 0x0a0a0a), smooth(cor.progress, 0, 1) * 0.8) : fogBase;
          R.scene.fog.color.lerp(target, Math.min(1, dt * 3));
          R.scene.fog.density = lerp(R.scene.fog.density, cor?.room ? 0.012 + cor.progress * 0.02 : 0.012, Math.min(1, dt * 3));
          // Each room's light flickers or ripples the way its room does.
          for (const leak of leaks) {
            let k = 1;
            if (leak.style === "flicker") k = 0.75 + 0.25 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1));
            if (leak.style === "ripple") k = 0.85 + 0.15 * Math.sin(t * 2.3) * Math.sin(t * 1.3);
            if (leak.style === "bands") k = 0.6 + 0.4 * Math.max(0, Math.sin(t * 4.5)) ** 4;
            if (leak.style === "sun") k = 0.95 + 0.05 * Math.sin(t * 0.7);
            leak.spill.material.color.copy(leak.base).multiplyScalar(k);
          }
        },
      };
    },
    sound(A, R, api) {
      // The lobby's hush: a soft room tone.
      const tone = A.filter("lowpass", 220, 0.5);
      const g = A.gain(0.05);
      A.hiss().connect(tone).connect(g).connect(A.bus);
      const hooks = api?.hooks;
      if (!hooks) return {};
      // A long hard hall: everything loud rings on in it.
      const ctx = A.ctx;
      const hall = ctx.createConvolver();
      {
        const len = Math.floor(ctx.sampleRate * 2.4);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const d = ir.getChannelData(c);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 400 ? i / 400 : 1);
        }
        hall.buffer = ir;
      }
      const wet = A.gain(0.55);
      hall.connect(wet).connect(A.bus);
      const out = (node, dry = 1) => {
        const d = A.gain(dry);
        node.connect(d).connect(A.bus);
        node.connect(hall);
      };
      const noise = (t, len) => {
        const src = ctx.createBufferSource();
        src.buffer = audio.noise;
        src.start(t, Math.random() * 1.5, len);
        return src;
      };
      // One-shot oscillators made here rather than with A.osc, which keeps
      // every node it makes for the life of the room (forever, in the lobby).
      const osc = (type, freq, t, until) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.start(t);
        o.stop(until);
        return o;
      };
      hooks.launches.push(() => {
        const t = ctx.currentTime;
        const f = A.filter("bandpass", 900, 0.8);
        const g2 = A.gain(0);
        noise(t, 1).connect(f).connect(g2);
        out(g2);
        f.frequency.setValueAtTime(1500, t);
        f.frequency.exponentialRampToValueAtTime(300, t + 0.8);
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.7, t + 0.02);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      });
      hooks.booms.push((p) => {
        const d = Math.max(2, R.camLocal.distanceTo(new THREE.Vector3(p.x, p.y, p.z)));
        const t = ctx.currentTime + 0.01 + d / 343;
        const loud = Math.min(0.85, 9 / d);
        const low = A.filter("lowpass", 900, 0.7);
        const g2 = A.gain(0);
        noise(t, 2).connect(low).connect(g2);
        out(g2);
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(loud * 2, t + 0.008);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        low.frequency.setValueAtTime(2400, t);
        low.frequency.exponentialRampToValueAtTime(120, t + 1);
        const sub = osc("sine", 60, t, t + 0.9);
        const sg = A.gain(0);
        sub.connect(sg);
        out(sg, 1.2);
        sg.gain.setValueAtTime(loud * 1.4, t);
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        sub.frequency.setValueAtTime(60, t);
        sub.frequency.exponentialRampToValueAtTime(26, t + 0.7);
      });
      // Block and grit coming down, a clatter thinning out.
      hooks.crumbles.push((p, n) => {
        const t = ctx.currentTime + 0.05;
        const len = Math.min(2.2, 0.6 + n / 40);
        const f = A.filter("bandpass", 1100, 0.9);
        const g2 = A.gain(0);
        const pan = A.placed(p.x, p.y, p.z, 3, 1);
        noise(t, len).connect(f).connect(g2).connect(pan);
        g2.connect(hall);
        for (let k = 0; k < len; k += 0.03 + Math.random() * 0.07) g2.gain.setValueAtTime(Math.random() < 0.45 ? 0 : Math.random() * 0.45 * (1 - k / len), t + k);
        g2.gain.setValueAtTime(0, t + len);
      });
      // A shade stirring: a low breath that rises and drags.
      hooks.growls.push((s) => {
        const t = ctx.currentTime + Math.random() * 0.6;
        const f0 = 52 + Math.random() * 18;
        const o = osc("sawtooth", f0, t, t + 1.7);
        const f = A.filter("lowpass", 240, 3);
        const g2 = A.gain(0);
        const pan = A.placed(s.x, 1.6, s.z, 2, 1.1);
        o.connect(f).connect(g2).connect(pan);
        const br = A.filter("bandpass", 700, 1.4);
        const bg = A.gain(0);
        noise(t, 1.6).connect(br).connect(bg).connect(pan);
        for (const [gn, peak] of [[g2, 0.16], [bg, 0.1]]) {
          gn.gain.setValueAtTime(0, t);
          gn.gain.linearRampToValueAtTime(peak, t + 0.5);
          gn.gain.linearRampToValueAtTime(peak * 0.6, t + 1.1);
          gn.gain.linearRampToValueAtTime(0, t + 1.6);
        }
        o.frequency.setValueAtTime(f0, t);
        o.frequency.linearRampToValueAtTime(f0 * 0.7, t + 1.6);
      });
      // Coming apart: a soft rush of dust.
      hooks.deaths.push((s) => {
        const t = ctx.currentTime + 0.15;
        const f = A.filter("highpass", 900, 0.5);
        const g2 = A.gain(0);
        noise(t, 1.2).connect(f).connect(g2).connect(A.placed(s.x, 1, s.z, 2, 1));
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.25, t + 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      });
      // Hit: a dull thump and a ring in the ears.
      hooks.hurts.push(() => {
        const t = ctx.currentTime;
        const th = osc("sine", 110, t, t + 0.35);
        const tg = A.gain(0);
        th.connect(tg).connect(A.bus);
        tg.gain.setValueAtTime(0.5, t);
        tg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        th.frequency.setValueAtTime(110, t);
        th.frequency.exponentialRampToValueAtTime(45, t + 0.3);
        const f = A.filter("bandpass", 1800, 2);
        const g2 = A.gain(0);
        noise(t, 0.2).connect(f).connect(g2).connect(A.bus);
        g2.gain.setValueAtTime(0.2, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      });
      return {};
    },
  };
