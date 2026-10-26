  // ---------- The Nature Train ----------
  // An old wooden train at golden hour, running through forest and meadow
  // with a river below and mountains on the horizon. You come in through
  // the back of the last coach, so the doorway looks straight down the
  // aisle, coach after coach. Inside it's all wood, cane, brass and plants:
  // benches facing in pairs, ferns in pots, vines trailing off the luggage
  // racks, moss in the corners, windows dropped open.

  // The track works like the Night Train's: the bends are fixed in the
  // track and stream past at the train's speed, each coach straight, the
  // ones ahead swinging round. The coach you step into stays square to the
  // doorway and the rest follow ahead of it.
  const NATURE = (() => {
    const CW = 2.9; // coach width (z from 0 to CW, coach-local)
    const CL = 14; // coach length (x from -CL/2 to CL/2)
    const GAP = 0.8; // gangway between coaches
    const L = CL + GAP;
    const N = 5;
    // The bend between one coach and the next, in radians, as the track
    // passes under you: gentler and slower than the city line.
    const bendAt = (t) => 0.08 * Math.sin(t * 0.2) + 0.025 * Math.sin(t * 0.53 + 2);
    // The speed follows from the tightest curve, as on the Night Train.
    // The bend never exceeds 0.08 + 0.025 = 0.105 rad per 14.8 m, a radius
    // of 14.8 / 0.105 = 141 m. An old branch line isn't banked, so all of
    // v²/r is felt sideways; at the 1.0 m/s² comfort limit for standing
    // passengers, v = √(1.0 × 141) = 11.87 m/s, about 43 km/h (26.6 mph).
    const BEND_MAX = 0.105;
    const A_LAT = 1.0;
    const SPEED = Math.sqrt(A_LAT * (L / BEND_MAX));
    const kappa = (t, s) => bendAt(t + s / SPEED) / L;
    // Which way the train is heading in the world, by time: the integral
    // of speed × curvature, worked out exactly so it never drifts.
    const heading = (t) => (SPEED / L) * (-(0.08 / 0.2) * Math.cos(0.2 * t) - (0.025 / 0.53) * Math.cos(0.53 * t + 2));
    // The track's shape right now, every metre out to EXT either way from
    // the centre of the coach you came in by.
    const EXT = 260;
    const NS = 2 * EXT + 1;
    const TX = new Float64Array(NS), TZ = new Float64Array(NS), TA = new Float64Array(NS);
    function shape(t) {
      for (const dir of [1, -1]) {
        for (let i = EXT; i !== (dir > 0 ? NS - 1 : 0); i += dir) {
          const k = kappa(t, i - EXT + dir / 2);
          const mid = TA[i] + (dir * k) / 2;
          TA[i + dir] = TA[i] + dir * k;
          TX[i + dir] = TX[i] + dir * Math.cos(mid);
          TZ[i + dir] = TZ[i] + dir * Math.sin(mid);
        }
      }
    }
    // A point on the track: `s` metres along from the first coach's centre,
    // `n` metres to the side (+z, to the right going forward).
    const track = (s, n) => {
      const f = Math.min(NS - 1.001, Math.max(0, s + EXT));
      const i = Math.floor(f);
      const u = f - i;
      const x = TX[i] + (TX[i + 1] - TX[i]) * u;
      const z = TZ[i] + (TZ[i + 1] - TZ[i]) * u;
      const a = TA[i] + (TA[i + 1] - TA[i]) * u;
      return { x: x - Math.sin(a) * n, z: CW / 2 + z + Math.cos(a) * n, yaw: -a };
    };
    const frame = (o) => track(o * L, 0);
    const toCar = (o, x, z) => {
      const f = frame(o);
      const c = Math.cos(f.yaw);
      const s = Math.sin(f.yaw);
      const lz = z - CW / 2;
      return { x: f.x + x * c + lz * s, z: f.z - x * s + lz * c };
    };
    const fromCar = (o, X, Z) => {
      const f = frame(o);
      const c = Math.cos(f.yaw);
      const s = Math.sin(f.yaw);
      const dx = X - f.x;
      const dz = Z - f.z;
      return { x: dx * c - dz * s, z: dx * s + dz * c + CW / 2 };
    };
    return { CW, CL, GAP, L, N, SPEED, BEND_MAX, bendAt, heading, shape, track, frame, toCar, fromCar };
  })();

  // Seated, gazing out of the window to one side.
  POSES.push(
    {
      name: "Gazing left", lHip: [-1.5, 0, 0.07], rHip: [-1.5, 0, -0.07], lKnee: [1.5, 0, 0], rKnee: [1.5, 0, 0], seat: 0.46,
      spine: [0.05, 0.15, 0], neck: [0, 0.35, 0], head: [0.05, 0.55, 0],
      lHand: { on: "pelvis", at: [0.12, 0.06, 0.25], pole: [1, -1, 0] },
      rHand: { on: "pelvis", at: [-0.06, 0.07, 0.27], pole: [-1, -1, 0] },
    },
    {
      name: "Gazing right", lHip: [-1.5, 0, 0.07], rHip: [-1.5, 0, -0.07], lKnee: [1.5, 0, 0], rKnee: [1.5, 0, 0], seat: 0.46,
      spine: [0.05, -0.15, 0], neck: [0, -0.35, 0], head: [0.05, -0.55, 0],
      lHand: { on: "pelvis", at: [0.06, 0.07, 0.27], pole: [1, -1, 0] },
      rHand: { on: "pelvis", at: [-0.12, 0.06, 0.25], pole: [-1, -1, 0] },
    },
  );

  ROOMS.nature = {
    name: "The Nature Train",
    short: "Nature Train",
    tagline: "Wooden coaches through the valley at golden hour",
    color: 0x9cc77a,
    leak: 0xffd49a,
    leakStyle: "sun",
    frame: 0x5a3a22,
    fogColor: 0xd8b88a,
    loudness: 0.7,
    ground: "wood",
    entrance: { x: -NATURE.CL / 2, z: NATURE.CW / 2, nx: -1, nz: 0 },
    spawn: { x: -NATURE.CL / 2 + 1.3, z: NATURE.CW / 2, yaw: -Math.PI / 2, pitch: 0.02 },
    spots: {
      bay: { name: "By a Window", x: -1.2, z: 1.45, yaw: -Math.PI / 2 + 0.9, pitch: 0.02 },
      get front() {
        const p = NATURE.toCar(NATURE.N - 1, 4.8, 1.45);
        return { name: "The Front Coach", x: p.x, z: p.z, yaw: NATURE.frame(NATURE.N - 1).yaw - Math.PI / 2, pitch: 0.02 };
      },
    },
    build(R) {
      const { CW, CL, L, N, SPEED, BEND_MAX, bendAt, heading, shape, track, frame, toCar, fromCar } = NATURE;
      shape(performance.now() / 1000);
      const D = Q.density;
      const WALL = 2.3; // where the side walls meet the arched roof
      const TOP = 2.78; // the roof at the middle
      const OFFSETS = Array.from({ length: N }, (_, i) => i);
      const BAY = 1.8; // a pair of benches facing each other, and a window
      const BAYS = 5;
      const B0 = -(BAY * BAYS) / 2; // where the first bay starts
      const SEAT_W = 1.05; // each bench, from the wall to the aisle
      const GROUND = -1.6; // the land beside the line
      R.scene.fog = new THREE.FogExp2(0xd8b88a, 0.00042);

      // Golden-hour light: warm sky, a low sun that swings round as the
      // track turns, and lamps glowing in each coach.
      const hemi = new THREE.HemisphereLight(0xffe4bf, 0x5c4a30, 1.0);
      R.add(hemi);
      const SUN = new THREE.Vector3(0.5, 0.16, 0.85).normalize(); // in the world
      const sun = new THREE.DirectionalLight(0xffc27e, 2.4);
      R.shadows(sun, 42, 150);
      R.add(sun, sun.target);
      const lampLights = [-1, 1].map((k) => {
        const l = new THREE.PointLight(0xffbe70, 1.6, 6, 1.6);
        l.position.set(k * BAY * 1.5, 2.3, CW / 2);
        return l;
      });

      // Polished wood and brass want something warm to reflect.
      {
        const env = new THREE.Scene();
        env.add(new THREE.Mesh(new THREE.BoxGeometry(10, 3, 4), new THREE.MeshBasicMaterial({ color: 0x8a6a48, side: THREE.BackSide })));
        for (const z of [-1, 1]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(9, 0.9, 0.05), new THREE.MeshBasicMaterial({ color: 0xffe0a8 }));
          win.position.set(0, 0.2, z * 1.97);
          env.add(win);
        }
        const pmrem = new THREE.PMREMGenerator(renderer);
        R.scene.environment = pmrem.fromScene(env, 0.02).texture;
        pmrem.dispose();
      }

      // ---------- Materials ----------
      // Wood, drawn plank by plank with its grain, knots and wear.
      const woodTex = (seed, { w = 512, h = 512, boards = 8, base = [120, 78, 44], vertical = false, wear = 0.2, gap = 0.5 } = {}) => canvasTex(w, h, (g) => {
        const r = rng(seed);
        const along = vertical ? h : w;
        const across = vertical ? w : h;
        const bw = across / boards;
        const rect = (a, b, la, lb) => (vertical ? g.fillRect(b, a, lb, la) : g.fillRect(a, b, la, lb));
        for (let i = 0; i < boards; i++) {
          const v = (r() - 0.5) * 26;
          g.fillStyle = `rgb(${base[0] + v}, ${base[1] + v * 0.8}, ${base[2] + v * 0.6})`;
          rect(0, i * bw, along, bw);
          // Grain: long wavering streaks along the board.
          for (let k = 0; k < 26; k++) {
            const y = i * bw + r() * bw;
            const d = (r() - 0.5) * 40;
            g.fillStyle = `rgba(${d < 0 ? "40,24,12" : "210,170,120"}, ${0.05 + r() * 0.12})`;
            const len = along * (0.2 + r() * 0.8);
            const x0 = r() * along;
            for (let x = 0; x < len; x += 6) rect((x0 + x) % along, y + Math.sin((x0 + x) * 0.02 + k) * 1.5, 7, 1 + r());
          }
          // A knot now and then.
          if (r() < 0.5) {
            const kx = r() * along;
            const ky = i * bw + bw * (0.3 + r() * 0.4);
            g.fillStyle = "rgba(50, 28, 14, 0.55)";
            g.beginPath();
            if (vertical) g.ellipse(ky, kx, 2 + r() * 3, 5 + r() * 6, 0, 0, Math.PI * 2);
            else g.ellipse(kx, ky, 5 + r() * 6, 2 + r() * 3, 0, 0, Math.PI * 2);
            g.fill();
          }
          // The gaps between boards, and the board ends.
          g.fillStyle = `rgba(20, 10, 4, ${gap})`;
          rect(0, i * bw, along, 2);
          rect(r() * along, i * bw, 3, bw);
        }
        // Worn, lighter patches and darker grime.
        for (let i = 0; i < 30 * wear; i++) {
          const x = r() * w;
          const y = r() * h;
          const rad = 10 + r() * 50;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          const light = r() < 0.5;
          blob.addColorStop(0, light ? "rgba(230, 200, 150, 0.12)" : "rgba(30, 18, 8, 0.18)");
          blob.addColorStop(1, "rgba(0, 0, 0, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      });
      const floorTex = woodTex(901, { base: [104, 70, 42], boards: 6, wear: 1.2, gap: 0.6 });
      floorTex.repeat.set(CL / 3, CW / 1.5);
      const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 });
      const wainTex = woodTex(902, { base: [96, 56, 30], boards: 10, vertical: true, wear: 0.6 });
      wainTex.repeat.set(2, 1);
      const wainMat = new THREE.MeshStandardMaterial({ map: wainTex, roughness: 0.6, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
      const panelTex = woodTex(903, { base: [150, 102, 58], boards: 3, vertical: true, wear: 0.4, gap: 0.3 });
      const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.55, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
      const roofTex = woodTex(904, { base: [176, 132, 84], boards: 12, wear: 0.5, gap: 0.45 });
      roofTex.repeat.set(CL / 4, 1);
      const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.7, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
      const benchTex = woodTex(905, { w: 256, h: 256, base: [128, 80, 42], boards: 4, wear: 0.8, gap: 0.2 });
      const benchMat = new THREE.MeshStandardMaterial({ map: benchTex, roughness: 0.5, metalness: 0 });
      const darkWood = new THREE.MeshStandardMaterial({ map: benchTex, color: 0x8a6448, roughness: 0.6 });
      const frameWood = new THREE.MeshStandardMaterial({ map: benchTex, color: 0xb08a68, roughness: 0.55 });
      const brass = new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 1, roughness: 0.32 });
      const iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.7, roughness: 0.6 });
      // Woven cane for the seats.
      const caneTex = canvasTex(128, 128, (g) => {
        g.fillStyle = "#c9a56a";
        g.fillRect(0, 0, 128, 128);
        g.strokeStyle = "rgba(90, 60, 25, 0.55)";
        g.lineWidth = 1.2;
        for (let i = -128; i < 256; i += 8) {
          g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke();
          g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 128, 0); g.stroke();
        }
        g.fillStyle = "rgba(60, 40, 15, 0.6)";
        for (let x = 4; x < 128; x += 8) for (let y = 0; y < 128; y += 8) g.fillRect(x - 1, y - 1, 2, 2);
      });
      caneTex.repeat.set(3, 3);
      const caneMat = new THREE.MeshStandardMaterial({ map: caneTex, roughness: 0.8 });
      // A jute runner down the aisle.
      const juteTex = canvasTex(128, 128, (g) => {
        const r = rng(907);
        g.fillStyle = "#8a6a3e";
        g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 1600; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? "60,40,18" : "190,150,90"}, ${0.15 + r() * 0.25})`;
          g.fillRect(r() * 128, r() * 128, 3 + r() * 6, 1);
        }
        g.fillStyle = "#5a3a1a";
        g.fillRect(0, 0, 128, 10);
        g.fillRect(0, 118, 128, 10);
      });
      juteTex.repeat.set(CL / 2, 1);
      const juteMat = new THREE.MeshStandardMaterial({ map: juteTex, roughness: 1 });
      const terracotta = new THREE.MeshStandardMaterial({ color: 0xb0603a, roughness: 0.9 });
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1 });
      // Glass with a film of dust, and the odd leaf print.
      const glassTex = canvasTex(256, 128, (g) => {
        const r = rng(908);
        g.fillStyle = "#e8e0c8";
        g.fillRect(0, 0, 256, 128);
        for (let i = 0; i < 20; i++) {
          const x = r() * 256;
          const y = r() * 128;
          const rad = 10 + r() * 30;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, "rgba(140, 120, 80, 0.5)");
          blob.addColorStop(1, "rgba(140, 120, 80, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }, { repeat: false });
      const glassMat = new THREE.MeshStandardMaterial({ map: glassTex, color: 0xffffff, roughness: 0.15, metalness: 0.1, envMapIntensity: 1.2, transparent: true, opacity: 0.16, depthWrite: false });
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd08a, toneMapped: false });

      // Leaves, drawn with transparent backgrounds: fern fronds, trailing
      // vines, grass tufts, moss.
      const leafColor = (r, k = 0) => `rgb(${50 + r() * 40 + k}, ${100 + r() * 60 + k}, ${30 + r() * 30})`;
      const frondTex = canvasTex(64, 256, (g) => {
        const r = rng(911);
        g.strokeStyle = "#3d5a1e";
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(32, 256); g.quadraticCurveTo(30, 120, 34, 4); g.stroke();
        for (let y = 250; y > 10; y -= 9) {
          const len = 6 + 24 * Math.sin(((256 - y) / 256) * Math.PI) ** 0.7;
          for (const s of [-1, 1]) {
            g.fillStyle = leafColor(r);
            g.beginPath();
            g.ellipse(32 + s * len * 0.55, y - 3, len * 0.55, 3.2, s * -0.35, 0, Math.PI * 2);
            g.fill();
          }
        }
      }, { repeat: false });
      const vineTex = canvasTex(128, 256, (g) => {
        const r = rng(912);
        for (let k = 0; k < 4; k++) {
          let x = 20 + k * 28 + r() * 10;
          const end = 140 + r() * 116;
          g.strokeStyle = "#4a5a22";
          g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(x, 0);
          for (let y = 0; y < end; y += 8) { x += (r() - 0.5) * 6; g.lineTo(x, y); }
          g.stroke();
          let xx = 20 + k * 28;
          for (let y = 6; y < end; y += 11 + r() * 6) {
            xx += (r() - 0.5) * 6;
            g.fillStyle = leafColor(r, 10);
            const s = r() < 0.5 ? -1 : 1;
            g.save();
            g.translate(xx + s * 5, y);
            g.rotate(s * 0.6);
            g.beginPath();
            g.moveTo(0, -6); g.bezierCurveTo(7, -9, 9, 2, 0, 8); g.bezierCurveTo(-9, 2, -7, -9, 0, -6);
            g.fill();
            g.restore();
          }
        }
      }, { repeat: false });
      const tuftTex = canvasTex(128, 128, (g) => {
        const r = rng(913);
        for (let i = 0; i < 60; i++) {
          const x = 10 + r() * 108;
          const h = 40 + r() * 85;
          g.strokeStyle = `rgb(${90 + r() * 60}, ${110 + r() * 60}, ${40 + r() * 30})`;
          g.lineWidth = 1.5 + r() * 1.5;
          g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + (r() - 0.5) * 20, 128 - h / 2, x + (r() - 0.5) * 30, 128 - h); g.stroke();
        }
        for (let i = 0; i < 7; i++) {
          g.fillStyle = ["#f2e6a0", "#e8b0c8", "#f4f0e8", "#c8a0e0", "#f0c060"][Math.floor(r() * 5)];
          g.beginPath(); g.arc(15 + r() * 98, 20 + r() * 60, 3 + r() * 2, 0, Math.PI * 2); g.fill();
        }
      }, { repeat: false });
      const mossTex = canvasTex(128, 128, (g) => {
        const r = rng(914);
        for (let i = 0; i < 90; i++) {
          const x = 20 + r() * 88;
          const y = 20 + r() * 88;
          const rad = 4 + r() * 14;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, `rgba(${70 + r() * 40}, ${110 + r() * 40}, ${30 + r() * 20}, 0.9)`);
          blob.addColorStop(1, "rgba(70, 110, 30, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }, { repeat: false });
      const leafMat = (map) => new THREE.MeshLambertMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide });
      const frondMat = leafMat(frondTex);
      const vineMat = leafMat(vineTex);
      const tuftMat = leafMat(tuftTex);
      const mossMat = new THREE.MeshLambertMaterial({ map: mossTex, transparent: true, depthWrite: false });
      const bigLeafMat = new THREE.MeshLambertMaterial({ color: 0x5a9a3a, side: THREE.DoubleSide });

      // ---------- Pieces ----------
      const box = (parent, w, h, d, material, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        m.position.set(x, y, z);
        m.castShadow = m.receiveShadow = true;
        parent.add(m);
        return m;
      };
      const plane = (parent, w, h, material, x, y, z, ry = 0, rx = 0) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        m.position.set(x, y, z);
        m.rotation.set(rx, ry, 0);
        m.receiveShadow = true;
        parent.add(m);
        return m;
      };
      // The arched roof: boards running the length of the coach.
      const archAt = (z) => {
        const s = TOP - WALL;
        const rad = (CW * CW / 4 + s * s) / (2 * s);
        return WALL + Math.sqrt(rad * rad - (z - CW / 2) ** 2) - (rad - s);
      };
      function archGeo(len, inset = 0) {
        const segs = 12;
        const pos = [];
        const uv = [];
        const idx = [];
        for (let i = 0; i <= segs; i++) {
          const z = (CW * i) / segs;
          const y = archAt(z) - inset;
          pos.push(-len / 2, y, z, len / 2, y, z);
          uv.push(0, i / segs, 1, i / segs);
          if (i < segs) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
      }
      // A bench, its back against x = xb, facing `f` (+1 or -1), from z0 to
      // z1: a slatted seat (or cane) on turned legs, a tall slatted back, an
      // armrest at the aisle end.
      function bench(car, xb, f, z0, z1, cane) {
        const w = z1 - z0;
        const zc = (z0 + z1) / 2;
        const back = xb + f * 0.035;
        if (cane) {
          box(car, 0.46, 0.05, w, darkWood, back + f * 0.25, 0.425, zc);
          plane(car, 0.4, w - 0.06, caneMat, back + f * 0.25, 0.452, zc, 0, -Math.PI / 2);
        } else {
          for (let k = 0; k < 4; k++) box(car, 0.1, 0.035, w, benchMat, back + f * (0.08 + k * 0.115), 0.43, zc);
          box(car, 0.46, 0.04, w, darkWood, back + f * 0.25, 0.39, zc);
        }
        for (let k = 0; k < 5; k++) {
          const slat = box(car, 0.03, 0.11, w - 0.04, benchMat, back + f * 0.02, 0.56 + k * 0.125, zc);
          slat.rotation.z = f * 0.12;
        }
        box(car, 0.05, 0.62, 0.05, darkWood, back + f * 0.0, 0.79, z0 + 0.03);
        box(car, 0.05, 0.62, 0.05, darkWood, back + f * 0.0, 0.79, z1 - 0.03);
        box(car, 0.05, 0.05, w, darkWood, back - f * 0.005, 1.12, zc);
        for (const lz of [z0 + 0.06, z1 - 0.06]) for (const lx of [0.05, 0.42]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.39, 8), darkWood);
          leg.position.set(back + f * lx, 0.195, lz);
          car.add(leg);
        }
        // The armrest on the aisle end, capped in brass.
        const az = Math.abs(z1 - CW / 2) < Math.abs(z0 - CW / 2) ? z1 : z0;
        box(car, 0.44, 0.045, 0.06, frameWood, back + f * 0.24, 0.66, az);
        box(car, 0.05, 0.22, 0.05, darkWood, back + f * 0.43, 0.55, az);
        box(car, 0.06, 0.02, 0.07, brass, back + f * 0.43, 0.69, az);
      }
      // A terracotta pot with soil, at (x, z), `rad` across the rim.
      function pot(parent, x, y, z, rad, h) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.72, h, 12), terracotta);
        p.position.set(x, y + h / 2, z);
        p.castShadow = true;
        parent.add(p);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.08, rad * 1.08, h * 0.15, 12), terracotta);
        rim.position.set(x, y + h * 0.93, z);
        parent.add(rim);
        const soil = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.95, 12), soilMat);
        soil.rotation.x = -Math.PI / 2;
        soil.position.set(x, y + h * 0.9, z);
        parent.add(soil);
      }
      // A fern: fronds arching out of a pot.
      function fern(parent, x, y, z, size, seed) {
        const r = rng(seed);
        const n = 12;
        for (let i = 0; i < n; i++) {
          const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.2 * size, 0.75 * size), frondMat);
          fr.geometry.translate(0, 0.375 * size, 0);
          const a = (i / n) * Math.PI * 2 + r() * 0.4;
          fr.position.set(x, y, z);
          fr.rotation.set(0, a, 0);
          fr.rotateX(0.45 + r() * 0.6);
          parent.add(fr);
        }
      }
      // A broad-leaved plant: big leaves on stems, like a monstera.
      function bigLeaves(parent, x, y, z, size, seed) {
        const r = rng(seed);
        const leaf = new THREE.CircleGeometry(0.2 * size, 9);
        leaf.scale(1, 1.3, 1);
        for (let i = 0; i < 9; i++) {
          const a = r() * Math.PI * 2;
          const up = 0.4 + r() * 0.7;
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, up * size, 4), bigLeafMat);
          stem.position.set(x + Math.sin(a) * 0.1 * size, y + (up * size) / 2, z + Math.cos(a) * 0.1 * size);
          stem.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3);
          parent.add(stem);
          const l = new THREE.Mesh(leaf, bigLeafMat);
          l.position.set(x + Math.sin(a) * 0.3 * size, y + up * size, z + Math.cos(a) * 0.3 * size);
          l.rotation.set(-0.9 - r() * 0.4, a, 0, "YXZ");
          parent.add(l);
        }
      }
      // Vines trailing down from a pot on the rack: crossed strips.
      const vines = [];
      function trailing(parent, x, y, z, len, seed) {
        const g = new THREE.Group();
        g.userData.keep = true;
        g.position.set(x, y, z);
        const r = rng(seed);
        for (let k = 0; k < 3; k++) {
          const v = new THREE.Mesh(new THREE.PlaneGeometry(0.32, len * (0.7 + r() * 0.3)), vineMat);
          v.geometry.translate(0, -v.geometry.parameters.height / 2, 0);
          v.rotation.y = (k / 3) * Math.PI + r() * 0.3;
          g.add(v);
        }
        parent.add(g);
        vines.push({ g, phase: r() * 10, k: 0.7 + r() * 0.6 });
      }
      // Moss, as a soft patch on a surface facing +y.
      const moss = (parent, x, y, z, w, d) => {
        const m = plane(parent, w, d, mossMat, x, y, z, 0, -Math.PI / 2);
        m.renderOrder = 1;
      };

      // ---------- The coaches ----------
      const carGroups = [];
      const wallDefs = [];
      const blockerDefs = [];
      const walls = [];
      const blockers = [];
      const wallIn = (o, x0, z0, x1, z1) => wallDefs.push([o, x0, z0, x1, z1]);
      const photoSlots = [];
      const roofG = archGeo(CL);
      const ribG = archGeo(0.07, 0.03);

      OFFSETS.forEach((o) => {
        const car = new THREE.Group();
        car.userData.o = o;
        R.add(car);
        carGroups.push(car);
        const rr = rng(700 + o * 31);
        plane(car, CL, CW, floorMat, 0, 0, CW / 2, 0, -Math.PI / 2);
        const runner = plane(car, CL - 0.3, 0.62, juteMat, 0, 0.003, CW / 2, 0, -Math.PI / 2);
        runner.renderOrder = 1;
        // The roof, its ribs, and a brass lamp hanging in every bay.
        const roof = new THREE.Mesh(roofG, roofMat);
        roof.receiveShadow = true;
        car.add(roof);
        for (let x = -CL / 2 + 0.6; x < CL / 2; x += BAY / 2) {
          const rib = new THREE.Mesh(ribG, darkWood);
          rib.position.x = x;
          car.add(rib);
        }
        for (let b = 0; b < BAYS; b++) {
          const x = B0 + (b + 0.5) * BAY;
          box(car, 0.012, 0.22, 0.012, brass, x, TOP - 0.13, CW / 2);
          const shade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 12, 1, true), brass);
          shade.position.set(x, TOP - 0.27, CW / 2);
          car.add(shade);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), bulbMat);
          bulb.position.set(x, TOP - 0.31, CW / 2);
          car.add(bulb);
        }
        // Side walls: panelled wainscot below, a window in every bay, the
        // vestibules at each end solid (with a photo).
        for (const side of [0, 1]) {
          const z = side ? CW : 0;
          const ry = side ? Math.PI : 0;
          const inward = side ? -1 : 1;
          const span = (a, b, y0, y1, material) => {
            const m = plane(car, b - a, y1 - y0, material, (a + b) / 2, (y0 + y1) / 2, z, ry);
            m.castShadow = true;
            return m;
          };
          // Vestibule walls.
          for (const [a, b] of [[-CL / 2, B0], [-B0, CL / 2]]) {
            span(a, b, 0, 0.95, wainMat);
            span(a, b, 0.95, WALL, panelMat);
            box(car, b - a, 0.05, 0.05, frameWood, (a + b) / 2, 0.95, z + inward * 0.025);
            photoSlots.push({ o, car, x: (a + b) / 2, z: z + inward * 0.03, ry, inward });
          }
          // Bays: a window over each pair of benches.
          for (let b = 0; b < BAYS; b++) {
            const x0 = B0 + b * BAY;
            const xc = x0 + BAY / 2;
            const WW = 1.12;
            const open = rr() < 0.45;
            span(x0, x0 + BAY, 0, 0.95, wainMat);
            span(x0, xc - WW / 2, 0.95, 1.9, panelMat);
            span(xc + WW / 2, x0 + BAY, 0.95, 1.9, panelMat);
            span(x0, x0 + BAY, 1.9, WALL, panelMat);
            // The window frame, its sill, and the sash: dropped open (only
            // the top pane in place) or shut.
            box(car, WW + 0.1, 0.07, 0.1, frameWood, xc, 0.95, z + inward * 0.04);
            box(car, WW + 0.1, 0.06, 0.06, frameWood, xc, 1.9, z + inward * 0.02);
            for (const s of [-1, 1]) box(car, 0.06, 0.95, 0.06, frameWood, xc + s * (WW / 2 + 0.02), 1.425, z + inward * 0.02);
            const sash = open ? 0.36 : 0.92;
            const g = plane(car, WW, sash, glassMat, xc, 1.9 - sash / 2, z + inward * 0.01, ry);
            g.renderOrder = 2;
            box(car, WW, 0.04, 0.035, frameWood, xc, 1.9 - sash, z + inward * 0.01);
            if (!open) box(car, 0.03, sash, 0.03, frameWood, xc, 1.9 - sash / 2, z + inward * 0.012);
            if (rr() < 0.4) moss(car, xc + (rr() - 0.5) * 0.6, 0.99, z + inward * 0.06, 0.3 + rr() * 0.3, 0.09);
            wallIn(o, x0, z, x0 + BAY, z);
            // The benches, facing each other.
            const za = side ? CW - SEAT_W : 0.02;
            const zb = side ? CW - 0.02 : SEAT_W;
            bench(car, x0 + 0.005, 1, za, zb, rr() < 0.5);
            bench(car, x0 + BAY - 0.005, -1, za, zb, rr() < 0.5);
          }
          wallIn(o, -CL / 2, z, B0, z);
          wallIn(o, -B0, z, CL / 2, z);
          // The aisle edge: you walk the aisle; the bays are for sitting.
          // Set a little into the benches, as you're kept 45 cm from any
          // wall line and the aisle has to fit you.
          const ae = side ? CW - 0.9 : 0.9;
          wallIn(o, B0, ae, -B0, ae);
          // The luggage rack: brass rods on wooden brackets, a pot or two
          // with vines spilling down.
          const rz = side ? CW - 0.2 : 0.2;
          for (const dz of [-0.12, 0.12]) {
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, BAY * BAYS, 6), brass);
            rod.rotation.z = Math.PI / 2;
            rod.position.set(0, 2.02, rz + dz);
            car.add(rod);
          }
          for (let b = 0; b <= BAYS; b++) {
            const bx = B0 + b * BAY;
            // An L-shaped bracket: a post down the wall and an arm out.
            box(car, 0.03, 0.26, 0.03, darkWood, bx, 1.9, side ? CW - 0.03 : 0.03);
            const arm = box(car, 0.03, 0.03, 0.42, darkWood, bx, 2.0, side ? CW - 0.21 : 0.21);
            arm.rotation.x = side ? 0.25 : -0.25;
          }
          for (let b = 0; b < BAYS; b++) {
            if ((b + side + o) % 2) continue;
            const x = B0 + (b + 0.3 + rr() * 0.4) * BAY;
            pot(car, x, 2.03, rz, 0.1, 0.16);
            trailing(car, x, 2.17, side ? rz - 0.06 : rz + 0.06, 0.8 + rr() * 0.6, 760 + o * 13 + b * 2 + side);
          }
        }
        // Plants in the vestibule corners, and moss creeping along the
        // skirting.
        for (const [x, z, kind] of [[-CL / 2 + 0.35, 0.35, 0], [CL / 2 - 0.35, CW - 0.35, 1], [B0 - 0.3, CW - 0.3, (o + 1) % 2], [-B0 + 0.3, 0.3, o % 2]]) {
          pot(car, x, 0, z, 0.18, 0.34);
          if (kind === 0) fern(car, x, 0.34, z, 1.0, 800 + o * 7 + Math.round(x));
          else bigLeaves(car, x, 0.34, z, 1.1, 820 + o * 7 + Math.round(x));
          blockerDefs.push([o, x, z, 0.28]);
        }
        for (let k = 0; k < 4; k++) {
          const side = k % 2;
          moss(car, (rr() - 0.5) * (CL - 1), 0.004, side ? CW - 0.12 : 0.12, 0.6 + rr() * 0.8, 0.2);
        }
        // A wooden grab pole in each vestibule, with a vine winding up it.
        for (const end of [-1, 1]) {
          const px = end * (CL / 2 - 1.25);
          const pz = end < 0 ? CW - 0.75 : 0.75;
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, WALL, 8), darkWood);
          pole.position.set(px, WALL / 2, pz);
          car.add(pole);
          for (let k = 0; k < 2; k++) {
            const v = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.7), vineMat);
            v.position.set(px, 0.35 + 0.85, pz);
            v.rotation.y = k * Math.PI / 2 + 0.4;
            car.add(v);
          }
          blockerDefs.push([o, px, pz, 0.08]);
        }
        // End walls: a doorway through to the next coach, the big doorway
        // you came in by at the back, a closed door at the very front.
        for (const end of [-1, 1]) {
          const ex = (end * CL) / 2;
          const first = o === 0 && end < 0;
          const last = o === N - 1 && end > 0;
          const half = first ? 0.8 : 0.5;
          const h = first ? 2.4 : 2.15;
          const wall = wallFaces(CW, TOP + 0.02, panelMat, { x: 0, half, h }, 0x3a2414);
          wall.position.set(ex, 0, CW / 2);
          wall.rotation.y = end > 0 ? -Math.PI / 2 : Math.PI / 2;
          wall.traverse((m) => { if (m.isMesh) m.castShadow = true; });
          car.add(wall);
          // A carved frame round the opening.
          for (const s of [-1, 1]) box(car, 0.06, h, 0.08, frameWood, ex - end * 0.03, h / 2, CW / 2 + s * (half + 0.03));
          box(car, 0.06, 0.08, half * 2 + 0.12, frameWood, ex - end * 0.03, h + 0.04, CW / 2);
          if (last) {
            // The front door: panelled below, a window above looking out
            // down the line ahead.
            const door = new THREE.Group();
            box(door, 0.05, 1.0, 1.0, darkWood, 0, 0.5, 0);
            box(door, 0.05, 0.22, 1.0, darkWood, 0, 2.01, 0);
            for (const zs of [-1, 1]) box(door, 0.05, 0.9, 0.17, darkWood, 0, 1.45, zs * 0.415);
            const pane = plane(door, 0.66, 0.9, glassMat, 0, 1.45, 0, end > 0 ? -Math.PI / 2 : Math.PI / 2);
            pane.renderOrder = 2;
            box(door, 0.06, 0.04, 0.05, brass, -end * 0.04, 1.0, 0.38);
            door.position.set(ex - end * 0.03, 0, CW / 2);
            car.add(door);
            wallIn(o, ex, 0, ex, CW);
            for (const s of [-1, 1]) photoSlots.push({ o, car, x: ex - end * 0.03, z: CW / 2 + s * 0.98, ry: end > 0 ? -Math.PI / 2 : Math.PI / 2, small: true });
          } else {
            wallIn(o, ex, 0, ex, CW / 2 - half);
            wallIn(o, ex, CW / 2 + half, ex, CW);
          }
        }
      });

      // The gangways: a plank floor and leather bellows between the coaches,
      // stretched and turned to fit as the train bends.
      const gangways = [];
      for (let o = 0; o < N - 1; o++) {
        const g = new THREE.Group();
        g.add(part(new THREE.BoxGeometry(1, 0.03, 1.0), 0x5a3a20, 0, 0.012, 0));
        for (const s of [-1, 1]) g.add(part(new THREE.BoxGeometry(1, 2.2, 0.05), 0x3a2414, 0, 1.1, s * 0.52));
        g.add(part(new THREE.BoxGeometry(1, 0.05, 1.04), 0x3a2414, 0, 2.18, 0));
        R.add(g);
        gangways.push({ g, o });
      }


      for (const car of carGroups) mergeStatic(car);
      carGroups[0].add(...lampLights);

      // ---------- The riders ----------
      const rand = rng(91);
      const people = [];
      const riderAt = [];
      // Sitting on the bench whose back is at the start (f = 1) or end
      // (f = -1) of bay `b`, by the window or the aisle.
      const sit = (look, o, b, f, side, byWindow, poseName) => {
        const xb = B0 + b * BAY + (f > 0 ? 0 : BAY);
        const x = xb + f * 0.33;
        const z = side ? (byWindow ? CW - 0.3 : CW - 0.78) : (byWindow ? 0.3 : 0.78);
        const entry = placePerson(R, look, toCar(o, x, z), poseName, toCar(o, x + f * 3, z), { phase: rand() * 10, glance: 0.03 });
        entry.focus = null;
        people.push(entry);
        riderAt.push([o, x, z]);
        return entry;
      };
      // Facing forward (f = 1), the window on your left is side 0.
      sit(randomLook(rand), 0, 1, 1, 0, true, "Gazing left");
      sit({ height: 0.97, build: 1.0, skin: 2, hair: ["long", 0x6a4a2a], top: 0x5a7a4a, sleeves: "long", legs: 0x3a3a46, shoes: 0x2a1c14, skirt: true }, 0, 1, -1, 1, true, "Reading");
      sit(randomLook(rand), 0, 3, -1, 0, true, "Asleep");
      sit(randomLook(rand), 0, 3, 1, 1, false, "Reading");
      sit(randomLook(rand), 1, 0, 1, 1, true, "Gazing right");
      sit(randomLook(rand), 1, 2, -1, 0, true, "Gazing right");
      sit(randomLook(rand), 1, 4, 1, 0, false, "Asleep");
      sit(randomLook(rand), 2, 1, 1, 1, true, "Gazing right");
      sit(randomLook(rand), 2, 3, -1, 1, false, "Reading");
      sit(randomLook(rand), 3, 2, 1, 0, true, "Gazing left");
      sit(randomLook(rand), 4, 0, -1, 1, true, "Asleep");
      R.root.updateMatrixWorld(true);
      people.forEach((p, i) => carGroups[riderAt[i][0]].attach(p.fig.root));

      // A dog lying in the foot space of the first bay, by its owner.
      const dog = (() => {
        const g = new THREE.Group();
        const fur = 0x9a6a3a;
        g.add(part(new THREE.BoxGeometry(0.55, 0.2, 0.24), fur, 0, 0.12, 0));
        g.add(part(new THREE.BoxGeometry(0.2, 0.18, 0.18), fur, 0.35, 0.16, 0));
        g.add(part(new THREE.BoxGeometry(0.12, 0.09, 0.11), 0x7a5028, 0.49, 0.13, 0));
        g.add(part(new THREE.BoxGeometry(0.03, 0.03, 0.03), 0x111111, 0.555, 0.15, 0));
        for (const s of [-1, 1]) {
          g.add(part(new THREE.BoxGeometry(0.06, 0.1, 0.03), 0x6a4420, 0.33, 0.25, s * 0.07));
          g.add(part(new THREE.BoxGeometry(0.22, 0.06, 0.06), fur, 0.26, 0.03, s * 0.08));
          g.add(part(new THREE.BoxGeometry(0.2, 0.06, 0.07), fur, -0.2, 0.04, s * 0.1));
        }
        const tail = part(new THREE.BoxGeometry(0.22, 0.04, 0.04), fur, -0.36, 0.12, 0);
        tail.geometry.translate(-0.11, 0, 0);
        tail.position.x = -0.27;
        tail.userData.keep = true;
        g.add(tail);
        g.position.set(B0 + BAY + 0.9, 0, 0.55);
        g.rotation.y = Math.PI * 0.15;
        carGroups[0].add(g);
        return { g, tail };
      })();

      // ---------- Outside ----------
      // Close by, everything is placed along the track itself, so it stays
      // lined up through the bends: the ballast, sleepers and rails,
      // telegraph poles and their wires, trees, grass and flowers. Further
      // out, the land is laid out in the world and the train's own heading
      // and position carry you through it: forest, a river, hills,
      // mountains, the sky and the sun all swing round as the track turns.
      const near = new THREE.Group();
      R.add(near);
      const strips = [];
      const strip = (s0, s1, segs, material, edge, u = 20) => {
        const pos = new Float32Array((segs + 1) * 6);
        const uv = [];
        const idx = [];
        for (let i = 0; i <= segs; i++) {
          const uu = (s0 + ((s1 - s0) * i) / segs) / u;
          uv.push(uu, 0, uu, 1);
          if (i < segs) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        // Lit as if facing straight up; near enough for ground and rails.
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array((segs + 1) * 6).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
        geo.setIndex(idx);
        const mesh = new THREE.Mesh(geo, material);
        mesh.frustumCulled = false;
        mesh.receiveShadow = true;
        strips.push({ mesh, s0, s1, segs, edge });
        near.add(mesh);
        return mesh;
      };
      const layStrip = (st) => {
        const pos = st.mesh.geometry.attributes.position;
        for (let i = 0; i <= st.segs; i++) {
          const s = st.s0 + ((st.s1 - st.s0) * i) / st.segs;
          const [a, b] = st.edge(s);
          pos.setXYZ(i * 2, a.x, a.y, a.z);
          pos.setXYZ(i * 2 + 1, b.x, b.y, b.z);
        }
        pos.needsUpdate = true;
        st.mesh.geometry.computeBoundingSphere();
      };
      const at = (s, n, y) => { const p = track(s, n); return new THREE.Vector3(p.x, y, p.z); };
      const SPAN = 240;
      const SEGS = D < 0.5 ? 90 : 180;
      const ballastTex = canvasTex(256, 256, (g) => {
        const r = rng(921);
        g.fillStyle = "#6a6258";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2500; i++) {
          const v = 60 + r() * 90;
          g.fillStyle = `rgb(${v + 10}, ${v + 4}, ${v - 6})`;
          g.fillRect(r() * 256, r() * 256, 2 + r() * 4, 2 + r() * 3);
        }
      });
      ballastTex.repeat.set(1, 1);
      // Sleepers: one every 0.65 m, so 31 to a 20 m copy.
      const sleeperTex = canvasTex(1024, 64, (g) => {
        const r = rng(922);
        for (let i = 0; i < 31; i++) {
          const v = r() * 20;
          g.fillStyle = `rgb(${70 + v}, ${52 + v}, ${36 + v})`;
          g.fillRect(i * (1024 / 31), 0, 14, 64);
          g.fillStyle = "rgba(30, 20, 10, 0.4)";
          g.fillRect(i * (1024 / 31) + 3, r() * 50, 8, 2);
        }
      });
      const bankTex = canvasTex(256, 64, (g) => {
        const r = rng(923);
        const grad = g.createLinearGradient(0, 0, 0, 64);
        grad.addColorStop(0, "#6c6040");
        grad.addColorStop(1, "#5a7a30");
        g.fillStyle = grad;
        g.fillRect(0, 0, 256, 64);
        for (let i = 0; i < 600; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? "40,70,20" : "140,130,70"}, 0.4)`;
          g.fillRect(r() * 256, r() * 64, 1 + r() * 2, 2 + r() * 4);
        }
      });
      const ballastMat = new THREE.MeshLambertMaterial({ map: ballastTex });
      const sleeperMat = new THREE.MeshLambertMaterial({ map: sleeperTex, transparent: true, alphaTest: 0.3 });
      const railMat = new THREE.MeshStandardMaterial({ color: 0x8a8580, metalness: 0.9, roughness: 0.35 });
      const bankMat = new THREE.MeshLambertMaterial({ map: bankTex });
      const RAIL_Y = -0.86;
      strip(-SPAN, SPAN, SEGS, ballastMat, (s) => [at(s, -2.1, -1.0), at(s, 2.1, -1.0)], 6);
      strip(-SPAN, SPAN, SEGS, sleeperMat, (s) => [at(s, -1.3, -0.95), at(s, 1.3, -0.95)]);
      for (const n of [-0.72, 0.72]) strip(-SPAN, SPAN, SEGS, railMat, (s) => [at(s, n - 0.035, RAIL_Y), at(s, n + 0.035, RAIL_Y)]);
      for (const side of [-1, 1]) strip(-SPAN, SPAN, SEGS, bankMat, (s) => [at(s, side * 2.1, -1.0), at(s, side * 5.5, GROUND + 0.02)], 10);

      // Things beside the line, each `s` metres along and `n` to the side,
      // streaming back at the train's speed and coming round again ahead.
      const S_MIN = -180;
      const WRAP = 460;
      let travelled = 0;
      // Where the forest is thick and where it opens into meadow, by how
      // far along the line you are.
      const forestAt = (u) => {
        const v = Math.sin(u / 170) + 0.6 * Math.sin(u / 61 + 1.3) + 0.3 * Math.sin(u / 23 + 0.4);
        return THREE.MathUtils.smoothstep(v, -0.5, 0.9);
      };
      const pick = rng(931);
      // Trees: conifers, broadleaves and birches, built from instanced
      // trunks, cones and blobs.
      const NT = Math.round((D < 0.5 ? 110 : 220));
      const trunkGeo = new THREE.CylinderGeometry(0.7, 1, 1, 6);
      trunkGeo.translate(0, 0.5, 0);
      const coneGeo = new THREE.ConeGeometry(1, 1, 7);
      coneGeo.translate(0, 0.5, 0);
      const blobGeo = new THREE.IcosahedronGeometry(1, 0);
      const treeMat = new THREE.MeshLambertMaterial({ flatShading: true });
      const trunks = new THREE.InstancedMesh(trunkGeo, treeMat, NT);
      const cones = new THREE.InstancedMesh(coneGeo, treeMat, NT * 3);
      const blobs = new THREE.InstancedMesh(blobGeo, treeMat, NT * 3);
      for (const m of [trunks, cones, blobs]) {
        m.frustumCulled = false;
        m.castShadow = false;
        near.add(m);
      }
      const col = new THREE.Color();
      const trees = [];
      function seedTree(tr, s) {
        tr.s = s;
        const u = travelled + s;
        const side = pick() < 0.5 ? -1 : 1;
        tr.n = side * (7 + Math.pow(pick(), 1.4) * 85);
        tr.on = pick() < 0.12 + 0.88 * forestAt(u + tr.n * 0.37) || Math.abs(tr.n) > 60 && pick() < 0.15;
        tr.kind = pick() < 0.45 ? 0 : pick() < 0.7 ? 1 : 2;
        tr.h = 7 + pick() * 13;
        tr.rot = pick() * 6;
        tr.tint = pick();
      }
      for (let i = 0; i < NT; i++) {
        const tr = {};
        seedTree(tr, S_MIN + (i / NT) * WRAP);
        trees.push(tr);
        const g = tr.kind === 0 ? col.setHSL(0.3 + tr.tint * 0.06, 0.45, 0.2 + tr.tint * 0.08) : tr.kind === 1 ? col.setHSL(0.22 + tr.tint * 0.08, 0.5, 0.3 + tr.tint * 0.1) : col.setHSL(0.18 + tr.tint * 0.06, 0.55, 0.42);
        for (let k = 0; k < 3; k++) (tr.kind === 0 ? cones : blobs).setColorAt(i * 3 + k, g);
        trunks.setColorAt(i, tr.kind === 2 ? col.setHex(0xe8e2d4) : col.setHex(0x5a3e28));
      }
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      const m4 = new THREE.Matrix4();
      const place = (mesh, i, p, yaw, ox, oy, oz, sx, sy, sz) => {
        const c = Math.cos(yaw);
        const s = Math.sin(yaw);
        m4.makeRotationY(yaw).scale(new THREE.Vector3(sx, sy, sz));
        m4.setPosition(p.x + ox * c + oz * s, GROUND + oy, p.z - ox * s + oz * c);
        mesh.setMatrixAt(i, m4);
      };
      function drawTrees() {
        for (let i = 0; i < NT; i++) {
          const tr = trees[i];
          if (!tr.on) {
            trunks.setMatrixAt(i, zero);
            for (let k = 0; k < 3; k++) { cones.setMatrixAt(i * 3 + k, zero); blobs.setMatrixAt(i * 3 + k, zero); }
            continue;
          }
          const p = track(tr.s, tr.n);
          const H = tr.h;
          const y = p.yaw + tr.rot;
          if (tr.kind === 0) {
            place(trunks, i, p, y, 0, 0, 0, 0.18 + H * 0.012, H * 0.3, 0.18 + H * 0.012);
            const L3 = [[0.18, 0.3, 0.5], [0.42, 0.23, 0.42], [0.64, 0.15, 0.36]];
            L3.forEach(([y0, r, h], k) => place(cones, i * 3 + k, p, y, 0, H * y0, 0, H * r, H * h, H * r));
            for (let k = 0; k < 3; k++) blobs.setMatrixAt(i * 3 + k, zero);
          } else {
            const birch = tr.kind === 2;
            const tw = birch ? 0.1 + H * 0.006 : 0.2 + H * 0.014;
            place(trunks, i, p, y, 0, 0, 0, tw, H * (birch ? 0.78 : 0.55), tw);
            const B3 = birch ? [[0, 0.7, 0, 0.16], [0.08, 0.55, 0.05, 0.13], [-0.06, 0.82, -0.04, 0.11]] : [[0, 0.68, 0, 0.3], [0.17, 0.56, 0.1, 0.22], [-0.16, 0.6, -0.1, 0.22]];
            B3.forEach(([ox, oy, oz, r], k) => place(blobs, i * 3 + k, p, y, H * ox, H * oy, H * oz, H * r, H * r * 0.85, H * r));
            for (let k = 0; k < 3; k++) cones.setMatrixAt(i * 3 + k, zero);
          }
        }
        trunks.instanceMatrix.needsUpdate = cones.instanceMatrix.needsUpdate = blobs.instanceMatrix.needsUpdate = true;
      }
      // Grass tufts, flowers and ferns along the bank and into the meadow.
      const NU = D < 0.5 ? 180 : 380;
      const tuftGeo = (() => {
        const a = new THREE.PlaneGeometry(1, 1);
        a.translate(0, 0.5, 0);
        const b = a.clone().rotateY(Math.PI / 2);
        return mergeGeometries([a, b]);
      })();
      const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, NU);
      tufts.frustumCulled = false;
      near.add(tufts);
      const growth = [];
      for (let i = 0; i < NU; i++) {
        const side = pick() < 0.5 ? -1 : 1;
        const n = side * (2.6 + Math.pow(pick(), 1.6) * 30);
        growth.push({ s: S_MIN + pick() * WRAP, n, sz: 0.5 + pick() * 0.9, rot: pick() * 6, bank: Math.abs(n) < 5.5 });
        tufts.setColorAt(i, col.setHSL(0.2 + pick() * 0.08, 0.4, 0.55 + pick() * 0.2));
      }
      function drawGrowth() {
        for (let i = 0; i < NU; i++) {
          const g = growth[i];
          const p = track(g.s, g.n);
          // On the bank, it sits on the slope down from the ballast.
          const y = g.bank ? -1.0 + (GROUND + 0.02 + 1.0) * ((Math.abs(g.n) - 2.1) / 3.4) : 0;
          m4.makeRotationY(p.yaw + g.rot).scale(new THREE.Vector3(g.sz * 1.3, g.sz, g.sz * 1.3));
          m4.setPosition(p.x, g.bank ? y : GROUND, p.z);
          tufts.setMatrixAt(i, m4);
        }
        tufts.instanceMatrix.needsUpdate = true;
      }
      // Telegraph poles along the line, every 40 m, with three wires that
      // sag between them.
      const poleN = -4.3;
      const NP = Math.round(WRAP / 40);
      const poles = Array.from({ length: NP }, (_, i) => ({ s: S_MIN + i * 40 }));
      const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.13, 1, 7).translate(0, 0.5, 0), darkWood, NP);
      const armMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), darkWood, NP);
      for (const m of [poleMesh, armMesh]) { m.frustumCulled = false; near.add(m); }
      const POLE_H = 8.2;
      const WIRES = [-0.65, 0, 0.65];
      const SAGSEG = 8;
      const wireGeo = new THREE.BufferGeometry();
      const wirePos = new Float32Array(NP * WIRES.length * SAGSEG * 6);
      wireGeo.setAttribute("position", new THREE.BufferAttribute(wirePos, 3));
      const wires = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x2a2620 }));
      wires.frustumCulled = false;
      near.add(wires);
      function drawPoles() {
        poles.sort((a, b) => a.s - b.s);
        poles.forEach((pl, i) => {
          const p = track(pl.s, poleN);
          m4.makeRotationY(p.yaw).scale(new THREE.Vector3(1, POLE_H, 1)).setPosition(p.x, GROUND, p.z);
          poleMesh.setMatrixAt(i, m4);
          m4.makeRotationY(p.yaw).scale(new THREE.Vector3(0.1, 0.1, 1.6)).setPosition(p.x, GROUND + POLE_H - 0.4, p.z);
          armMesh.setMatrixAt(i, m4);
        });
        poleMesh.instanceMatrix.needsUpdate = armMesh.instanceMatrix.needsUpdate = true;
        let k = 0;
        for (let i = 0; i < NP - 1; i++) {
          const a = poles[i].s;
          const b = poles[i + 1].s;
          for (const w of WIRES) {
            for (let j = 0; j < SAGSEG; j++) {
              for (const jj of [j, j + 1]) {
                const f = jj / SAGSEG;
                const p = track(a + (b - a) * f, poleN + w);
                wirePos[k++] = p.x;
                wirePos[k++] = GROUND + POLE_H - 0.35 - 0.7 * 4 * f * (1 - f);
                wirePos[k++] = p.z;
              }
            }
          }
        }
        wireGeo.attributes.position.needsUpdate = true;
      }
      // Deer grazing in the meadows, now and then.
      const deerMat = 0x8a5a32;
      const deer = Array.from({ length: 3 }, (_, i) => {
        const g = new THREE.Group();
        g.add(part(new THREE.BoxGeometry(1.1, 0.45, 0.38), deerMat, 0, 0.95, 0));
        const neck = new THREE.Group();
        neck.position.set(0.5, 1.1, 0);
        neck.add(part(new THREE.BoxGeometry(0.16, 0.55, 0.16), deerMat, 0.1, 0.22, 0));
        neck.add(part(new THREE.BoxGeometry(0.34, 0.17, 0.16), deerMat, 0.28, 0.5, 0));
        for (const s of [-1, 1]) neck.add(part(new THREE.BoxGeometry(0.05, 0.14, 0.08), 0x6a4022, 0.16, 0.62, s * 0.08));
        g.add(neck);
        for (const [x, z] of [[0.42, 0.13], [0.42, -0.13], [-0.42, 0.13], [-0.42, -0.13]]) g.add(part(new THREE.BoxGeometry(0.08, 0.75, 0.08), 0x6a4022, x, 0.37, z));
        g.add(part(new THREE.BoxGeometry(0.12, 0.14, 0.12), 0xf0e8d8, -0.58, 1.05, 0));
        g.scale.setScalar(1.15);
        near.add(g);
        return { g, neck, s: 0, n: 0, phase: i * 2.3, yaw: 0 };
      });
      function seedDeer(d, s) {
        // Somewhere along the next stretch where the trees open out.
        let best = s;
        for (let k = 0; k < 12; k++) {
          const c = s + k * 25;
          if (forestAt(travelled + c) < forestAt(travelled + best)) best = c;
        }
        d.s = best;
        d.n = (pick() < 0.5 ? -1 : 1) * (28 + pick() * 30);
        d.yaw = pick() * 6;
      }
      deer.forEach((d, i) => { seedDeer(d, 40 + i * 6); d.n = (i % 2 ? 1 : -1) * (30 + i * 6); });

      // The land further out, laid out in the world. `world` turns with the
      // train's heading about the coach you came in by, `land` carries the
      // world past; each layer repeats every P metres along the way.
      const world = new THREE.Group();
      world.position.set(0, 0, CW / 2);
      R.add(world);
      const land = new THREE.Group();
      world.add(land);
      const layers = [];
      let wx = 0;
      let wz = 0;
      const groundTex = canvasTex(512, 512, (g) => {
        const r = rng(941);
        g.fillStyle = "#6f8a3a";
        g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 120; i++) {
          const x = r() * 512;
          const y = r() * 512;
          const rad = 20 + r() * 80;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          const k = r();
          blob.addColorStop(0, k < 0.4 ? "rgba(150, 150, 70, 0.35)" : k < 0.8 ? "rgba(60, 90, 30, 0.35)" : "rgba(170, 120, 60, 0.25)");
          blob.addColorStop(1, "rgba(0, 0, 0, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        for (let i = 0; i < 5000; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? "40,70,20" : "170,170,90"}, 0.35)`;
          g.fillRect(r() * 512, r() * 512, 1, 2 + r() * 3);
        }
      });
      const GT = 40; // metres per copy of the ground texture
      groundTex.repeat.set(6000 / GT, 6000 / GT);
      const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ map: groundTex }));
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.y = GROUND - 0.02;
      groundMesh.receiveShadow = true;
      world.add(groundMesh);
      function worldLayer(P, fill) {
        const g = new THREE.Group();
        land.add(g);
        fill(g, P);
        layers.push({ g, P });
        return g;
      }
      // Instanced pieces, repeated three times over so a layer always
      // covers the view.
      function scatter(g, P, geo, material, list) {
        const mesh = new THREE.InstancedMesh(geo, material, list.length * 3);
        let i = 0;
        for (const [x, y, z, sx, sy, sz, color, ry = 0] of list) {
          for (const copy of [-1, 0, 1]) {
            m4.makeRotationY(ry).scale(new THREE.Vector3(sx, sy, sz)).setPosition(x + copy * P, y, z);
            mesh.setMatrixAt(i, m4);
            if (color !== undefined) mesh.setColorAt(i, col.set(color));
            i++;
          }
        }
        mesh.frustumCulled = false;
        g.add(mesh);
        return mesh;
      }
      const RIVER_Z = 230;
      const RIVER_P = 1200;
      const riverZ = (x) => RIVER_Z + 28 * Math.sin((x / RIVER_P) * Math.PI * 2);
      // The forest band beyond the meadows, thinning toward the river.
      worldLayer(RIVER_P, (g, P) => {
        const r = rng(951);
        const cs = [];
        const bs = [];
        const step = D < 0.5 ? 6 : 3;
        for (let x = 0; x < P; x += step * (0.5 + r())) {
          for (const side of [-1, 1]) {
            const z = side * (105 + Math.pow(r(), 0.9) * 380);
            if (Math.abs(z - riverZ(x)) < 40) continue;
            const h = 9 + r() * 16;
            const t = r();
            if (r() < 0.55) cs.push([x, GROUND, z, h * 0.32, h, h * 0.32, new THREE.Color().setHSL(0.3 + t * 0.06, 0.4, 0.17 + t * 0.07).getHex()]);
            else bs.push([x, GROUND + h * 0.45, z, h * 0.38, h * 0.42, h * 0.38, new THREE.Color().setHSL(0.2 + t * 0.09, 0.45, 0.25 + t * 0.1).getHex(), r() * 6]);
          }
        }
        scatter(g, P, coneGeo, new THREE.MeshLambertMaterial({ flatShading: true }), cs);
        scatter(g, P, blobGeo, new THREE.MeshLambertMaterial({ flatShading: true }), bs);
        // The river: a winding ribbon catching the low sun.
        const riverTex = canvasTex(256, 64, (gg) => {
          const rr2 = rng(952);
          gg.fillStyle = "#7f9fb0";
          gg.fillRect(0, 0, 256, 64);
          for (let i = 0; i < 160; i++) {
            gg.fillStyle = `rgba(255, ${210 + rr2() * 40}, ${150 + rr2() * 60}, ${0.3 + rr2() * 0.5})`;
            gg.fillRect(rr2() * 256, rr2() * 64, 6 + rr2() * 20, 1);
          }
        });
        riverTex.repeat.set(P / 40, 1);
        const segs = 240;
        const geo = new THREE.PlaneGeometry(P * 3, 34, segs * 3, 1);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + riverZ(pos.getX(i)));
        const river = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: riverTex, color: 0xd8d0c0 }));
        river.position.set(P / 2, GROUND + 0.05, 0);
        river.frustumCulled = false;
        g.add(river);
        g.userData.river = riverTex;
        // Its banks: reeds and a line of willows.
        const ws = [];
        for (let x = 0; x < P; x += 14 + r() * 20) for (const s of [-1, 1]) ws.push([x, GROUND + 4, riverZ(x) + s * (22 + r() * 8), 5, 4.5, 5, new THREE.Color().setHSL(0.2, 0.4, 0.32 + r() * 0.08).getHex(), r() * 6]);
        scatter(g, P, blobGeo, new THREE.MeshLambertMaterial({ flatShading: true }), ws);
      });
      // Rolling hills.
      worldLayer(4000, (g, P) => {
        const r = rng(961);
        const hs = [];
        for (let x = 0; x < P; x += 90 + r() * 120) {
          for (const side of [-1, 1]) {
            const t = r();
            hs.push([x, GROUND - 10, side * (520 + r() * 700), 180 + r() * 260, 70 + r() * 150, 160 + r() * 200, new THREE.Color().setHSL(0.25 + t * 0.07, 0.35, 0.22 + t * 0.1).getHex(), r() * 6]);
          }
        }
        scatter(g, P, new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ flatShading: true }), hs);
      });
      // Mountains on the horizon, the highest with snow.
      worldLayer(8000, (g, P) => {
        const r = rng(971);
        const geo = new THREE.ConeGeometry(1, 1, 7, 3);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0.49) continue;
          pos.setX(i, pos.getX(i) * (0.85 + r() * 0.3));
          pos.setZ(i, pos.getZ(i) * (0.85 + r() * 0.3));
          pos.setY(i, y + (r() - 0.5) * 0.08);
        }
        geo.translate(0, 0.5, 0);
        geo.computeVertexNormals();
        const cap = new THREE.ConeGeometry(0.3, 0.3, 7);
        cap.translate(0, 0.85, 0);
        const ms = [];
        const caps = [];
        for (let x = 0; x < P; x += 260 + r() * 420) {
          for (const side of [-1, 1]) {
            if (side < 0 && r() < 0.4) continue;
            const h = 380 + r() * 620;
            const w = h * (0.9 + r() * 0.6);
            const z = side * (1500 + r() * 900);
            const ry = r() * 6;
            ms.push([x, GROUND - 20, z, w, h, w * (0.8 + r() * 0.4), 0x55607a, ry]);
            if (h > 650) caps.push([x, GROUND - 20, z, w, h, w, 0xf2ece4, ry]);
          }
        }
        scatter(g, P, geo, new THREE.MeshLambertMaterial({ flatShading: true }), ms);
        scatter(g, P, cap, new THREE.MeshLambertMaterial({ flatShading: true }), caps);
      });

      // The sky: a golden-hour dome, the sun low on the right, long bands
      // of cloud lit from below. It turns with the train too.
      const sky = new THREE.Group();
      sky.add(skyDome({ top: 0x4e7cb0, mid: 0xa9b6bc, low: 0xf2c48a, sunDir: SUN, glow: [1.0, 0.72, 0.42], tight: 40, spread: 5, glowAmt: [0.9, 0.25] }));
      {
        const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff0c0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
        sunSprite.position.copy(SUN).multiplyScalar(1300);
        sunSprite.scale.setScalar(160);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.6 }));
        halo.position.copy(SUN).multiplyScalar(1320);
        halo.scale.setScalar(700);
        sunSprite.renderOrder = halo.renderOrder = -1;
        sky.add(halo, sunSprite);
        const cloudTex = canvasTex(256, 96, (g) => {
          const r = rng(981);
          for (let i = 0; i < 26; i++) {
            const x = 20 + r() * 216;
            const y = 40 + r() * 30;
            const rad = 14 + r() * 34;
            const blob = g.createRadialGradient(x, y, 0, x, y, rad);
            blob.addColorStop(0, "rgba(255, 255, 255, 0.5)");
            blob.addColorStop(1, "rgba(255, 255, 255, 0)");
            g.fillStyle = blob;
            g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
          }
        }, { repeat: false });
        const r = rng(982);
        for (let i = 0; i < 14; i++) {
          const a = r() * Math.PI * 2;
          const el = THREE.MathUtils.degToRad(5 + r() * 18);
          const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: new THREE.Color(0xffd6a8).lerp(new THREE.Color(0xe0a0a0), r() * 0.5), depthWrite: false, fog: false, transparent: true, opacity: 0.7 }));
          c.position.set(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el)).multiplyScalar(1250);
          c.scale.set(420 + r() * 380, 90 + r() * 60, 1);
          c.renderOrder = -1;
          sky.add(c);
        }
      }
      R.add(sky);
      // Birds, wheeling far off over the fields; each circles a point in
      // the world, and once that's well behind, a new one turns up ahead.
      const birds = Array.from({ length: 7 }, (_, i) => {
        const g = new THREE.Group();
        const wing = new THREE.BufferGeometry();
        wing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, -0.4, 0, 1, 0.4, 0, 0.1], 3));
        for (const s of [-1, 1]) {
          const w = new THREE.Mesh(wing, new THREE.MeshBasicMaterial({ color: 0x2a2420, side: THREE.DoubleSide }));
          w.scale.z = s;
          g.add(w);
        }
        g.scale.setScalar(2.2);
        land.add(g);
        return { g, phase: i * 1.7, r: 25 + i * 6, y: 35 + i * 5, cx: 150 + i * 160, cz: (i % 2 ? 1 : -1) * (90 + i * 25) };
      });
      // Specks of dust turning in the sunlight inside the first coach.
      const motes = (() => {
        const n = 120;
        const pos = new Float32Array(n * 3);
        const r = rng(991);
        for (let i = 0; i < n; i++) pos.set([(r() - 0.5) * CL, 0.4 + r() * 1.9, 0.2 + r() * (CW - 0.4)], i * 3);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xffe0a0, size: 0.03, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
        p.userData.keep = true;
        carGroups[0].add(p);
        return { p, pos, base: pos.slice() };
      })();

      // Put every coach, gangway, wall and blocker where the track says.
      function layout() {
        carGroups.forEach((car) => {
          const o = car.userData.o;
          const c = toCar(o, 0, 0);
          car.position.x = c.x;
          car.position.z = c.z;
          car.rotation.y = frame(o).yaw;
        });
        for (const { g, o } of gangways) {
          const a = toCar(o, CL / 2, CW / 2);
          const b = toCar(o + 1, -CL / 2, CW / 2);
          g.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
          g.rotation.y = track((o + 0.5) * L, 0).yaw;
          g.scale.x = Math.hypot(b.x - a.x, b.z - a.z) + 0.16;
        }
        walls.length = 0;
        for (const [o, x0, z0, x1, z1] of wallDefs) {
          const a = toCar(o, x0, z0);
          const b = toCar(o, x1, z1);
          walls.push([a.x, a.z, b.x, b.z]);
        }
        for (const { g } of gangways) {
          const c = Math.cos(g.rotation.y);
          const sn = Math.sin(g.rotation.y);
          const len = g.scale.x;
          for (const s of [-1, 1]) {
            const p = (x) => [g.position.x + x * c + s * 0.5 * sn, g.position.z - x * sn + s * 0.5 * c];
            walls.push([...p(-len / 2), ...p(len / 2)]);
          }
        }
        blockers.length = 0;
        for (const [o, x, z, r] of blockerDefs) {
          const p = toCar(o, x, z);
          blockers.push({ x: p.x, z: p.z, r });
        }
        for (const st of strips) layStrip(st);
      }
      for (const [o, x, z] of riderAt) blockerDefs.push([o, x, z, 0.3]);
      blockerDefs.push([0, dog.g.position.x, dog.g.position.z, 0.3]);
      layout();
      drawTrees();
      drawGrowth();
      drawPoles();

      function riding() {
        const you = R.player;
        let best = null;
        for (const o of OFFSETS) {
          const l = fromCar(o, you.x, you.z);
          const d = Math.max(0, Math.abs(l.x) - CL / 2);
          if (!best || d < best.d) best = { o, l, d, yaw: frame(o).yaw };
        }
        return best;
      }

      // The ride: a gentle sway, a lean into the bends, the odd bump.
      const motionState = { bend: 0, sway: 0, swayV: 0, jolt: 0, nextJolt: 3, grind: 0 };
      const sunWorld = new THREE.Vector3();
      const api = {
        floor: () => 0,
        walls,
        blockers,
        people,
        noShove: true,
        ride: motionState,
        debug: { track },
        cameraFx() {
          const s = motionState;
          const lean = s.bend * 0.3;
          const w = R.reg.dirToWorld(0, s.sway * 0.025 - lean * 0.3);
          return { x: w.x, y: s.jolt * 0.02, roll: s.sway * 0.01 + lean };
        },
        update(t, dt, info) {
          const s = motionState;
          const m = motion();
          const now = performance.now() / 1000;
          const bend = bendAt(now);
          const dBend = (bend - s.bend) / Math.max(dt, 1e-3);
          s.bend = bend;
          const before = info.here ? riding() : null;
          shape(now);
          layout();
          if (before) {
            const p = toCar(before.o, before.l.x, before.l.z);
            const you = R.player;
            R.nudgePlayer(p.x - you.x, p.z - you.z, frame(before.o).yaw - before.yaw);
          }
          s.grind = Math.min(1, Math.max(0, (Math.abs(bend) / BEND_MAX - 0.8) / 0.2));
          s.swayV += dBend * dt * 20;
          const push = Math.sin(t * 1.1) * 0.5 + Math.sin(t * 2.3 + 1) * 0.25;
          s.swayV += (push - s.sway * 5) * dt - s.swayV * dt * 1.5;
          s.sway += s.swayV * dt;
          if (t > s.nextJolt) {
            s.jolt = 0.7;
            s.nextJolt = t + 3 + Math.random() * 6;
          }
          s.jolt *= Math.exp(-dt * 6);
          carGroups.forEach((car, i) => { if (i) car.rotation.x = Math.sin(t * 1.1 + i * 0.9) * 0.005 * m; });
          // Vines swing out to the outside of a bend, and in the breeze.
          for (const v of vines) {
            v.g.rotation.x = (bend * 2.2 - s.sway * 0.3 + Math.sin(t * 1.7 + v.phase) * 0.05) * v.k * m;
            v.g.rotation.z = Math.sin(t * 1.3 + v.phase) * 0.06 * m;
          }
          dog.tail.rotation.y = Math.sin(t * 6) * 0.4 * m;
          for (let i = 0; i < motes.pos.length; i += 3) {
            motes.pos[i] = motes.base[i] + Math.sin(t * 0.3 + i) * 0.15;
            motes.pos[i + 1] = motes.base[i + 1] + Math.sin(t * 0.21 + i * 0.7) * 0.1;
          }
          motes.p.geometry.attributes.position.needsUpdate = true;

          // Everything outside: the near things stream past along the track.
          const step = SPEED * dt;
          travelled += step;
          sleeperMat.map.offset.x += step / 20;
          ballastMat.map.offset.x += step / 6;
          bankMat.map.offset.x += step / 10;
          for (const tr of trees) {
            tr.s -= step;
            if (tr.s < S_MIN) seedTree(tr, tr.s + WRAP);
          }
          drawTrees();
          for (const g of growth) {
            g.s -= step;
            if (g.s < S_MIN) g.s += WRAP;
          }
          drawGrowth();
          for (const pl of poles) {
            pl.s -= step;
            if (pl.s < S_MIN) pl.s += WRAP;
          }
          drawPoles();
          for (const d of deer) {
            d.s -= step;
            if (d.s < S_MIN) seedDeer(d, d.s + WRAP + 300);
            const p = track(d.s, d.n);
            d.g.position.set(p.x, GROUND, p.z);
            d.g.rotation.y = p.yaw + d.yaw;
            d.neck.rotation.z = -0.9 + 0.9 * Math.max(0, Math.sin(t * 0.4 + d.phase)) ** 3;
          }
          // The world: the train's heading by time, its position by
          // integrating speed along that heading.
          const H = heading(now);
          wx += step * Math.cos(H);
          wz += step * Math.sin(H);
          world.rotation.y = H;
          land.position.set(0, 0, -wz);
          for (const Ly of layers) Ly.g.position.x = -(wx % Ly.P);
          groundTex.offset.set(wx / GT, -wz / GT);
          if (layers[0].g.userData.river) layers[0].g.userData.river.offset.x += dt * 0.02;
          sky.position.copy(R.camLocal);
          sky.rotation.y = H;
          // The sun comes round with the heading, and so do the light
          // through the windows and the shadows of the frames.
          sunWorld.copy(SUN).applyAxisAngle(new THREE.Vector3(0, 1, 0), H);
          const mid = toCar(2, 0, CW / 2);
          sun.target.position.set(mid.x, 0, mid.z);
          sun.position.set(mid.x + sunWorld.x * 70, sunWorld.y * 70, mid.z + sunWorld.z * 70);
          for (const b of birds) {
            if (b.cx - wx < -500) b.cx += 1400;
            const a = t * 0.35 + b.phase;
            b.g.position.set(b.cx - wx + Math.cos(a) * b.r, GROUND + b.y + Math.sin(a * 2) * 3, b.cz + Math.sin(a) * b.r);
            b.g.rotation.y = -a;
            const flap = Math.sin(t * 9 + b.phase) * 0.6;
            b.g.children[0].rotation.x = flap;
            b.g.children[1].rotation.x = -flap;
          }
        },
        passes: [],
      };
      return api;
    },
    sound(A, R, api) {
      const s = api.ride;
      const V0 = NATURE.SPEED;
      // Wind through the open windows, leaves, birdsong, the wooden coach
      // creaking, and the wheels on jointed rail, timed from the speed.
      // No steady high tones anywhere.
      const rumble = A.gain(0.14);
      A.hiss().connect(A.filter("lowpass", 120, 0.7)).connect(rumble).connect(A.bus);
      const roar = A.gain(0.035);
      A.hiss().connect(A.filter("bandpass", 320, 0.6)).connect(A.filter("lowpass", 800)).connect(roar).connect(A.bus);
      const wind = A.gain(0.05);
      const windTone = A.filter("bandpass", 650, 0.5);
      A.hiss().connect(windTone).connect(wind).connect(A.bus);
      const leaves = A.gain(0);
      A.hiss().connect(A.filter("highpass", 2200)).connect(A.filter("lowpass", 6000)).connect(leaves).connect(A.bus);
      // Clacks: 39 ft rails, two trucks per coach 9.8 m apart, each with
      // axles 2.4 m apart; the coaches either side are softer.
      const clackTone = A.filter("bandpass", 1100, 1.4);
      const clackAmp = A.gain(0);
      A.hiss().connect(clackTone).connect(A.filter("lowpass", 2500)).connect(clackAmp).connect(A.bus);
      const thump = A.osc("sine", 62);
      const thumpAmp = A.gain(0);
      thump.connect(thumpAmp).connect(A.bus);
      const RAIL = 11.89;
      const PERIOD = RAIL / V0;
      const T = NATURE.CL * 0.35;
      const axles = [];
      for (const [truck, gain] of [[T, 1], [-T, 1], [NATURE.L - T, 0.4], [-(NATURE.L - T), 0.4]]) for (const a of [-1.2, 1.2]) axles.push([truck + a, gain]);
      const front = Math.max(...axles.map(([x]) => x));
      const beats = axles.map(([x, g]) => [((front - x) / V0) % PERIOD, g]).sort((a, b) => a[0] - b[0]);
      let joint = A.ctx.currentTime + 0.3;
      A.extras.push((until) => {
        joint = Math.max(joint, A.ctx.currentTime);
        while (joint < until) {
          for (const [dt, g] of beats) {
            const t = joint + dt;
            const v = g * (0.85 + A.chance() * 0.3);
            clackAmp.gain.setValueAtTime(0.0001, t);
            clackAmp.gain.linearRampToValueAtTime(0.14 * v, t + 0.005);
            clackAmp.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
            thumpAmp.gain.setValueAtTime(0.0001, t);
            thumpAmp.gain.linearRampToValueAtTime(0.2 * v, t + 0.008);
            thumpAmp.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
          }
          joint += PERIOD;
        }
      });
      // The coach creaking: a short groan of filtered noise, gliding.
      const creakTone = A.filter("bandpass", 260, 5);
      const creakAmp = A.gain(0);
      A.hiss().connect(creakTone).connect(creakAmp).connect(A.bus);
      let creak = A.ctx.currentTime + 2;
      A.extras.push((until) => {
        creak = Math.max(creak, A.ctx.currentTime);
        while (creak < until) {
          const f = 180 + A.chance() * 160;
          const d = 0.25 + A.chance() * 0.4;
          creakTone.frequency.setValueAtTime(f, creak);
          creakTone.frequency.linearRampToValueAtTime(f * (0.8 + A.chance() * 0.5), creak + d);
          creakAmp.gain.setTargetAtTime(0.06 + A.chance() * 0.05, creak, 0.04);
          creakAmp.gain.setTargetAtTime(0, creak + d, 0.08);
          creak += 1.5 + A.chance() * 5;
        }
      });
      // Birdsong: short phrases of quick chirps from either side, with
      // gaps between; a wood pigeon's soft call now and then.
      const birdOut = A.ctx.createStereoPanner ? A.ctx.createStereoPanner() : A.gain(1);
      birdOut.connect(A.bus);
      const bird = A.osc("sine", 3000);
      const birdAmp = A.gain(0);
      bird.connect(birdAmp).connect(birdOut);
      const dove = A.osc("sine", 520);
      const doveAmp = A.gain(0);
      dove.connect(A.filter("lowpass", 900)).connect(doveAmp).connect(A.bus);
      let song = A.ctx.currentTime + 1.5;
      A.extras.push((until) => {
        song = Math.max(song, A.ctx.currentTime);
        while (song < until) {
          if (birdOut.pan) birdOut.pan.setValueAtTime(A.chance() * 1.6 - 0.8, song);
          if (A.chance() < 0.18) {
            // Wood pigeon: coo-COO-coo coo.
            let t = song;
            for (const [f, d] of [[480, 0.3], [560, 0.45], [480, 0.3], [470, 0.35]]) {
              dove.frequency.setValueAtTime(f, t);
              dove.frequency.linearRampToValueAtTime(f * 0.94, t + d);
              doveAmp.gain.setTargetAtTime(0.035, t, 0.03);
              doveAmp.gain.setTargetAtTime(0, t + d * 0.8, 0.05);
              t += d + 0.12;
            }
            song = t + 2 + A.chance() * 4;
            continue;
          }
          const base = 2200 + A.chance() * 1600;
          const n = 3 + Math.floor(A.chance() * 6);
          let t = song;
          const gap = 0.07 + A.chance() * 0.08;
          for (let i = 0; i < n; i++) {
            const f = base * (0.85 + A.chance() * 0.35);
            const d = 0.04 + A.chance() * 0.06;
            bird.frequency.setValueAtTime(f, t);
            bird.frequency.exponentialRampToValueAtTime(f * (A.chance() < 0.5 ? 1.35 : 0.7), t + d);
            birdAmp.gain.setValueAtTime(0.0001, t);
            birdAmp.gain.linearRampToValueAtTime(0.022, t + 0.01);
            birdAmp.gain.exponentialRampToValueAtTime(0.0001, t + d);
            t += d + gap;
          }
          song = t + 0.8 + A.chance() * 3.5;
        }
      });
      // Flange grind: only on the tightest stretch of a bend, broad noise.
      const grindTone = A.filter("bandpass", 2000, 2.5);
      const grindAmp = A.gain(0);
      A.hiss().connect(grindTone).connect(A.filter("lowpass", 3200)).connect(grindAmp).connect(A.bus);
      return {
        update() {
          const now = A.ctx.currentTime;
          const gust = 0.5 + 0.5 * Math.sin(now * 0.31) * Math.sin(now * 0.13 + 1);
          wind.gain.setTargetAtTime(0.035 + gust * 0.045, now, 0.5);
          windTone.frequency.setTargetAtTime(500 + gust * 300, now, 0.5);
          leaves.gain.setTargetAtTime(0.004 + gust * 0.01, now, 0.5);
          rumble.gain.setTargetAtTime(0.12 + Math.abs(s.sway) * 0.06, now, 0.2);
          roar.gain.setTargetAtTime(0.03 + Math.abs(s.bend) * 0.12, now, 0.4);
          grindAmp.gain.setTargetAtTime(s.grind * 0.025, now, 0.4);
          grindTone.frequency.setTargetAtTime(1900 + Math.sin(now * 0.9) * 250, now, 0.3);
        },
      };
    },
  };
