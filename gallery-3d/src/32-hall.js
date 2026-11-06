  // ---------- The hall's walls, and what lives in them ----------
  // Carry the launcher out of the Range and the lobby's long walls turn out
  // to be breakable: black paint over raw concrete block, with a hollow
  // behind each stretch between the vestibules. A blast blows a hole (the
  // grey shows round its edges), anything left hanging drops, and rubble
  // skids across the floor. In the hollows live the shades: tall, stooped
  // figures the same black as the hall, with pale eyes. Through a small
  // hole you only see the eyes; once one is big enough to climb through,
  // they come out after you. A blast throws them and they come apart into
  // black dust. If they reach you they swipe; five swipes and you come to
  // by the entrance with the hall put back. R, or the button, repairs it.
  //
  // None of this exists until the launcher is first carried into the lobby
  // (30-lobby.js builds it then), so the hall costs nothing extra otherwise.

  let hurtEl = null; // the red at the edges of the screen when you're hit

  function hallFight(R, { segments, W, H, LEN, Z0, blockers, low, hooks, flashAt }) {
    const BH = 0.5; // block height
    const T = 0.3; // the wall's thickness
    const DEEP = LOBBY.corridor - 0.4; // how far back the hollows go
    const CW = LOBBY.corridorHalf;
    const RAD = 1.35; // what a blast takes out of a wall
    const KILL = 3.2; // and how far it throws a shade
    const FULL = 5; // swipes you can take
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sv = new THREE.Vector3();
    const C = new THREE.Color();
    const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    const TURN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const NONE = new THREE.Quaternion();

    // ---------- The walls ----------
    // Each block is the black paint on the hall side and, behind it, a grey
    // core of raw concrete with no face of its own on that side. A core is
    // only drawn while its block borders a hole: that's the only place its
    // sides can be seen. Unbroken, a wall is nothing but the paint, the same
    // surface as the plain wall it stands in for. (Drawn everywhere, the
    // cores' sides meet the paint edge-on at every joint, and at one angle
    // or another the slightest rounding lets them through as thin lines.)
    // Built facing +x (the left wall) and turned round for the right.
    const paintGeo = new THREE.PlaneGeometry(1.02, 1.02); // a hair over, so neighbours overlap
    paintGeo.rotateY(Math.PI / 2);
    paintGeo.translate(0.5, 0, 0);
    const raw = new THREE.Color(0x6b6660);
    const coreGeo = new THREE.BoxGeometry(1, 1, 1);
    coreGeo.setIndex(Array.from(coreGeo.index.array).slice(6)); // all but the +x face
    coreGeo.clearGroups();
    const paintMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 1 });
    // Pushed back in depth a touch, so even round a hole the paint wins.
    const coreMat = new THREE.MeshStandardMaterial({ color: raw, roughness: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    let count = 0;
    for (const seg of segments) {
      const len = seg.z1 - seg.z0;
      seg.n = Math.max(1, Math.round(len / 0.5));
      seg.bw = len / seg.n;
      seg.rows = Math.round(H / BH);
      seg.state = new Uint8Array(seg.n * seg.rows).fill(1);
      seg.inst = count;
      count += seg.n * seg.rows;
      // The hollow behind it stops short of the vestibules either side.
      seg.c0 = seg.z0 + (seg.doorBefore ? CW - DOOR_HALF + 0.05 : 0);
      seg.c1 = seg.z1 - (seg.doorAfter ? CW - DOOR_HALF + 0.05 : 0);
      seg.exits = [];
      seg.broken = false;
      seg.spawned = 0;
      seg.next = 0;
    }
    const paint = new THREE.InstancedMesh(paintGeo, paintMat, count);
    const core = new THREE.InstancedMesh(coreGeo, coreMat, count);
    for (const im of [paint, core]) {
      im.frustumCulled = false;
      im.receiveShadow = true;
      im.userData.keep = true;
      R.add(im);
    }
    const at = (seg, i, j) => j * seg.n + i;
    // A little variation from block to block in the concrete.
    for (let k = 0; k < count; k++) core.setColorAt(k, C.setScalar(0.9 + Math.random() * 0.2));
    const coreOn = new Uint8Array(count);
    function blockMatrix(seg, i, j) {
      return m4.compose(
        tmp.set(seg.side * (W + T / 2), (j + 0.5) * BH, seg.z0 + (i + 0.5) * seg.bw),
        seg.side > 0 ? TURN : NONE,
        sv.set(T, BH, seg.bw),
      );
    }
    function placeAll() {
      for (const seg of segments) for (let j = 0; j < seg.rows; j++) for (let i = 0; i < seg.n; i++) {
        const k = seg.inst + at(seg, i, j);
        paint.setMatrixAt(k, seg.state[at(seg, i, j)] ? blockMatrix(seg, i, j) : ZERO);
        core.setMatrixAt(k, ZERO);
      }
      coreOn.fill(0);
      paint.instanceMatrix.needsUpdate = true;
      core.instanceMatrix.needsUpdate = true;
    }
    placeAll();
    function knock(seg, i, j) {
      seg.state[at(seg, i, j)] = 0;
      paint.setMatrixAt(seg.inst + at(seg, i, j), ZERO);
      paint.instanceMatrix.needsUpdate = true;
    }
    // Cores on for blocks beside a gap, off for the rest.
    function rims(seg) {
      const { n, rows, state } = seg;
      for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
        const id = at(seg, i, j);
        const on = state[id] && ((i > 0 && !state[id - 1]) || (i < n - 1 && !state[id + 1]) || (j > 0 && !state[id - n]) || (j < rows - 1 && !state[id + n])) ? 1 : 0;
        const k = seg.inst + id;
        if (coreOn[k] === on) continue;
        coreOn[k] = on;
        core.setMatrixAt(k, on ? blockMatrix(seg, i, j) : ZERO);
        core.instanceMatrix.needsUpdate = true;
      }
    }

    // ---------- The hollows behind them ----------
    {
      const concrete = canvasTex(256, 256, (g) => {
        const r = rng(311);
        g.fillStyle = "#77716a";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2600; i++) {
          g.fillStyle = `rgba(${r() < 0.6 ? "30,28,26" : "170,164,154"}, ${r() * 0.14})`;
          g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
        }
        // Block courses, and old damp running down.
        g.fillStyle = "rgba(25, 23, 21, 0.55)";
        for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 256, 2);
        for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? 0 : 32; x < 256; x += 64) g.fillRect(x, y, 2, 32);
        for (let i = 0; i < 14; i++) {
          const x = r() * 256;
          const grad = g.createLinearGradient(0, 0, 0, 256);
          grad.addColorStop(0, "rgba(20, 18, 16, 0.4)");
          grad.addColorStop(1, "rgba(20, 18, 16, 0)");
          g.fillStyle = grad;
          g.fillRect(x, 0, 4 + r() * 10, 120 + r() * 136);
        }
      });
      concrete.repeat.set(2.5, 2.5);
      const mat = new THREE.MeshStandardMaterial({ map: concrete, color: 0x8a8580, roughness: 1, side: THREE.BackSide });
      const geos = segments.map((seg) => {
        const g = new THREE.BoxGeometry(DEEP, H, seg.c1 - seg.c0);
        g.translate(seg.side * (W + T + DEEP / 2), H / 2, (seg.c0 + seg.c1) / 2);
        return g;
      });
      const hollows = new THREE.Mesh(mergeGeometries(geos), mat);
      hollows.userData.keep = true;
      R.add(hollows);
    }

    // ---------- Rubble ----------
    // Chunks of block, one face of each still painted.
    const MAXD = low ? 300 : 700;
    const chunkGeo = new THREE.BoxGeometry(1, 1, 1);
    {
      const n = chunkGeo.attributes.normal;
      const col = new Float32Array(n.count * 3);
      const black = new THREE.Color(0x171717);
      for (let i = 0; i < n.count; i++) (n.getX(i) > 0.5 ? black : raw).toArray(col, i * 3);
      chunkGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    }
    const debris = new THREE.InstancedMesh(chunkGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), MAXD);
    debris.frustumCulled = false;
    debris.userData.keep = true;
    for (let d = 0; d < MAXD; d++) debris.setMatrixAt(d, ZERO);
    debris.count = 0;
    R.add(debris);
    const DP = new Float32Array(MAXD * 3);
    const DV = new Float32Array(MAXD * 3);
    const DR = new Float32Array(MAXD * 3);
    const DW = new Float32Array(MAXD * 3);
    const DS = new Float32Array(MAXD * 3);
    const live = new Uint8Array(MAXD); // 0 unused, 1 moving, 2 at rest
    let nextD = 0;
    function chunk(x, y, z, vx, vy, vz, sx, sy, sz) {
      const d = nextD;
      nextD = (nextD + 1) % MAXD;
      debris.count = Math.max(debris.count, d + 1);
      DP.set([x, y, z], d * 3);
      DV.set([vx, vy, vz], d * 3);
      DR.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], d * 3);
      DW.set([(Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9], d * 3);
      DS.set([sx, sy, sz], d * 3);
      live[d] = 1;
    }
    // `you`: where you are in the hall, or null if you're off in a room.
    function stepDebris(dt, you) {
      let moved = false;
      for (let d = 0; d < debris.count; d++) {
        if (live[d] !== 1) continue;
        moved = true;
        const o = d * 3;
        DV[o + 1] -= 9.8 * dt;
        for (let k = 0; k < 3; k++) { DP[o + k] += DV[o + k] * dt; DR[o + k] += DW[o + k] * dt; }
        const half = DS[o + 1] / 2;
        // Off the far wall of the hall, or the back of a hollow: only when
        // heading into it, so a piece blown out through a hole carries on.
        const ax = Math.abs(DP[o]);
        const lim = ax < W + T / 2 ? W - 0.1 : W + T + DEEP - 0.1;
        if (ax > lim && DV[o] * Math.sign(DP[o]) > 0) { DP[o] = Math.sign(DP[o]) * lim; DV[o] *= -0.3; }
        if (DP[o + 2] < Z0 + 0.1 || DP[o + 2] > LEN - 0.1) { DP[o + 2] = clamp(DP[o + 2], Z0 + 0.1, LEN - 0.1); DV[o + 2] *= -0.3; }
        // Off you: nothing flies through your head.
        if (you) {
          const ox = DP[o] - you.x;
          const oz = DP[o + 2] - you.z;
          const od = Math.hypot(ox, oz);
          if (od < 0.45 && DP[o + 1] < 1.95) {
            const nx = od > 1e-4 ? ox / od : 1;
            const nz = od > 1e-4 ? oz / od : 0;
            DP[o] = you.x + nx * 0.45;
            DP[o + 2] = you.z + nz * 0.45;
            const vn = DV[o] * nx + DV[o + 2] * nz;
            if (vn < 0) { DV[o] -= 1.4 * vn * nx; DV[o + 2] -= 1.4 * vn * nz; }
          }
        }
        if (DP[o + 1] - half < 0) {
          DP[o + 1] = half;
          const sp = Math.abs(DV[o + 1]);
          DV[o + 1] = sp > 2 ? sp * 0.25 : 0;
          DV[o] *= 0.5;
          DV[o + 2] *= 0.5;
          for (let k = 0; k < 3; k++) DW[o + k] *= 0.5;
          if (sp < 1 && Math.hypot(DV[o], DV[o + 2]) < 0.3) {
            live[d] = 2;
            // Lie flat once it's settled.
            DR[o] = Math.round(DR[o] / (Math.PI / 2)) * (Math.PI / 2);
            DR[o + 2] = Math.round(DR[o + 2] / (Math.PI / 2)) * (Math.PI / 2);
          }
        }
        e.set(DR[o], DR[o + 1], DR[o + 2]);
        q.setFromEuler(e);
        debris.setMatrixAt(d, m4.compose(tmp.set(DP[o], DP[o + 1], DP[o + 2]), q, sv.set(DS[o], DS[o + 1], DS[o + 2])));
      }
      if (moved) debris.instanceMatrix.needsUpdate = true;
    }

    // ---------- Holes ----------
    // Anything no longer joined to the floor, the ceiling or the door
    // frames at either end comes down.
    function settle(seg) {
      const { n, rows, state } = seg;
      const seen = new Uint8Array(n * rows);
      const stack = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
        if ((j === 0 || j === rows - 1 || i === 0 || i === n - 1) && state[at(seg, i, j)]) { seen[at(seg, i, j)] = 1; stack.push(at(seg, i, j)); }
      }
      while (stack.length) {
        const id = stack.pop();
        const i = id % n;
        const j = Math.floor(id / n);
        for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
          if (a < 0 || b < 0 || a >= n || b >= rows) continue;
          const k = at(seg, a, b);
          if (state[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
        }
      }
      let fell = 0;
      for (let k = 0; k < n * rows; k++) {
        if (!state[k] || seen[k]) continue;
        const i = k % n;
        const j = Math.floor(k / n);
        knock(seg, i, j);
        chunk(seg.side * (W + T / 2), (j + 0.5) * BH, seg.z0 + (i + 0.5) * seg.bw, -seg.side * Math.random() * 0.8, -0.5, (Math.random() - 0.5) * 0.6, T, BH * 0.9, seg.bw * 0.9);
        fell++;
      }
      return fell;
    }
    // Where a shade can get out: a gap at least three blocks wide and four
    // tall (about 1.5 by 2 m) whose bottom is the floor or a ledge.
    function findExits(seg) {
      seg.exits = [];
      const { n, rows } = seg;
      for (let i = 1; i < n - 1; i++) {
        const z = seg.z0 + (i + 0.5) * seg.bw;
        if (z < seg.c0 + 0.45 || z > seg.c1 - 0.45) continue;
        for (let j = 0; j + 4 <= rows; j++) {
          let open = true;
          for (let b = j; b < j + 4 && open; b++) for (let a = i - 1; a <= i + 1; a++) if (seg.state[at(seg, a, b)]) { open = false; break; }
          if (!open) continue;
          seg.exits.push({ z, y: j * BH });
          break;
        }
      }
    }
    let damaged = false;
    function breakWalls(p) {
      let hit = 0;
      for (const seg of segments) {
        const wx = seg.side * (W + T / 2);
        if (Math.abs(p.x - wx) > RAD + T || p.z < seg.z0 - RAD || p.z > seg.z1 + RAD) continue;
        const i0 = Math.max(0, Math.floor((p.z - RAD - seg.z0) / seg.bw));
        const i1 = Math.min(seg.n - 1, Math.floor((p.z + RAD - seg.z0) / seg.bw));
        const j0 = Math.max(0, Math.floor((p.y - RAD) / BH));
        const j1 = Math.min(seg.rows - 1, Math.floor((p.y + RAD) / BH));
        let gone = 0;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          if (!seg.state[at(seg, i, j)]) continue;
          tmp.set(wx, (j + 0.5) * BH, seg.z0 + (i + 0.5) * seg.bw);
          const d = tmp.distanceTo(p);
          if (d > RAD * (0.75 + Math.random() * 0.35)) continue;
          knock(seg, i, j);
          gone++;
          // Bits of it: most blown on into the hollow, some spat back out
          // across the hall.
          const pieces = Math.random() < 0.5 ? 2 : 1;
          for (let c = 0; c < pieces; c++) {
            const back = Math.random() < 0.45;
            const push = (1 - d / RAD) * 9 + 2;
            tmp2.subVectors(tmp, p).normalize();
            const vx = back ? -seg.side * (1.5 + Math.random() * push * 0.5) : seg.side * (2 + Math.random() * push);
            const s = 0.12 + Math.random() * 0.22;
            chunk(tmp.x, tmp.y, tmp.z, vx, tmp2.y * push + 2 + Math.random() * 3, tmp2.z * push * 0.7, s * (0.8 + Math.random() * 0.6), s, s * (0.8 + Math.random() * 0.6));
          }
          if (Math.random() < 0.5) fx.puff(tmp.x - seg.side * 0.4, tmp.y, tmp.z, { size: 1.2, grow: 1.6, life: 5 + Math.random() * 4, vy: 0.2, vx: -seg.side * (0.5 + Math.random()), drag: 0.8, color: 0x8a8378, spread: 0.6, peak: 0.45 });
        }
        if (!gone) continue;
        hit += gone + settle(seg);
        rims(seg);
        findExits(seg);
        damaged = true;
        if (!seg.broken) {
          seg.broken = true;
          // They were in there all along. They come out one after another,
          // and later on, more from the dark at the back.
          const n = 2 + Math.floor(Math.random() * 2);
          for (let k = 0; k < n; k++) spawn(seg, 2.5 + k * 2.5 + Math.random() * 1.5);
          seg.next = 9 + Math.random() * 6;
        }
      }
      return hit;
    }

    // ---------- The shades ----------
    const MAXS = low ? 8 : 12;
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.9 }); // matte: no shine off the ceiling strip
    const parts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), shadeMat, MAXS * 6);
    const eyes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xe6f0ff, toneMapped: false }), MAXS * 2);
    for (const im of [parts, eyes]) {
      im.frustumCulled = false;
      im.userData.keep = true;
      for (let k = 0; k < im.count; k++) im.setMatrixAt(k, ZERO);
      R.add(im);
    }
    parts.castShadow = true;
    // One rig, posed for each shade in turn and read off into the instances.
    const node = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent?.add(o); return o; };
    const box = (parent, x, y, z, sx, sy, sz) => { const o = node(parent, x, y, z); o.scale.set(sx, sy, sz); return o; };
    const rig = node(null, 0, 0, 0);
    const tumble = node(rig, 0, 0.95, 0);
    const hipL = node(tumble, -0.12, 0, 0);
    const hipR = node(tumble, 0.12, 0, 0);
    const torso = node(tumble, 0, 0, 0);
    const neck = node(torso, 0, 0.7, 0.02);
    const shL = node(torso, -0.27, 0.64, 0);
    const shR = node(torso, 0.27, 0.64, 0);
    const boxes = [
      box(hipL, 0, -0.47, 0, 0.13, 0.95, 0.15),
      box(hipR, 0, -0.47, 0, 0.13, 0.95, 0.15),
      box(torso, 0, 0.35, 0, 0.38, 0.72, 0.2),
      box(neck, 0, 0.12, 0.04, 0.19, 0.25, 0.21),
      box(shL, 0, -0.55, 0, 0.075, 1.1, 0.075),
      box(shR, 0, -0.55, 0, 0.075, 1.1, 0.075),
    ];
    const eyeBoxes = [box(neck, -0.048, 0.14, 0.152, 0.04, 0.018, 0.01), box(neck, 0.048, 0.14, 0.152, 0.04, 0.018, 0.01)];

    const shades = [];
    function spawn(seg, wait) {
      if (shades.length >= MAXS) return;
      seg.spawned++;
      const back = W + T + 0.9 + Math.random() * (DEEP - 1.5);
      const s = {
        seg, state: "lurk", t: -wait, x: seg.side * back, y: 0, z: seg.c0 + 0.5 + Math.random() * Math.max(0.1, seg.c1 - seg.c0 - 1),
        yaw: seg.side > 0 ? -Math.PI / 2 : Math.PI / 2, phase: Math.random() * 6, speed: 1.2 + Math.random() * 0.5,
        hunch: 0.42 + Math.random() * 0.15, arm: 0, climb: 0, moving: false, blink: 2 + Math.random() * 4,
        vx: 0, vy: 0, vz: 0, wx: 0, wz: 0, spinX: 0, spinZ: 0, scale: 1, swung: false, exit: null, leg: 0,
      };
      shades.push(s);
      hooks.growls.forEach((f) => f(s));
    }
    function pose(s, t) {
      rig.position.set(s.x, s.y, s.z);
      rig.rotation.set(0, s.yaw, 0);
      rig.scale.set(1, s.scale, 1);
      tumble.rotation.set(s.spinX, 0, s.spinZ);
      const walk = s.moving ? 1 : 0;
      const sw = Math.sin(s.phase) * 0.6 * walk;
      hipL.rotation.x = sw;
      hipR.rotation.x = -sw;
      // Stooped, swaying a little while it waits, glancing about.
      torso.rotation.x = s.hunch + (walk ? 0.08 : Math.sin(t * 0.9 + s.phase) * 0.05);
      neck.rotation.x = -0.25 + Math.sin(t * 0.6 + s.phase * 2) * 0.12 * (1 - walk);
      neck.rotation.y = Math.sin(t * 0.37 + s.phase) * 0.35 * (1 - walk);
      // Arms hang straight down whatever the stoop; they swing as it walks,
      // reach up to haul it out of a hole, and come up over its head to
      // swipe.
      const hang = -torso.rotation.x;
      const up = Math.max(s.arm, s.climb * 0.8);
      shL.rotation.x = hang - sw * 0.7 - up * 2.4;
      shR.rotation.x = hang + sw * 0.7 - up * 2.1;
      shL.rotation.z = -0.08;
      shR.rotation.z = 0.08;
      rig.updateMatrixWorld(true);
    }
    function drawShades(t) {
      for (let i = 0; i < MAXS; i++) {
        const s = shades[i];
        if (!s) {
          for (let b = 0; b < 6; b++) parts.setMatrixAt(i * 6 + b, ZERO);
          eyes.setMatrixAt(i * 2, ZERO);
          eyes.setMatrixAt(i * 2 + 1, ZERO);
          continue;
        }
        pose(s, t);
        boxes.forEach((b, n) => parts.setMatrixAt(i * 6 + n, b.matrixWorld));
        // Eyes blink now and then, and go out as it dies.
        const shut = s.state === "thrown" || s.state === "fade" || (s.blink % 4.3) < 0.12;
        eyeBoxes.forEach((b, n) => eyes.setMatrixAt(i * 2 + n, shut ? ZERO : b.matrixWorld));
      }
      parts.instanceMatrix.needsUpdate = true;
      eyes.instanceMatrix.needsUpdate = true;
    }

    // ---------- You ----------
    let health = FULL;
    let calm = 0; // seconds since you were last hurt
    let shake = 0;
    let hurtFlash = 0;
    let downed = false;
    if (!hurtEl) {
      hurtEl = document.createElement("div");
      hurtEl.style.cssText = "position:fixed;inset:0;pointer-events:none;opacity:0;z-index:7;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(90,6,6,0.55) 78%, rgba(30,0,0,0.9) 100%);";
      document.body.appendChild(hurtEl);
    }
    function hurt(from) {
      if (downed) return;
      health--;
      calm = 0;
      hurtFlash = 1;
      shake = Math.max(shake, 1.2);
      hooks.hurts.forEach((f) => f());
      // Knocked back a step (through the doorways' rules like any step).
      const you = R.player;
      const dx = you.x - from.x;
      const dz = you.z - from.z;
      const d = Math.hypot(dx, dz) || 1;
      const before = { x: me.x, z: me.z };
      me.x += (dx / d) * 0.55;
      me.z += (dz / d) * 0.55;
      collide(me, BODY, R.reg);
      crossDoors(before);
      if (health <= 0) {
        downed = true;
        setTimeout(() => {
          goTo("lobby");
          setTimeout(() => {
            repair();
            toast("You came to by the door", "The hall's been put back");
          }, 300);
        }, 700);
      }
    }

    // ---------- Blasts ----------
    // No lights of its own: the lobby lends one of its lamps for the flash,
    // so nothing in the hall's shaders changes.
    const fx = fxKit(R, { low, flash: false, scorchY: 0.01 });
    function boom(p) {
      fx.burst(p, 0.32);
      flashAt?.(p);
      if (p.y < 0.4) fx.scorch(p, 2.5 + Math.random());
      for (const s of shades) {
        if (s.state === "thrown" || s.state === "fade") continue;
        // One in a hollow is only caught by a blast that got into it.
        const hidden = Math.abs(s.x) > W + T / 2;
        if (hidden && !(Math.sign(p.x) === Math.sign(s.x) && Math.abs(p.x) > W - 0.4)) continue;
        const d = Math.hypot(s.x - p.x, s.y + 1 - p.y, s.z - p.z);
        if (d > KILL) continue;
        const k = 1 - d / KILL;
        const dx = (s.x - p.x) / (d || 1);
        const dz = (s.z - p.z) / (d || 1);
        s.state = "thrown";
        s.t = 0;
        s.vx = dx * (4 + k * 9);
        s.vz = dz * (4 + k * 9);
        s.vy = 3 + k * 6;
        s.wx = (Math.random() - 0.5) * 9;
        s.wz = (Math.random() - 0.5) * 9;
        s.arm = 0;
        s.climb = 0;
        hooks.deaths.forEach((f) => f(s));
      }
      // Then the wall: the shades a breach reveals weren't in the way of
      // the blast that revealed them.
      const n = breakWalls(p);
      if (n) hooks.crumbles.forEach((f) => f(p, n));
      // Too close yourself.
      const d = R.camLocal.distanceTo(p);
      shake = Math.max(shake, 2.2 * clamp(1 - (d - 2) / 14, 0.25, 1));
      if (d < 2.4 && !downed) hurt(p);
      hooks.booms.forEach((f) => f(p));
    }

    // Where a missile flying through `p` goes off, or null to fly on.
    function hit(p) {
      if (p.y <= 0.05) return p.clone().setY(0.1);
      if (p.y >= H - 0.05) return p.clone().setY(H - 0.1);
      const ax = Math.abs(p.x);
      const body = (s) => s.state !== "thrown" && s.state !== "fade" && Math.hypot(p.x - s.x, p.z - s.z) < 0.4 && p.y > s.y && p.y < s.y + 1.95;
      if (ax < W) {
        if (p.z <= Z0 + 0.05 || p.z >= LEN - 0.05) return p.clone().setZ(clamp(p.z, Z0 + 0.1, LEN - 0.1));
        if (ax < 0.26 && p.y < 0.46 && blockers.some((b) => Math.abs(b.z - p.z) < 0.6 && Math.abs(b.x - p.x) < 0.3)) return p.clone();
        return shades.some(body) ? p.clone() : null;
      }
      const side = Math.sign(p.x);
      const seg = segments.find((sg) => sg.side === side && p.z >= sg.z0 && p.z <= sg.z1);
      if (seg) {
        if (ax < W + T) {
          const i = clamp(Math.floor((p.z - seg.z0) / seg.bw), 0, seg.n - 1);
          const j = clamp(Math.floor(p.y / BH), 0, seg.rows - 1);
          return seg.state[at(seg, i, j)] ? p.clone().setX(side * (W - 0.05)) : null;
        }
        // Through a hole and into a hollow.
        if (shades.some((s) => s.seg === seg && body(s))) return p.clone();
        if (ax > W + T + DEEP - 0.1 || p.z < seg.c0 + 0.1 || p.z > seg.c1 - 0.1) return p.clone();
        return null;
      }
      // A doorway: the wall over it, or the vestibule beyond.
      if (ax < W + 0.25 && p.y > DOOR_H) return p.clone().setX(side * (W - 0.05));
      if (p.y > LOBBY.corridorH - 0.05 || ax > W + LOBBY.corridor - 0.2) return p.clone();
      const door = SLOTS.find((sl) => sl.dir?.x === side && Math.abs(sl.base.z - p.z) < CW + 0.5);
      if (!door || Math.abs(door.base.z - p.z) > CW - 0.05) return p.clone();
      return null;
    }
    const missiles = missileKit(R, fx, { hit, boom, light: 0 });

    function repair() {
      for (const seg of segments) {
        seg.state.fill(1);
        seg.exits = [];
        seg.broken = false;
        seg.spawned = 0;
        seg.next = 0;
      }
      placeAll();
      live.fill(0);
      for (let d = 0; d < MAXD; d++) debris.setMatrixAt(d, ZERO);
      debris.count = 0;
      debris.instanceMatrix.needsUpdate = true;
      shades.length = 0;
      drawShades(0);
      fx.clear();
      missiles.clear();
      health = FULL;
      calm = 0;
      hurtFlash = 0;
      downed = false;
      damaged = false;
    }

    // ---------- Each frame ----------
    // Walk toward a point, keeping clear of the others; returns how far it
    // was.
    function steer(s, tx, tz, dt, speed) {
      let dx = tx - s.x;
      let dz = tz - s.z;
      const d = Math.hypot(dx, dz);
      if (d < 1e-4) return d;
      dx /= d;
      dz /= d;
      for (const o of shades) {
        if (o === s || o.state !== "chase") continue;
        const ox = s.x - o.x;
        const oz = s.z - o.z;
        const od = Math.hypot(ox, oz);
        if (od < 0.75 && od > 1e-4) { dx += (ox / od) * 0.8; dz += (oz / od) * 0.8; }
      }
      const l = Math.hypot(dx, dz) || 1;
      const step = Math.min(d, speed * dt);
      s.x += (dx / l) * step;
      s.z += (dz / l) * step;
      face(s, Math.atan2(dx, dz), dt * 8);
      s.phase += step * 3.4;
      s.moving = step > 1e-4;
      return d;
    }
    function face(s, want, k) {
      s.yaw += Math.atan2(Math.sin(want - s.yaw), Math.cos(want - s.yaw)) * Math.min(1, k);
    }
    function inHall(s) {
      for (const b of blockers) {
        const dx = s.x - b.x;
        const dz = s.z - b.z;
        const d = Math.hypot(dx, dz);
        if (d < b.r + 0.3 && d > 1e-4) { s.x = b.x + (dx / d) * (b.r + 0.3); s.z = b.z + (dz / d) * (b.r + 0.3); }
      }
      s.x = clamp(s.x, -W + 0.35, W - 0.35);
      s.z = clamp(s.z, Z0 + 0.4, LEN - 0.4);
    }

    const api = {
      launch(from, dir) {
        missiles.launch(from, dir);
        hooks.launches.forEach((f) => f());
      },
      get damaged() { return damaged; },
      get shades() { return shades; },
      get health() { return health; },
      repair,
      cameraFx() {
        if (shake <= 0.001) return null;
        return { x: (Math.random() - 0.5) * shake * 0.05, y: (Math.random() - 0.5) * shake * 0.04, roll: (Math.random() - 0.5) * shake * 0.012 };
      },
      // `here`: you're in the lobby (not looking in from a room).
      update(t, dt, here) {
        missiles.step(dt);
        stepDebris(dt, here ? R.player : null);
        fx.step(dt);
        shake *= Math.exp(-dt * 6);
        const you = R.player;
        const active = here && !downed;
        for (let i = shades.length - 1; i >= 0; i--) {
          const s = shades[i];
          s.t += dt;
          s.blink += dt;
          s.moving = false;
          if (s.state === "lurk") {
            // Turn toward the hole, and wait.
            const ex = s.seg.exits.length ? s.seg.exits.reduce((a, b) => (Math.abs(b.z - s.z) < Math.abs(a.z - s.z) ? b : a)) : null;
            face(s, Math.atan2(-s.seg.side, ((ex?.z ?? you.z) - s.z) * 0.3), dt * 2);
            if (ex && s.t > 0) { s.state = "out"; s.exit = ex; s.leg = 0; }
          } else if (s.state === "out") {
            // To the hole from inside, up onto its sill, through, and down.
            const ex = s.exit;
            if (s.leg === 0) {
              if (steer(s, s.seg.side * (W + T + 0.35), ex.z, dt, s.speed * 0.8) < 0.05) s.leg = 1;
            } else if (s.leg === 1) {
              const rising = s.y < ex.y - 1e-3;
              s.climb += ((rising ? 1 : 0) - s.climb) * Math.min(1, dt * 6);
              s.y = Math.min(ex.y, s.y + dt * 2.2);
              s.hunch = Math.min(0.9, s.hunch + dt);
              if (!rising && steer(s, s.seg.side * (W - 0.45), ex.z, dt, s.speed * 0.7) < 0.05) { s.leg = 2; s.vy = 0; }
            } else {
              s.climb = Math.max(0, s.climb - dt * 4);
              s.vy -= 9.8 * dt;
              s.y = Math.max(0, s.y + s.vy * dt);
              s.hunch += (0.5 - s.hunch) * Math.min(1, dt * 3);
              if (s.y <= 0) { s.state = "chase"; s.t = 0; }
            }
          } else if (s.state === "chase") {
            // Out in the hall they come for you; while you're off in a
            // room they stand and wait.
            const d = Math.hypot(you.x - s.x, you.z - s.z);
            if (here) {
              if (d > 0.9) steer(s, you.x, you.z, dt, s.speed);
              else face(s, Math.atan2(you.x - s.x, you.z - s.z), dt * 6);
              inHall(s);
            }
            if (active && d < 1.05) { s.state = "swing"; s.t = 0; s.swung = false; }
          } else if (s.state === "swing") {
            face(s, Math.atan2(you.x - s.x, you.z - s.z), dt * 6);
            // Wind up slowly (time to back off), come down fast, recover.
            s.arm = s.t < 0.8 ? smooth(s.t, 0, 0.8) : s.t < 0.92 ? 1 - smooth(s.t, 0.8, 0.92) * 1.25 : -0.25 * (1 - smooth(s.t, 0.92, 1.5));
            if (!s.swung && s.t > 0.86) {
              s.swung = true;
              if (active && Math.hypot(you.x - s.x, you.z - s.z) < 1.45) hurt(s);
            }
            if (s.t > 1.5) { s.state = "chase"; s.arm = 0; }
          } else if (s.state === "thrown") {
            s.vy -= 9.8 * dt;
            s.x += s.vx * dt;
            s.z += s.vz * dt;
            s.y += s.vy * dt;
            s.spinX += s.wx * dt;
            s.spinZ += s.wz * dt;
            if (Math.abs(s.x) < W) inHall(s);
            else {
              s.x = Math.sign(s.x) * clamp(Math.abs(s.x), W + T + 0.3, W + T + DEEP - 0.3);
              s.z = clamp(s.z, s.seg.c0 + 0.3, s.seg.c1 - 0.3);
            }
            if (s.y <= 0 && s.t > 0.15) { s.y = 0; s.state = "fade"; s.t = 0; s.vx = s.vz = 0; }
          } else if (s.state === "fade") {
            // Comes apart into black dust where it lies.
            s.scale = Math.max(0.02, 1 - s.t / 0.9);
            if (Math.random() < dt * 14) fx.puff(s.x, 0.3 + Math.random() * s.scale, s.z, { size: 0.5, grow: 1.4, life: 2 + Math.random() * 2, vy: 0.5 + Math.random() * 0.6, color: 0x121212, spread: 0.6, peak: 0.55 });
            if (s.t > 0.9) { shades.splice(i, 1); continue; }
          }
        }
        // While a hollow stands open, more keep coming out of the dark at
        // its back now and then.
        for (const seg of segments) {
          if (!seg.exits.length || seg.spawned >= 8 || shades.length >= MAXS) continue;
          seg.next -= dt;
          if (seg.next <= 0) {
            seg.next = 9 + Math.random() * 6;
            spawn(seg, 0.5);
          }
        }
        drawShades(t);
        // Getting your breath back.
        calm += dt;
        if (calm > 6 && health < FULL && !downed) { health++; calm = 0; }
        hurtFlash = Math.max(0, hurtFlash - dt * 1.6);
        hurtEl.style.opacity = (here ? Math.max(hurtFlash, (FULL - health) * 0.17) : 0).toFixed(3);
      },
    };
    return api;
  }
