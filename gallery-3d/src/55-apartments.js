  // ---------- The Apartments ----------
  // An abandoned apartment block, five floors you can walk and many more
  // you can't. Long corridors of identical doors run off into the dark,
  // a few doors hang open onto empty flats with an old couch or a stained
  // mattress, exit signs point every which way, and the stairwell's narrow
  // well drops and climbs past landings until they're lost. Through the
  // windows, the rest of the block goes on: wings and towers of the same
  // building all around, a few windows lit.
  //
  // Basic shapes for now: walls, doors, furniture as boxes.

  const AP = (() => {
    const H = 3.0; // floor to floor
    const FLOORS = 5; // 0..4 walkable
    // The stairwell, east of the corridors: two flights per floor either
    // side of an open well, with a half landing at the far end.
    const SX0 = 33.3, SA1 = 35.6, SB0 = 36.4, SX1 = 38.7; // flight A (up), the well, flight B
    const SZ0 = 12, SZ1 = 20, SZL = 22.5; // flights run z 12 to 20; landing to 22.5
    return { H, FLOORS, SX0, SA1, SB0, SX1, SZ0, SZ1, SZL };
  })();

  // Like the Lighthouse, the floor height alone can't say which floor
  // you're on, so the room keeps track. A jump to one of its spots says
  // where it lands.
  const AP_STATE = { mode: "floor", F: 0, base: 0, pending: null, changed: true };
  const apSpot = (spot, mode, F) => {
    AP_STATE.pending = { x: spot.x, z: spot.z, mode, F, at: performance.now() };
    return spot;
  };

  ROOMS.apartments = {
    name: "The Apartments",
    short: "Apartments",
    tagline: "Hundreds of rooms, and nobody home",
    color: 0x9aa58a,
    leak: 0xc8d0a0,
    leakStyle: "flicker",
    frame: 0x3a3630,
    fogColor: 0x07080a,
    loudness: 0.8,
    ground: "wood",
    entrance: { x: 0, z: 0, nx: 0, nz: -1 },
    get spawn() { return apSpot({ x: 0, z: 1.6, yaw: Math.PI, pitch: 0.02 }, "floor", 0); },
    spots: {
      get corridor() { return apSpot({ name: "Down the Corridor", x: -2.5, z: 11, yaw: Math.PI / 2, pitch: 0 }, "floor", 1); },
      get well() { return apSpot({ name: "Down the Stairwell", x: 36.0, z: 11.7, yaw: Math.PI, pitch: -0.95 }, "floor", 2); },
      get top() { return apSpot({ name: "The Top Floor", x: 32, z: 27, yaw: Math.PI / 2, pitch: 0 }, "floor", 4); },
    },
    build(R) {
      const { H, FLOORS, SX0, SA1, SB0, SX1, SZ0, SZ1, SZL } = AP;
      const S = AP_STATE;
      S.changed = true;
      const D = Q.density;
      const WT = 0.15; // wall thickness
      const DH = 2.1; // door height
      R.scene.fog = new THREE.FogExp2(0x07080a, 0.05);

      // ---------- Light ----------
      const hemi = new THREE.HemisphereLight(0x5a6070, 0x1a1814, 0.4);
      R.add(hemi);
      const bulbs = Array.from({ length: D < 0.5 ? 3 : 4 }, () => {
        const l = new THREE.PointLight(0xd8e0c0, 3.0, 10, 1.6);
        R.add(l);
        return l;
      });

      // ---------- Materials ----------
      const paper = canvasTex(256, 256, (g) => {
        const r = rng(2101);
        g.fillStyle = "#8c8a72";
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = "rgba(60, 58, 44, 0.25)";
        for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 10, 256);
        for (let i = 0; i < 30; i++) {
          const x = r() * 256;
          const y = r() * 200;
          const h = 40 + r() * 200;
          const grad = g.createLinearGradient(0, y, 0, y + h);
          grad.addColorStop(0, `rgba(70, 60, 40, ${0.15 + r() * 0.25})`);
          grad.addColorStop(1, "rgba(70, 60, 40, 0)");
          g.fillStyle = grad;
          g.fillRect(x, y, 6 + r() * 30, h);
        }
        for (let i = 0; i < 8; i++) {
          // Torn patches showing plaster.
          g.fillStyle = "rgba(190, 184, 168, 0.8)";
          g.beginPath();
          const x = r() * 256;
          const y = r() * 256;
          g.moveTo(x, y);
          for (let k = 0; k < 6; k++) g.lineTo(x + (r() - 0.3) * 40, y + (r() - 0.3) * 40);
          g.fill();
        }
      });
      paper.repeat.set(1 / 2.5, 1 / 2.5);
      // World-mapped so walls of any size share the same scale.
      const wallMat = new THREE.MeshLambertMaterial({ map: paper });
      wallMat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
          #ifdef USE_MAP
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vec3 an = abs(normalize(mat3(modelMatrix) * normal));
            vMapUv = (an.x > an.z ? wp.zy : wp.xy) / 2.5;
          #endif`);
      };
      const floorTex = canvasTex(256, 256, (g) => {
        const r = rng(2102);
        g.fillStyle = "#4a4236";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? "30,26,20" : "90,80,64"}, 0.3)`;
          g.fillRect(0, i * 32, 256, 31);
          g.fillStyle = "rgba(0, 0, 0, 0.4)";
          g.fillRect(0, i * 32, 256, 1);
        }
        for (let i = 0; i < 20; i++) {
          const x = r() * 256;
          const y = r() * 256;
          const rad = 10 + r() * 40;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, `rgba(20, 16, 10, ${0.2 + r() * 0.3})`);
          blob.addColorStop(1, "rgba(20, 16, 10, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      });
      floorTex.repeat.set(30, 15);
      const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
      const ceilMat = new THREE.MeshLambertMaterial({ color: 0x6a685e });
      const carpetMat = new THREE.MeshLambertMaterial({ color: 0x4a2a26 });
      const doorMat = new THREE.MeshLambertMaterial({ color: 0x5a4a38 });
      const trimMat = new THREE.MeshLambertMaterial({ color: 0x3a3228 });
      const concrete = new THREE.MeshLambertMaterial({ color: 0x5c5a55 });
      // The stairwell glows faintly, so you can see the flights going on
      // down and up the well long after the lights give out.
      const stairStone = new THREE.MeshLambertMaterial({ color: 0x5c5a55, emissive: 0x24231f });
      const stairRail = new THREE.MeshLambertMaterial({ color: 0x2a2826, emissive: 0x161512 });
      const railMat = new THREE.MeshLambertMaterial({ color: 0x2a2826 });
      const glassMat = new THREE.MeshBasicMaterial({ color: 0x1a2230, transparent: true, opacity: 0.35, depthWrite: false });
      const lampOn = new THREE.MeshBasicMaterial({ color: 0xe8ecd0, toneMapped: false });
      const lampOff = new THREE.MeshLambertMaterial({ color: 0x3a3a36 });
      const couchMats = [0x5a4a3a, 0x3e4a3c, 0x6a3a30, 0x4a4650, 0x7a6a50].map((c) => new THREE.MeshLambertMaterial({ color: c }));
      const mattressMat = new THREE.MeshLambertMaterial({ color: 0x8a7e66 });
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
      const exitTex = canvasTex(128, 48, (g) => {
        g.fillStyle = "#0c3a1c";
        g.fillRect(0, 0, 128, 48);
        g.fillStyle = "#6aff9a";
        g.font = "600 26px Poppins, system-ui, sans-serif";
        g.textBaseline = "middle";
        g.fillText("EXIT", 10, 25);
        g.beginPath();
        g.moveTo(96, 12); g.lineTo(120, 24); g.lineTo(96, 36); g.closePath();
        g.fill();
      }, { repeat: false });
      fontsReady.then(() => (exitTex.needsUpdate = true));
      const exitMat = new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: false });

      const box = (parent, material, x0, y0, z0, x1, y1, z1) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), material);
        m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        parent.add(m);
        return m;
      };

      // ---------- The plan ----------
      // Corridor 1 runs along z 10..12, corridor 2 along z 26..28, joined
      // at both ends (x ±31..33) and down the middle (x -1..1). Flats are
      // 6 m wide: a front row (z 0..10, windows on the street), two rows
      // back to back in the middle block (z 12..19, 19..26), and a back row
      // (z 28..36, windows on the yard). The entrance hall runs in at
      // x -1..1 from the front.
      const XS = [];
      for (let k = 0; k < 5; k++) XS.push([-31 + k * 6, -25 + k * 6], [1 + k * 6, 7 + k * 6]);
      const ROWS = [
        { z0: 0, z1: 10, door: 10, win: 0 },
        { z0: 12, z1: 19, door: 12, win: null },
        { z0: 19, z1: 26, door: 26, win: null },
        { z0: 28, z1: 36, door: 28, win: 36 },
      ];
      // Walls on the plan for every walkable floor, as lines for bumping
      // into and boxes for drawing; holes are doors (pass) or windows.
      const floorLines = Array.from({ length: FLOORS }, () => []);
      const floors = [];
      const working = Array.from({ length: FLOORS }, () => []);
      const furniture = Array.from({ length: FLOORS }, () => []);
      const openFlats = [];
      for (let F = 0; F < FLOORS; F++) {
        const g = new THREE.Group();
        g.position.y = F * H;
        R.add(g);
        floors.push(g);
        const lines = floorLines[F];
        const r = rng(2200 + F * 101);
        // An axis-aligned wall from a to b along x (at z) or along z (at
        // x), with holes { a, b, y0, y1, pass }.
        const wall = (axis, at, a, b, holes = []) => {
          holes = holes.filter((h) => h.b > a && h.a < b).sort((p, q) => p.a - q.a);
          const piece = (p0, p1, y0, y1) => {
            if (p1 - p0 < 0.01 || y1 - y0 < 0.01) return;
            if (axis === "x") box(g, wallMat, p0, y0, at - WT / 2, p1, y1, at + WT / 2);
            else box(g, wallMat, at - WT / 2, y0, p0, at + WT / 2, y1, p1);
          };
          const line = (p0, p1) => { if (p1 - p0 > 0.01) lines.push(axis === "x" ? [p0, at, p1, at] : [at, p0, at, p1]); };
          let c = a;
          for (const h of holes) {
            piece(c, h.a, 0, H);
            if (!h.pass) line(c, h.b);
            else line(c, h.a);
            piece(h.a, h.b, 0, h.y0);
            piece(h.a, h.b, h.y1, H);
            c = h.b;
          }
          piece(c, b, 0, H);
          line(c, b);
        };
        const doorHole = (p) => ({ a: p - 0.5, b: p + 0.5, y0: 0, y1: DH, pass: true });
        const winHole = (p) => ({ a: p - 0.8, b: p + 0.8, y0: 0.9, y1: 2.2, pass: false });
        const windowAt = (axis, at, p, inward) => {
          // Glass, a frame, and sometimes no glass at all.
          const broken = r() < 0.3;
          if (!broken) {
            const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), glassMat);
            pane.position.set(axis === "x" ? p : at, 1.55, axis === "x" ? at : p);
            if (axis === "z") pane.rotation.y = Math.PI / 2;
            pane.userData.keep = true;
            pane.renderOrder = 2;
            g.add(pane);
          }
          if (axis === "x") box(g, trimMat, p - 0.85, 0.85, at - 0.12, p + 0.85, 0.9, at + 0.12);
          else box(g, trimMat, at - 0.12, 0.85, p - 0.85, at + 0.12, 0.9, p + 0.85);
          void inward;
        };
        // Door slabs: closed in the wall, or swung open into the flat.
        const doorSlab = (z, x, open, side) => {
          if (!open) {
            box(g, doorMat, x - 0.5, 0, z - 0.04, x + 0.5, DH, z + 0.04);
          } else {
            const d = new THREE.Mesh(new THREE.BoxGeometry(1.0, DH, 0.06), doorMat);
            d.geometry.translate(0.5, DH / 2, 0);
            const ang = (0.9 + r() * 0.8) * side;
            d.position.set(x - 0.5, 0, z);
            d.rotation.y = ang;
            g.add(d);
          }
          // A frame either way.
          box(g, trimMat, x - 0.58, 0, z - 0.1, x - 0.5, DH + 0.08, z + 0.1);
          box(g, trimMat, x + 0.5, 0, z - 0.1, x + 0.58, DH + 0.08, z + 0.1);
          box(g, trimMat, x - 0.58, DH, z - 0.1, x + 0.58, DH + 0.08, z + 0.1);
        };
        // Each flat: whether its door is open, and where along its wall.
        const flats = [];
        for (const row of ROWS) {
          for (const [x0, x1] of XS) {
            const open = r() < 0.32;
            const dx = x0 + 1.2 + r() * 3.6;
            flats.push({ row, x0, x1, open, dx });
          }
        }
        // Corridor-side walls, with doors.
        const doorsOn = (z) => flats.filter((f) => f.row.door === z).map((f) => (f.open ? doorHole(f.dx) : null)).filter(Boolean);
        wall("x", 10, -33, 39, [...doorsOn(10), { a: -1, b: 1, y0: 0, y1: H, pass: true }]);
        wall("x", 12, -31, 31, [...doorsOn(12), { a: -1, b: 1, y0: 0, y1: H, pass: true }]);
        wall("x", 26, -31, 31, [...doorsOn(26), { a: -1, b: 1, y0: 0, y1: H, pass: true }]);
        wall("x", 28, -33, 33, [...doorsOn(28), { a: -1, b: 1, y0: 0, y1: H, pass: true }]);
        for (const f of flats) doorSlab(f.row.door, f.dx, f.open, f.row.door === 10 || f.row.door === 26 ? 1 : -1);
        // Party walls between flats, and the back wall of the middle block.
        const bounds = [-31, -25, -19, -13, -7, -1, 1, 7, 13, 19, 25, 31];
        for (const x of bounds) {
          wall("z", x, 0, 10);
          wall("z", x, 12, 26);
          wall("z", x, 28, 36);
        }
        wall("x", 19, -31, -1);
        wall("x", 19, 1, 31);
        // The outside walls, with windows: front, back, the west end.
        const frontHoles = [];
        const backHoles = [];
        for (const [x0, x1] of XS) {
          frontHoles.push(winHole((x0 + x1) / 2));
          backHoles.push(winHole((x0 + x1) / 2));
        }
        if (F > 0) frontHoles.push(winHole(0));
        else frontHoles.push({ a: -0.8, b: 0.8, y0: 0, y1: 2.4, pass: true });
        backHoles.push(winHole(0));
        wall("x", 0, -31, 31, frontHoles);
        wall("x", 36, -31, 31, backHoles);
        for (const h of frontHoles) if (!h.pass) windowAt("x", 0, (h.a + h.b) / 2);
        for (const h of backHoles) windowAt("x", 36, (h.a + h.b) / 2);
        wall("z", -33, 10, 28, [winHole(14), winHole(24)]);
        windowAt("z", -33, 14);
        windowAt("z", -33, 24);
        wall("z", 33, 12, 28);
        // The stairwell: its outer walls, and on this floor's landing,
        // gates at the top and bottom of the building.
        wall("z", 39, 10, 12);
        if (F === FLOORS - 1) lines.push([SX0 - 0.3, SZ0, SA1, SZ0]);
        if (F === 0) lines.push([SB0, SZ0, SX1 + 0.3, SZ0]);
        // Floor, carpet down the corridors, ceiling.
        box(g, floorMat, -33, -0.2, 0, 33, 0, 36);
        box(g, floorMat, 33, -0.2, 10, 39, 0, 12);
        box(g, ceilMat, -33, H - 0.2, 0, 33, H, 36);
        box(g, ceilMat, 33, H - 0.2, 10, 39, H, 12);
        for (const [x0, z0, x1, z1] of [[-33, 10.2, 39, 11.8], [-33, 26.2, 33, 27.8], [-32.8, 12, -31.2, 26], [31.2, 12, 32.8, 26], [-0.8, 12, 0.8, 26], [-0.8, 0, 0.8, 10]]) {
          const c = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), carpetMat);
          c.rotation.x = -Math.PI / 2;
          c.position.set((x0 + x1) / 2, 0.006, (z0 + z1) / 2);
          g.add(c);
        }
        // Ceiling lights down the corridors, many of them dead.
        const lamp = (x, z) => {
          const on = r() < 0.38 || (F === 0 && z < 10);
          box(g, on ? lampOn : lampOff, x - 0.35, H - 0.26, z - 0.12, x + 0.35, H - 0.2, z + 0.12);
          if (on) working[F].push(new THREE.Vector3(x, F * H + H - 0.35, z));
        };
        for (let x = -32; x <= 38; x += 5) lamp(x, 11);
        for (let x = -32; x <= 32; x += 5) lamp(x, 27);
        for (let z = 15; z <= 24; z += 5) { lamp(-32, z); lamp(32, z); lamp(0, z); }
        lamp(0, 5);
        // Exit signs at the junctions, pointing whichever way.
        for (const [x, z] of [[0, 11], [0, 27], [-32, 11], [32, 11], [-32, 27], [32, 27], [0, 19]]) {
          const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), exitMat);
          s.position.set(x, H - 0.45, z);
          s.rotation.y = Math.floor(r() * 4) * (Math.PI / 2);
          s.material.side = THREE.DoubleSide;
          g.add(s);
        }
        // Inside the open flats: a couch, a mattress, a table, a fallen
        // chair, now and then.
        for (const f of flats) {
          if (!f.open) continue;
          openFlats.push({ F, f });
          const zc = (f.row.z0 + f.row.z1) / 2;
          const xc = (f.x0 + f.x1) / 2;
          const toward = f.row.door > zc ? -1 : 1; // from the door into the flat
          if (r() < 0.75) {
            const cm = couchMats[Math.floor(r() * couchMats.length)];
            const couch = new THREE.Group();
            box(couch, cm, -1.0, 0, -0.45, 1.0, 0.45, 0.45);
            box(couch, cm, -1.0, 0.45, 0.25, 1.0, 0.95, 0.45);
            box(couch, cm, -1.1, 0, -0.45, -0.9, 0.65, 0.45);
            box(couch, cm, 0.9, 0, -0.45, 1.1, 0.65, 0.45);
            const cx = xc + (r() - 0.5) * 2.5;
            const cz = zc + toward * (r() * 1.5);
            couch.position.set(cx, 0, cz);
            couch.rotation.y = (r() < 0.6 ? (toward > 0 ? 0 : Math.PI) : Math.floor(r() * 4) * (Math.PI / 2)) + (r() - 0.5) * 0.5;
            g.add(couch);
            furniture[F].push([cx, cz, 1.0]);
          }
          if (r() < 0.45) {
            const mx = f.x0 + 1 + r() * 4;
            const mz = zc + (r() - 0.5) * 3;
            const m = box(g, mattressMat, mx - 0.95, 0, mz - 0.7, mx + 0.95, 0.22, mz + 0.7);
            m.rotation.y = (r() - 0.5) * 1.2;
          }
          if (r() < 0.5) {
            const tx = xc + (r() - 0.5) * 3;
            const tz = zc - toward * 1.2;
            const t = new THREE.Group();
            box(t, woodMat, -0.6, 0.72, -0.4, 0.6, 0.77, 0.4);
            for (const [x, z] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) box(t, woodMat, x - 0.03, 0, z - 0.03, x + 0.03, 0.72, z + 0.03);
            t.position.set(tx, 0, tz);
            t.rotation.y = r() * 3;
            g.add(t);
            furniture[F].push([tx, tz, 0.7]);
            if (r() < 0.6) {
              // A chair on its side.
              const c = new THREE.Group();
              box(c, woodMat, -0.22, 0, -0.22, 0.22, 0.05, 0.22);
              box(c, woodMat, -0.22, 0, 0.18, 0.22, 0.45, 0.22);
              c.position.set(tx + 0.9, 0.22, tz);
              c.rotation.set(Math.PI / 2, r() * 3, 0);
              g.add(c);
            }
          }
          // Rubbish: a few boxes and slabs fallen from the ceiling.
          for (let k = 0; k < 3; k++) {
            const s = 0.15 + r() * 0.35;
            const bx = f.x0 + 0.5 + r() * 5;
            const bz = f.row.z0 + 0.5 + r() * (f.row.z1 - f.row.z0 - 1);
            const b = box(g, k === 0 ? concrete : woodMat, bx - s, 0, bz - s * 0.7, bx + s, s * 0.5, bz + s * 0.7);
            b.rotation.y = r() * 3;
          }
        }
      }

      // ---------- The stairwell ----------
      // Drawn far past the five floors you can walk, up and down, so the
      // well seems to go on for ever. Floor numbers painted on each
      // landing.
      const stairs = new THREE.Group();
      R.add(stairs);
      const LO = -9;
      const HI = 13;
      const numTex = (n) => canvasTex(64, 64, (g) => {
        g.fillStyle = "rgba(0, 0, 0, 0)";
        g.clearRect(0, 0, 64, 64);
        g.fillStyle = "rgba(200, 196, 170, 0.85)";
        g.font = "700 40px Poppins, system-ui, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(String(n), 32, 34);
      }, { repeat: false });
      for (let b = LO; b <= HI; b++) {
        const y = b * H;
        // Flight A: up from the floor landing toward the half landing.
        for (let k = 0; k < 10; k++) box(stairs, stairStone, SX0, y + k * 0.15 - 0.15, SZ0 + k * 0.8, SA1, y + (k + 1) * 0.15, SZ0 + (k + 1) * 0.8);
        box(stairs, stairStone, SX0, y + 1.3, SZ1, SX1, y + 1.5, SZL);
        // Flight B: from the half landing back up to the next floor.
        for (let k = 0; k < 10; k++) box(stairs, stairStone, SB0, y + 1.5 + k * 0.15 - 0.15, SZ1 - (k + 1) * 0.8, SX1, y + 1.5 + (k + 1) * 0.15, SZ1 - k * 0.8);
        // Railings either side of the well.
        for (const [x, y0, y1] of [[SA1, y, y + 1.5], [SB0, y + 3, y + 1.5]]) {
          const len = Math.hypot(SZ1 - SZ0, y1 - y0);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, len), stairRail);
          rail.position.set(x, (y0 + y1) / 2 + 0.95, (SZ0 + SZ1) / 2);
          rail.rotation.x = -Math.atan2(y1 - y0, SZ1 - SZ0);
          stairs.add(rail);
          for (let k = 0; k <= 10; k += 2) {
            const yy = y0 + ((y1 - y0) * k) / 10;
            box(stairs, stairRail, x - 0.02, yy, SZ0 + 0.8 * k - 0.02, x + 0.02, yy + 0.95, SZ0 + 0.8 * k + 0.02);
          }
        }
        // The landings of the floors you can't reach: a slab and a
        // bricked-up doorway.
        if (b < 0 || b >= FLOORS) {
          box(stairs, stairStone, 33, y - 0.2, 10, 39, y, 12);
          box(stairs, stairStone, 33, y + H - 0.2, 10, 39, y + H, 12);
          box(stairs, stairStone, 32.85, y, 10, 33.0, y + H, 12);
        }
        // The floor number.
        const n = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: numTex(b + 1), transparent: true, depthWrite: false }));
        n.position.set(39 - 0.1, y + 1.7, 11);
        n.rotation.y = -Math.PI / 2;
        n.userData.keep = true;
        stairs.add(n);
        // A bare bulb on some landings.
        if ((b * 7 + 3) % 3 !== 0) {
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), lampOn);
          bulb.position.set(37.5, y + 1.5 + 2.4, 21.2);
          stairs.add(bulb);
        }
      }
      // The shaft's walls, running the full height.
      box(stairs, wallMat, 33 - WT / 2, LO * H, 12, 33 + WT / 2, (HI + 1) * H, SZL);
      box(stairs, wallMat, 39 - WT / 2, LO * H, 10, 39 + WT / 2, (HI + 1) * H, SZL);
      box(stairs, wallMat, 33, LO * H, SZL - WT / 2, 39, (HI + 1) * H, SZL + WT / 2);
      // Gates: chained shut above the top floor and below the ground.
      const gate = (x0, x1, y) => {
        for (let x = x0; x <= x1; x += 0.15) box(stairs, railMat, x - 0.012, y, SZ0 + 0.3, x + 0.012, y + 1.2, SZ0 + 0.33);
        box(stairs, railMat, x0, y + 1.2, SZ0 + 0.28, x1, y + 1.25, SZ0 + 0.35);
      };
      gate(SX0, SA1, (FLOORS - 1) * H + 0.15);
      gate(SB0, SX1, -H + 1.5 + 9 * 0.15);

      // Photos in some of the open flats nearest the way in, hung on the
      // wall facing the door, and one on each walkable landing.
      const stems = ["DSC06067", "4", "Cruise-6", "DSC05995", "DSC04739", "2-alt", "DSC06060", "a2", "5", "DSC05429", "Cruise-12", "DSC04807"];
      openFlats
        .slice()
        .sort((p, q) => p.F - q.F || Math.hypot((p.f.x0 + p.f.x1) / 2, p.f.row.z0) - Math.hypot((q.f.x0 + q.f.x1) / 2, q.f.row.z0))
        .slice(0, stems.length)
        .forEach(({ F, f }, i) => {
          if (!PHOTO[stems[i]]) return;
          const far = f.row.door === f.row.z0 ? f.row.z1 : f.row.z0;
          const into = far > f.row.door ? -1 : 1;
          const piece = R.photo(stems[i], { long: 0.9, frame: 0x2a241e, border: 0.04, depth: 0.03, label: "card", labelSide: 0, labelWidth: 0.34 });
          piece.position.set(f.x0 + 1.4, F * H + 1.55, far + into * (WT / 2 + 0.02));
          piece.rotation.y = into > 0 ? 0 : Math.PI;
          R.add(piece);
        });
      for (let F = 0; F < FLOORS; F++) {
        const st = ["DSC06051", "DSC05238", "Cruise-5", "DSC04824", "1"][F];
        if (!PHOTO[st]) continue;
        const piece = R.photo(st, { long: 0.75, frame: 0x2a241e, border: 0.04, depth: 0.03, label: "card", labelSide: 0, labelWidth: 0.3 });
        piece.position.set(35.6, F * H + 1.5, 10 + WT / 2 + 0.02);
        R.add(piece);
      }

      for (const g of floors) mergeStatic(g);
      mergeStatic(stairs);

      // ---------- Outside ----------
      // The rest of the block, all around: wings and towers of the same
      // building far taller than the part you're in, a few windows lit.
      const facade = canvasTex(128, 256, (g) => {
        const r = rng(2301);
        g.fillStyle = "#14161a";
        g.fillRect(0, 0, 128, 256);
        for (let row = 0; row < 16; row++) {
          for (let col = 0; col < 8; col++) {
            const lit = r() < 0.06;
            g.fillStyle = lit ? (r() < 0.7 ? "#c8b880" : "#8aa0b8") : r() < 0.5 ? "#0a0b0d" : "#1e2024";
            g.fillRect(4 + col * 15.5, 6 + row * 15.5, 9, 10);
          }
        }
      });
      const facadeMat = new THREE.MeshBasicMaterial({ map: facade, color: 0x9a9a9a, fog: false });
      facadeMat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
          #ifdef USE_MAP
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vec3 an = abs(normalize(mat3(modelMatrix) * normal));
            vMapUv = (an.x > an.z ? wp.zy : wp.xy) / vec2(24.0, 48.0);
          #endif`);
      };
      const outside = new THREE.Group();
      R.add(outside);
      const wing = (x0, z0, x1, z1, y0, y1) => box(outside, facadeMat, x0, y0, z0, x1, y1, z1);
      // Across the street, behind the yard, past the west end, and the
      // block's own upper storeys climbing above the part you're in.
      wing(-90, -60, 90, -38, -30, 110);
      wing(-90, 64, 90, 90, -30, 140);
      wing(-120, -38, -70, 64, -30, 95);
      wing(60, -38, 110, -10, -30, 160);
      wing(60, 44, 110, 64, -30, 120);
      wing(-60, 50, -20, 58, -30, 70);
      const sky = skyDome({ top: 0x06070a, mid: 0x0c0e12, low: 0x1a1a1c, sunDir: new THREE.Vector3(0, 1, 0), glow: [0, 0, 0], tight: 8, spread: 3, glowAmt: [0, 0] });
      R.add(sky);

      // ---------- Where you can walk ----------
      const walls = [];
      const blockers = [];
      function rebuild() {
        walls.length = 0;
        blockers.length = 0;
        if (S.mode === "floor") {
          for (const l of floorLines[S.F]) walls.push(l);
          for (const [x, z, r] of furniture[S.F]) blockers.push({ x, z, r });
        } else {
          walls.push([33, SZ0, 33, SZL], [39, 10, 39, SZL], [33, SZL, 39, SZL], [SA1, SZ0, SA1, SZ1], [SB0, SZ0, SB0, SZ1], [33, 10, 39, 10]);
          if (S.base === FLOORS - 1) walls.push([SX0 - 0.3, SZ0, SA1, SZ0]);
        }
        S.changed = false;
      }
      rebuild();
      function floor(x, z) {
        const pend = S.pending;
        if (pend) {
          if (Math.hypot(x - pend.x, z - pend.z) < 0.6) { S.mode = pend.mode; S.F = pend.F; S.changed = true; }
          if (Math.hypot(x - pend.x, z - pend.z) < 0.6 || performance.now() - pend.at > 3000) S.pending = null;
        }
        if (z < 0.3 && S.mode !== "floor") { S.mode = "floor"; S.F = 0; S.changed = true; }
        const before = S.mode + S.F + S.base;
        const inShaft = x > 33 && x < 39 && z > SZ0 + 0.3;
        if (S.mode === "floor") {
          if (inShaft && x < 36 && S.F < FLOORS - 1) { S.mode = "stair"; S.base = S.F; }
          else if (inShaft && x > 36 && S.F > 0) { S.mode = "stair"; S.base = S.F - 1; }
        } else if (z < SZ0 - 0.1) {
          S.mode = "floor";
          S.F = x < 36 ? S.base : S.base + 1;
        }
        if (S.mode + S.F + S.base !== before) S.changed = true;
        if (S.changed) rebuild();
        if (S.mode === "floor") return S.F * H;
        const y0 = S.base * H;
        if (z >= SZ1) return y0 + H / 2;
        if (x < 36) return y0 + THREE.MathUtils.clamp((z - SZ0) / (SZ1 - SZ0), 0, 1) * (H / 2);
        return y0 + H / 2 + THREE.MathUtils.clamp((SZ1 - z) / (SZ1 - SZ0), 0, 1) * (H / 2);
      }

      // ---------- Every frame ----------
      let lastKey = "";
      const api = {
        floor,
        walls,
        blockers,
        people: [],
        noShove: true,
        debug: { state: S },
        update(t) {
          const you = R.player;
          const F = S.mode === "floor" ? S.F : S.base;
          // The nearest working lights on your floor light the corridor
          // round you; one flickers.
          const list = [...(working[F] ?? []), new THREE.Vector3(37.5, F * H + 3.9, 21.2)];
          const near = list.map((p, i) => ({ i, d: Math.hypot(p.x - you.x, p.z - you.z) })).sort((a, b) => a.d - b.d);
          const key = F + ":" + near.slice(0, bulbs.length).map((n) => n.i).join(",");
          if (key !== lastKey) {
            lastKey = key;
            bulbs.forEach((l, k) => { const n = near[k]; if (n) l.position.copy(list[n.i]); l.intensity = n ? 3 : 0; });
          }
          const fl = Math.sin(t * 17) * Math.sin(t * 5.3) > 0.6 && Math.random() < 0.6;
          bulbs[0].intensity = fl ? 0.3 : 3;
          sky.position.copy(R.camLocal);
        },
      };
      return api;
    },
    sound(A) {
      // A low hum from somewhere in the walls, water dripping, wind at a
      // broken window, and now and then a door closing far off.
      const hum = A.gain(0.04);
      A.osc("triangle", 50).connect(A.filter("lowpass", 120)).connect(hum).connect(A.bus);
      const air = A.gain(0.03);
      A.hiss().connect(A.filter("bandpass", 300, 0.6)).connect(air).connect(A.bus);
      const echo = A.ctx.createDelay(1);
      echo.delayTime.value = 0.22;
      const fb = A.gain(0.45);
      const tone = A.filter("lowpass", 1800);
      echo.connect(tone).connect(fb).connect(echo);
      tone.connect(A.bus);
      const drip = A.osc("sine", 1300);
      const dripAmp = A.gain(0);
      drip.connect(dripAmp);
      dripAmp.connect(A.bus);
      dripAmp.connect(echo);
      const slam = A.gain(0);
      A.hiss().connect(A.filter("lowpass", 220, 0.8)).connect(slam);
      slam.connect(echo);
      slam.connect(A.bus);
      let dripAt = A.ctx.currentTime + 1;
      let slamAt = A.ctx.currentTime + 12;
      A.extras.push((until) => {
        dripAt = Math.max(dripAt, A.ctx.currentTime);
        while (dripAt < until) {
          const f = 1000 + A.chance() * 900;
          drip.frequency.setValueAtTime(f, dripAt);
          drip.frequency.exponentialRampToValueAtTime(f * 1.6, dripAt + 0.04);
          dripAmp.gain.setValueAtTime(0.0001, dripAt);
          dripAmp.gain.linearRampToValueAtTime(0.025, dripAt + 0.004);
          dripAmp.gain.exponentialRampToValueAtTime(0.0001, dripAt + 0.06);
          dripAt += 1.5 + A.chance() * 5;
        }
        while (slamAt < until) {
          slam.gain.setValueAtTime(0.0001, slamAt);
          slam.gain.linearRampToValueAtTime(0.12 + A.chance() * 0.1, slamAt + 0.01);
          slam.gain.exponentialRampToValueAtTime(0.0001, slamAt + 0.5);
          slamAt += 20 + A.chance() * 35;
        }
      });
      return {};
    },
  };
