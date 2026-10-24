  // ---------- The Lighthouse ----------
  // A stone lighthouse on a headland on a stormy night. The door opens onto
  // the foot of the tower: a whitewashed shaft with stone steps spiralling
  // up its wall round an open well, oil lamps, small deep windows streaming
  // with rain, photos hung all the way up. At the top, a landing with the
  // keeper's desk, then a steep stair into the lamp room: the great lens
  // turning, its two beams sweeping out over the sea, glass all round. A
  // door lets you out onto the gallery, into the wind and rain, thirty
  // metres above the rocks.

  // The tower's own coordinates: its axis at the origin, the room's +z
  // running away from the door. Angles are measured from +x toward +z.
  const LH = (() => {
    const ZC = 4.0; // the axis, from the doorway
    const RI = 3.0; // inside face of the wall
    const RW = 1.6; // the edge of the open well
    const RISE = 0.16; // each step
    const STEPS = 20; // to a turn, so 3.2 m a turn
    const TURNS = 5;
    const DA = (Math.PI * 2) / STEPS;
    const PHI0 = THREE.MathUtils.degToRad(-40); // where the stair starts
    const TW = TURNS * Math.PI * 2; // where it ends, measured from PHI0
    const HW = RISE * STEPS * TURNS; // the landing at the top: 16 m
    const HL = HW + 2.9; // the lamp room floor
    const RG = 3.6; // the lamp room's glass
    const RR = 5.0; // the gallery railing
    const PHI_G = THREE.MathUtils.degToRad(200); // the door out to the gallery
    const UNDER = THREE.MathUtils.degToRad(247.5); // past this, 2.2 m clear under the first turn
    const LANDING = THREE.MathUtils.degToRad(120); // the floor at the top, from PHI0
    // The steep stair from the landing to the lamp room: straight, along
    // the wall, centred at radius LR on angle LPHI, from s = -LS to +LS.
    const LPHI = THREE.MathUtils.degToRad(30);
    const LR = 2.07;
    const LS = 1.3;
    const LWID = 0.55;
    const HATCH = -0.7; // the hole in the lamp room floor runs from here up
    const LC = { x: Math.cos(LPHI) * LR, z: Math.sin(LPHI) * LR };
    const LT = { x: -Math.sin(LPHI), z: Math.cos(LPHI) }; // up the stair
    const LN = { x: Math.cos(LPHI), z: Math.sin(LPHI) }; // toward the wall
    const ladder = (x, z) => ({ s: (x - LC.x) * LT.x + (z - LC.z) * LT.z, n: (x - LC.x) * LN.x + (z - LC.z) * LN.z });
    const fromLadder = (s, n) => ({ x: LC.x + LT.x * s + LN.x * n, z: LC.z + LT.z * s + LN.z * n });
    const LSTEPS = 12;
    const rampH = (s) => HW + Math.min(LSTEPS, Math.max(0, Math.floor(((s + LS) / (2 * LS)) * LSTEPS + 0.5))) * ((HL - HW) / LSTEPS);
    const stepH = (th) => Math.max(0, Math.floor(th / DA)) * RISE;
    const rExt = (y) => 4.0 - 0.6 * Math.min(1, Math.max(0, y / HL));
    const TAU = Math.PI * 2;
    const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const rel = (phi) => ((((phi - PHI0) % TAU) + TAU) % TAU);
    return { ZC, RI, RW, RISE, STEPS, TURNS, DA, PHI0, TW, HW, HL, RG, RR, PHI_G, UNDER, LANDING, LPHI, LR, LS, LWID, HATCH, LC, LT, LN, ladder, fromLadder, LSTEPS, rampH, stepH, rExt, TAU, wrapPi, rel };
  })();

  // Where you are on the stair can't be told from where you stand alone
  // (every turn is over the last), so the room keeps track: which level
  // you're on, and on the stair, how far round you've climbed. A jump to
  // one of the room's spots says where it lands.
  const LH_STATE = { mode: "ground", theta: 0, prevPhi: 0, pending: null, changed: true };
  const lhSpot = (spot, mode, theta = 0) => {
    LH_STATE.pending = { x: spot.x, z: spot.z, mode, theta, at: performance.now() };
    return spot;
  };
  // The camera's heading to look along (dx, dz) in the room.
  const lhYaw = (dx, dz) => Math.atan2(-dx, -dz);

  ROOMS.lighthouse = {
    name: "The Lighthouse",
    short: "Lighthouse",
    tagline: "Up the tower, into the storm",
    color: 0xe8d9a8,
    leak: 0xffc070,
    leakStyle: "flicker",
    frame: 0x3a3430,
    fogColor: 0x161a20,
    loudness: 0.9,
    ground: "concrete",
    entrance: { x: 0, z: 0, nx: 0, nz: -1 },
    get spawn() { return lhSpot({ x: 0, z: LH.ZC - 2.3, yaw: Math.PI, pitch: 0.12 }, "ground"); },
    spots: {
      get well() { return lhSpot({ name: "Look Up the Stair", x: 0.35, z: LH.ZC - 0.35, yaw: Math.PI * 0.8, pitch: 1.15 }, "ground"); },
      get stairs() {
        const th = LH.TAU * 2.5 + 0.35;
        const phi = LH.PHI0 + th;
        return lhSpot({ name: "Halfway Up", x: Math.cos(phi) * 2.3, z: LH.ZC + Math.sin(phi) * 2.3, yaw: lhYaw(-Math.sin(phi) - Math.cos(phi) * 0.7, Math.cos(phi) - Math.sin(phi) * 0.7), pitch: 0.35 }, "stair", th);
      },
      get landing() {
        const phi = LH.PHI0 + 0.2;
        return lhSpot({ name: "The Keeper's Landing", x: Math.cos(phi) * 2.3, z: LH.ZC + Math.sin(phi) * 2.3, yaw: lhYaw(-Math.sin(phi) - Math.cos(phi) * 0.8, Math.cos(phi) - Math.sin(phi) * 0.8), pitch: 0.05 }, "watch");
      },
      get lamp() {
        const phi = LH.PHI_G - 0.6;
        return lhSpot({ name: "The Lamp Room", x: Math.cos(phi) * 2.4, z: LH.ZC + Math.sin(phi) * 2.4, yaw: lhYaw(-Math.cos(phi), -Math.sin(phi)), pitch: 0.18 }, "top");
      },
      get gallery() {
        const phi = LH.PHI_G + 0.3;
        return lhSpot({ name: "Out on the Gallery", x: Math.cos(phi) * 4.3, z: LH.ZC + Math.sin(phi) * 4.3, yaw: lhYaw(Math.cos(phi) - Math.sin(phi) * 0.9, Math.sin(phi) + Math.cos(phi) * 0.9), pitch: -0.15 }, "top");
      },
    },
    build(R) {
      const { ZC, RI, RW, RISE, STEPS, TURNS, DA, PHI0, TW, HW, HL, RG, RR, PHI_G, UNDER, LANDING, LPHI, LS, LWID, HATCH, ladder, fromLadder, LSTEPS, rampH, stepH, rExt, TAU, wrapPi, rel } = LH;
      const D = Q.density;
      const S = LH_STATE;
      S.mode = "ground";
      S.changed = true;
      const SEA = -12;
      R.scene.fog = new THREE.FogExp2(0x10141a, 0.0026);
      // Everything below is built in the tower's frame and placed here.
      const T = new THREE.Group();
      T.position.set(0, 0, ZC);
      R.add(T);
      const P = (phi, r, y = 0) => new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
      // A flat thing at angle phi on the wall, facing the axis.
      const faceIn = (phi) => Math.atan2(-Math.cos(phi), -Math.sin(phi));
      const faceOut = (phi) => Math.atan2(Math.cos(phi), Math.sin(phi));

      // ---------- Light ----------
      const hemi = new THREE.HemisphereLight(0x4a5468, 0x14161a, 0.55);
      R.add(hemi);
      const lampWarm = 0xffb060;
      const sconceLights = Array.from({ length: D < 0.5 ? 2 : 3 }, () => {
        const l = new THREE.PointLight(lampWarm, 3.2, 7.5, 1.5);
        T.add(l);
        return l;
      });
      const deskLight = new THREE.PointLight(0xffb868, 2.6, 5.5, 1.5);
      T.add(deskLight);
      const lampRoomLight = new THREE.PointLight(0xffe2a8, 7, 9, 1.4);
      lampRoomLight.position.set(0, HL + 2.0, 0);
      T.add(lampRoomLight);
      const sky = new THREE.DirectionalLight(0x6a7a92, 0.18);
      sky.position.set(-30, 80, 40);
      R.add(sky);

      // ---------- Materials ----------
      // Whitewashed stone, in courses, stained with damp and salt.
      const stoneTex = canvasTex(512, 512, (g) => {
        const r = rng(1201);
        g.fillStyle = "#cfc8b8";
        g.fillRect(0, 0, 512, 512);
        for (let row = 0; row < 8; row++) {
          const y = row * 64;
          let x = -(row % 2) * 60;
          while (x < 512) {
            const w = 90 + r() * 80;
            const v = (r() - 0.5) * 24;
            g.fillStyle = `rgb(${205 + v}, ${198 + v}, ${184 + v})`;
            g.fillRect(x + 3, y + 3, w - 6, 58);
            g.fillStyle = "rgba(90, 84, 72, 0.5)";
            g.fillRect(x, y, w, 3);
            g.fillRect(x, y, 3, 64);
            x += w;
          }
        }
        // Damp running down, salt blooming, a few cracks.
        for (let i = 0; i < 40; i++) {
          const x = r() * 512;
          const y = r() * 400;
          const h = 60 + r() * 220;
          const grad = g.createLinearGradient(0, y, 0, y + h);
          grad.addColorStop(0, `rgba(110, 100, 80, ${0.12 + r() * 0.18})`);
          grad.addColorStop(1, "rgba(110, 100, 80, 0)");
          g.fillStyle = grad;
          g.fillRect(x, y, 4 + r() * 22, h);
        }
        for (let i = 0; i < 25; i++) {
          const x = r() * 512;
          const y = r() * 512;
          const rad = 15 + r() * 50;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          const salt = r() < 0.4;
          blob.addColorStop(0, salt ? "rgba(240, 240, 232, 0.35)" : `rgba(80, 90, 70, ${0.1 + r() * 0.15})`);
          blob.addColorStop(1, "rgba(0, 0, 0, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        g.strokeStyle = "rgba(60, 54, 46, 0.45)";
        for (let i = 0; i < 10; i++) {
          g.lineWidth = 1;
          g.beginPath();
          let x = r() * 512;
          let y = r() * 512;
          g.moveTo(x, y);
          for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 30; y += 6 + r() * 14; g.lineTo(x, y); }
          g.stroke();
        }
      });
      const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92 });
      // The steps: grey stone, worn pale and hollow down the walking line.
      const stepTex = canvasTex(256, 256, (g) => {
        const r = rng(1202);
        g.fillStyle = "#7a746a";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2000; i++) {
          const v = 90 + r() * 70;
          g.fillStyle = `rgba(${v}, ${v - 4}, ${v - 12}, 0.4)`;
          g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
        }
        const wear = g.createLinearGradient(0, 0, 256, 0);
        wear.addColorStop(0.2, "rgba(170, 162, 148, 0)");
        wear.addColorStop(0.55, "rgba(170, 162, 148, 0.45)");
        wear.addColorStop(0.85, "rgba(170, 162, 148, 0)");
        g.fillStyle = wear;
        g.fillRect(0, 0, 256, 256);
      });
      const stepMat = new THREE.MeshStandardMaterial({ map: stepTex, roughness: 0.8, side: THREE.DoubleSide });
      const flagTex = canvasTex(512, 512, (g) => {
        const r = rng(1203);
        g.fillStyle = "#5e5a52";
        g.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 128) {
          for (let x = -(y % 256 ? 64 : 0); x < 512; x += 128) {
            const v = (r() - 0.5) * 30;
            g.fillStyle = `rgb(${100 + v}, ${96 + v}, ${88 + v})`;
            g.fillRect(x + 4, y + 4, 120, 120);
          }
        }
        for (let i = 0; i < 1500; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? "40,38,34" : "150,144,132"}, 0.3)`;
          g.fillRect(r() * 512, r() * 512, 2, 2);
        }
      });
      flagTex.repeat.set(2, 2);
      const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.85 });
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e2a24, metalness: 0.6, roughness: 0.55 });
      const brass = new THREE.MeshStandardMaterial({ color: 0xc09048, metalness: 1, roughness: 0.3 });
      const boardTex = canvasTex(256, 256, (g) => {
        const r = rng(1204);
        for (let i = 0; i < 6; i++) {
          const v = (r() - 0.5) * 24;
          g.fillStyle = `rgb(${92 + v}, ${62 + v}, ${38 + v})`;
          g.fillRect(0, i * 43, 256, 43);
          g.fillStyle = "rgba(20, 10, 4, 0.5)";
          g.fillRect(0, i * 43, 256, 2);
          for (let k = 0; k < 14; k++) {
            g.fillStyle = `rgba(40, 24, 10, ${0.08 + r() * 0.1})`;
            g.fillRect(r() * 256, i * 43 + r() * 43, 40 + r() * 120, 1);
          }
        }
      });
      boardTex.repeat.set(2, 2);
      const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.75, side: THREE.DoubleSide });
      const woodMat = new THREE.MeshStandardMaterial({ map: boardTex, color: 0xb08a68, roughness: 0.6 });
      // The tower outside: white, two red bands, streaked with rust and salt.
      const outTex = canvasTex(128, 512, (g) => {
        const r = rng(1205);
        g.fillStyle = "#d8d4ca";
        g.fillRect(0, 0, 128, 512);
        g.fillStyle = "#8a2a22";
        g.fillRect(0, 512 * 0.22, 128, 512 * 0.14);
        g.fillRect(0, 512 * 0.58, 128, 512 * 0.14);
        for (let i = 0; i < 30; i++) {
          const x = r() * 128;
          const y = r() * 512;
          const grad = g.createLinearGradient(0, y, 0, y + 80);
          grad.addColorStop(0, `rgba(${r() < 0.5 ? "110,70,40" : "60,60,56"}, 0.3)`);
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          g.fillStyle = grad;
          g.fillRect(x, y, 2 + r() * 6, 80);
        }
      }, { repeat: false });
      outTex.wrapS = THREE.RepeatWrapping;
      const outMat = new THREE.MeshStandardMaterial({ map: outTex, roughness: 0.8 });
      // Rain running down glass: drips and streaks, scrolled down over time.
      const rainGlassTex = canvasTex(256, 512, (g) => {
        const r = rng(1206);
        for (let i = 0; i < 70; i++) {
          const x = r() * 256;
          const y = r() * 512;
          const len = 30 + r() * 140;
          const grad = g.createLinearGradient(0, y, 0, y + len);
          grad.addColorStop(0, "rgba(220, 230, 240, 0)");
          grad.addColorStop(0.8, "rgba(220, 230, 240, 0.55)");
          grad.addColorStop(1, "rgba(240, 245, 250, 0.9)");
          g.fillStyle = grad;
          g.fillRect(x, y, 1.5 + r() * 1.5, len);
        }
        for (let i = 0; i < 260; i++) {
          g.fillStyle = `rgba(230, 236, 244, ${0.25 + r() * 0.4})`;
          g.beginPath();
          g.arc(r() * 256, r() * 512, 0.8 + r() * 2.2, 0, TAU);
          g.fill();
        }
      });
      const glassMat = new THREE.MeshStandardMaterial({ map: rainGlassTex, color: 0x7a8694, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
      const winGlassMat = new THREE.MeshStandardMaterial({ map: rainGlassTex, color: 0x8894a4, emissive: 0x000000, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc070, toneMapped: false });

      const box = (parent, w, h, d, material, x, y, z, ry = 0) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        m.position.set(x, y, z);
        m.rotation.y = ry;
        parent.add(m);
        return m;
      };

      // ---------- The tower's wall ----------
      // Built cell by cell (5° round, 20 cm up) so windows can be left out:
      // an inside face, an outside face that tapers, and the reveals
      // between them, each window glazed in its reveal.
      const NSEG = 72;
      const HC = 0.2;
      const TOPY = HL - 0.15;
      const NJ = Math.round(TOPY / HC);
      const segAt = (phi) => Math.round(((((phi % TAU) + TAU) % TAU) / TAU) * NSEG);
      const windows = [];
      // Each window is splayed, as in a thick wall: the opening inside is a
      // cell wider each side and a row taller top and bottom than the glass.
      const addWindow = (phi, y0, cells = 2, rows = 5) => {
        const i0 = segAt(phi) - Math.floor(cells / 2);
        const j0 = Math.round(y0 / HC);
        windows.push({ i0, i1: i0 + cells, j0, j1: j0 + rows, ii0: i0 - 1, ii1: i0 + cells + 1, jj0: j0 - 1, jj1: j0 + rows + 1 });
      };
      // Photos, windows and lamps take turns up the stair.
      const PH0 = 0.7;
      const PHSTEP = 1.96;
      const NPH = 15;
      for (let k = 0; k < NPH; k++) {
        const th = PH0 + k * PHSTEP + 0.98;
        if (th > TW - 0.8) continue;
        addWindow(PHI0 + th, stepH(th) + 1.05);
      }
      // Up on the landing, four more.
      for (const deg of [-75, 110, 165, 250]) addWindow(THREE.MathUtils.degToRad(deg), HW + 0.95, 2, 6);
      const inWindow = (i, j, inner) => windows.find((w) => {
        const a0 = inner ? w.ii0 : w.i0;
        const a1 = inner ? w.ii1 : w.i1;
        const ii = ((i - a0) % NSEG + NSEG) % NSEG;
        return ii < a1 - a0 && j >= (inner ? w.jj0 : w.j0) && j < (inner ? w.jj1 : w.j1);
      });
      // The doorway, round the -z side.
      const DOOR_PHI = -Math.PI / 2;
      const inDoor = (i, j, r) => {
        const phi = ((i + 0.5) / NSEG) * TAU;
        const x = Math.cos(phi) * r;
        return Math.abs(wrapPi(phi - DOOR_PHI)) < Math.PI / 2 && Math.abs(x) < 0.8 && (j + 0.5) * HC < 2.4;
      };
      function shell(radiusAt, inward, uScale, vMode, j0 = 0, skipDoor = true) {
        const pos = [];
        const uv = [];
        for (let i = 0; i < NSEG; i++) {
          const a0 = (i / NSEG) * TAU;
          const a1 = ((i + 1) / NSEG) * TAU;
          for (let j = j0; j < NJ; j++) {
            if (j >= 0 && inWindow(i, j, inward)) continue;
            const y0 = j * HC;
            const y1 = (j + 1) * HC;
            if (skipDoor && j >= 0 && inDoor(i, j, radiusAt(y0))) continue;
            const q = [[a0, y0], [a1, y0], [a1, y1], [a0, y1]].map(([a, y]) => [Math.cos(a) * radiusAt(y), y, Math.sin(a) * radiusAt(y), a, y]);
            const tris = inward ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
            for (const t of tris) {
              const [x, y, z, a, yy] = q[t];
              pos.push(x, y, z);
              uv.push((a / TAU) * uScale, vMode === "abs" ? yy / 2 : yy / HL);
            }
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geo.computeVertexNormals();
        return geo;
      }
      T.add(new THREE.Mesh(shell(() => RI, true, (TAU * RI) / 2, "abs"), stoneMat));
      const outer = new THREE.Mesh(shell(rExt, false, 8, "rel", -10), outMat);
      T.add(outer);
      // Reveals and glass.
      {
        const pos = [];
        const uv = [];
        const quad = (a, b, c, d) => {
          for (const p of [a, b, c, a, c, d]) { pos.push(p.x, p.y, p.z); uv.push(p.x * 0.5 + p.z * 0.5, p.y * 0.5); }
        };
        for (const w of windows) {
          const a0 = (w.i0 / NSEG) * TAU;
          const a1 = (w.i1 / NSEG) * TAU;
          const y0 = w.j0 * HC;
          const y1 = w.j1 * HC;
          const b0 = (w.ii0 / NSEG) * TAU;
          const b1 = (w.ii1 / NSEG) * TAU;
          const z0 = w.jj0 * HC;
          const z1 = w.jj1 * HC;
          const ri = RI;
          const ro = (y) => rExt(y);
          const pIn = (a, y) => P(a, ri, y);
          const pOut = (a, y) => P(a, ro(y), y);
          quad(pIn(b0, z0), pIn(b1, z0), pOut(a1, y0), pOut(a0, y0)); // sill
          quad(pIn(b1, z1), pIn(b0, z1), pOut(a0, y1), pOut(a1, y1)); // head
          quad(pIn(b0, z1), pIn(b0, z0), pOut(a0, y0), pOut(a0, y1)); // jamb
          quad(pIn(b1, z0), pIn(b1, z1), pOut(a1, y1), pOut(a1, y0)); // jamb
          // The glass, most of the way out, in a wooden frame.
          const am = (a0 + a1) / 2;
          const rm = (ri * 0.2 + ro((y0 + y1) / 2) * 0.8);
          const width = 2 * rm * Math.sin((a1 - a0) / 2);
          const pane = new THREE.Mesh(new THREE.PlaneGeometry(width, y1 - y0), winGlassMat);
          pane.position.copy(P(am, rm * Math.cos((a1 - a0) / 2), (y0 + y1) / 2));
          pane.rotation.y = faceIn(am);
          pane.renderOrder = 2;
          T.add(pane);
          const bar = box(T, 0.03, y1 - y0, 0.04, woodMat, 0, 0, 0, faceIn(am));
          bar.position.copy(pane.position);
          const rail = box(T, width, 0.03, 0.04, woodMat, 0, 0, 0, faceIn(am));
          rail.position.copy(pane.position).setY((y0 + y1) / 2 + 0.1);
          // A stone ledge inside.
          const sill = box(T, 2 * ri * Math.sin((b1 - b0) / 2) + 0.1, 0.05, 0.16, stepMat, 0, 0, 0, faceIn(am));
          sill.position.copy(P(am, ri - 0.05, z0 - 0.02));
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geo.computeVertexNormals();
        T.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, side: THREE.DoubleSide })));
      }
      // The passage through the wall at the door, and the door itself,
      // standing open against it.
      {
        const zIn = -Math.sqrt(RI * RI - 0.64);
        const zOut = -Math.sqrt(rExt(0) ** 2 - 0.64) - 0.05;
        const len = zIn - zOut;
        for (const s of [-1, 1]) {
          const side = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4), stoneMat);
          side.position.set(s * 0.8, 1.2, (zIn + zOut) / 2);
          side.rotation.y = -s * Math.PI / 2;
          T.add(side);
        }
        const head = new THREE.Mesh(new THREE.PlaneGeometry(1.6, len), stoneMat);
        head.position.set(0, 2.4, (zIn + zOut) / 2);
        head.rotation.x = Math.PI / 2;
        T.add(head);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.6, len + 0.1), flagMat);
        floor.position.set(0, 0.001, (zIn + zOut) / 2);
        floor.rotation.x = -Math.PI / 2;
        T.add(floor);
        const leaf = new THREE.Group();
        box(leaf, 0.07, 2.3, 1.5, woodMat, 0, 1.15, -0.75);
        for (const y of [0.4, 1.15, 1.9]) box(leaf, 0.09, 0.12, 1.5, woodMat, -0.01, y, -0.75);
        box(leaf, 0.04, 0.1, 0.16, ironMat, 0.06, 1.1, -1.35);
        leaf.position.set(0.78, 0, zIn + 0.02);
        leaf.rotation.y = -1.45;
        T.add(leaf);
      }

      // ---------- The floor, the steps, the rails ----------
      const groundFloor = new THREE.Mesh(new THREE.CircleGeometry(RI, 48), flagMat);
      groundFloor.rotation.x = -Math.PI / 2;
      T.add(groundFloor);
      {
        // Each step a wedge of stone from the well's edge into the wall.
        const pos = [];
        const uv = [];
        const corner = (phi, r, y) => [Math.cos(phi) * r, y, Math.sin(phi) * r];
        const quad = (a, b, c, d, u0 = 0, u1 = 1) => {
          for (const [p, u, v] of [[a, u0, 0], [b, u1, 0], [c, u1, 1], [a, u0, 0], [c, u1, 1], [d, u0, 1]]) { pos.push(...p); uv.push(u, v); }
        };
        const total = STEPS * TURNS;
        for (let k = 1; k < total; k++) {
          const p0 = PHI0 + k * DA - 0.02;
          const p1 = PHI0 + (k + 1) * DA + 0.01;
          const top = k * RISE;
          const bot = top - 0.14;
          const ri = RW;
          const ro = RI + 0.05;
          const A = corner(p0, ri, top), B = corner(p0, ro, top), C = corner(p1, ro, top), Dd = corner(p1, ri, top);
          const A2 = corner(p0, ri, bot), B2 = corner(p0, ro, bot), C2 = corner(p1, ro, bot), D2 = corner(p1, ri, bot);
          quad(A, Dd, C, B); // tread
          quad(A2, B2, C2, D2); // underside
          quad(A2, A, B, B2, 0, 0.6); // nosing (the front, facing down the stair)
          quad(D2, C2, C, Dd, 0, 0.6); // back
          quad(A2, D2, Dd, A, 0, 0.15); // well side
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geo.computeVertexNormals();
        const steps = new THREE.Mesh(geo, stepMat);
        T.add(steps);
        // Iron balusters on every step, a brass-capped rail spiralling up
        // over them, and a rope along the wall through brass rings.
        const bal = new THREE.CylinderGeometry(0.014, 0.014, 0.92, 5);
        bal.translate(0, 0.46, 0);
        const balGeos = [];
        for (let k = 1; k < total; k++) {
          const g2 = bal.clone();
          const phi = PHI0 + (k + 0.5) * DA;
          g2.translate(Math.cos(phi) * (RW + 0.06), k * RISE, Math.sin(phi) * (RW + 0.06));
          balGeos.push(g2);
        }
        T.add(new THREE.Mesh(mergeGeometries(balGeos), ironMat));
        class Helix extends THREE.Curve {
          constructor(r, lift, t0, t1) { super(); this.r = r; this.lift = lift; this.t0 = t0; this.t1 = t1; }
          getPoint(u, target = new THREE.Vector3()) {
            const th = this.t0 + (this.t1 - this.t0) * u;
            const phi = PHI0 + th;
            return target.set(Math.cos(phi) * this.r, (th / DA) * RISE + this.lift, Math.sin(phi) * this.r);
          }
        }
        const segs = Math.round(TURNS * (D < 0.5 ? 60 : 120));
        T.add(new THREE.Mesh(new THREE.TubeGeometry(new Helix(RW + 0.06, 0.95, DA, TW), segs, 0.028, 6), brass));
        T.add(new THREE.Mesh(new THREE.TubeGeometry(new Helix(RI - 0.09, 0.95, DA * 2, TW), segs, 0.018, 5), new THREE.MeshStandardMaterial({ color: 0x8a7650, roughness: 0.95 })));
        const ringGeos = [];
        for (let k = 2; k < total; k += 3) {
          const phi = PHI0 + k * DA;
          const g2 = new THREE.TorusGeometry(0.035, 0.007, 4, 8);
          g2.rotateY(-phi);
          g2.translate(Math.cos(phi) * (RI - 0.06), k * RISE + 0.95, Math.sin(phi) * (RI - 0.06));
          ringGeos.push(g2);
        }
        T.add(new THREE.Mesh(mergeGeometries(ringGeos), brass));
      }

      // ---------- The landing at the top ----------
      // A floor over the well and part of the way round; elsewhere the last
      // turn of the stair comes up through the open stairwell, railed off.
      {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, RW, 0, TAU, false);
        const disk = new THREE.Mesh(new THREE.ShapeGeometry(shape, 40), boardMat);
        disk.rotation.x = Math.PI / 2;
        disk.position.y = HW;
        T.add(disk);
        const sector = new THREE.Mesh(new THREE.RingGeometry(RW, RI, 24, 1, PHI0, LANDING), boardMat);
        sector.rotation.x = Math.PI / 2;
        sector.position.y = HW;
        T.add(sector);
        // Its edge seen from below, and the beams under it.
        for (let k = 0; k < 6; k++) {
          const phi = (k / 6) * Math.PI;
          box(T, 0.12, 0.18, RW * 2, woodMat, 0, HW - 0.1, 0, Math.PI / 2 - phi);
        }
        // The railing round the stairwell: posts and a rail on the arc, and
        // across at the end of the landing.
        const railGeos = [];
        const post = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5);
        post.translate(0, 0.5, 0);
        for (let a = LANDING; a <= TAU + 0.001; a += DA / 2) {
          const g2 = post.clone();
          const phi = PHI0 + a;
          g2.translate(Math.cos(phi) * RW, HW, Math.sin(phi) * RW);
          railGeos.push(g2);
        }
        for (let r = RW; r <= RI; r += 0.35) {
          const g2 = post.clone();
          const phi = PHI0 + LANDING;
          g2.translate(Math.cos(phi) * r, HW, Math.sin(phi) * r);
          railGeos.push(g2);
        }
        T.add(new THREE.Mesh(mergeGeometries(railGeos), ironMat));
        const arc = new THREE.Mesh(new THREE.TorusGeometry(RW, 0.025, 5, 64, TAU - LANDING), brass);
        arc.rotation.x = Math.PI / 2;
        arc.rotation.z = PHI0 + LANDING;
        arc.position.y = HW + 1.0;
        T.add(arc);
        const across = box(T, RI - RW, 0.05, 0.05, brass, 0, HW + 1.0, 0, -(PHI0 + LANDING));
        across.position.copy(P(PHI0 + LANDING, (RI + RW) / 2, HW + 1.0));
      }
      // The steep stair up to the lamp room: open treads on stringers.
      {
        const g = new THREE.Group();
        const rise = (HL - HW) / LSTEPS;
        const run = (2 * LS) / LSTEPS;
        for (let k = 1; k <= LSTEPS; k++) {
          const s = -LS + (k - 0.5) * run;
          const t = box(g, run + 0.06, 0.04, LWID * 2, woodMat, s, k * rise - 0.02, 0);
          void t;
        }
        const len = Math.hypot(2 * LS, HL - HW);
        const ang = Math.atan2(HL - HW, 2 * LS);
        for (const n of [-LWID, LWID]) {
          const st = box(g, len, 0.2, 0.05, woodMat, 0, (HL - HW) / 2, n);
          st.rotation.z = ang;
          const hr = box(g, len, 0.04, 0.04, brass, 0, (HL - HW) / 2 + 0.9, n);
          hr.rotation.z = ang;
        }
        g.position.set(LH.LC.x, HW, LH.LC.z);
        g.rotation.y = -(LPHI + Math.PI / 2);
        T.add(g);
      }
      // The ceiling over the landing, which is the lamp room's floor, with
      // the hatch cut out where the stair comes through.
      const hatchShape = (r, base) => {
        const sh = new THREE.Shape();
        sh.absarc(0, 0, r, 0, TAU, false);
        const hole = new THREE.Path();
        const c = [[HATCH, -LWID - 0.05], [LS + 0.05, -LWID - 0.05], [LS + 0.05, LWID + 0.05], [HATCH, LWID + 0.05]].map(([s, n]) => fromLadder(s, n));
        hole.moveTo(c[0].x, c[0].z);
        for (let k = 1; k < 4; k++) hole.lineTo(c[k].x, c[k].z);
        hole.closePath();
        sh.holes.push(hole);
        const geo = new THREE.ShapeGeometry(sh, 48);
        geo.rotateX(Math.PI / 2);
        geo.translate(0, base, 0);
        return geo;
      };
      T.add(new THREE.Mesh(hatchShape(RI, HL - 0.15), boardMat));

      // ---------- The lamp room and the gallery ----------
      const plateTex = canvasTex(128, 128, (g) => {
        g.fillStyle = "#3a3c3a";
        g.fillRect(0, 0, 128, 128);
        g.fillStyle = "#555853";
        for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < 128; x += 16) g.fillRect(x + 3, y + 6, 8, 3);
      });
      plateTex.repeat.set(8, 8);
      const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide });
      T.add(new THREE.Mesh(hatchShape(RG, HL), plateMat));
      const grateTex = canvasTex(64, 64, (g) => {
        g.fillStyle = "#2a2c2a";
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = "#0a0b0a";
        for (let i = 0; i < 8; i++) g.fillRect(0, i * 8 + 2, 64, 4);
      });
      grateTex.repeat.set(40, 4);
      const deck = new THREE.Mesh(new THREE.RingGeometry(RG, RR, 64, 1), new THREE.MeshStandardMaterial({ map: grateTex, metalness: 0.5, roughness: 0.6, side: THREE.DoubleSide }));
      deck.rotation.x = Math.PI / 2;
      deck.position.y = HL;
      T.add(deck);
      const deckEdge = new THREE.Mesh(new THREE.CylinderGeometry(RR, RR, 0.25, 64, 1, true), ironMat);
      deckEdge.position.y = HL - 0.12;
      T.add(deckEdge);
      const deckUnder = new THREE.Mesh(new THREE.RingGeometry(rExt(HL) - 0.1, RR, 64, 1), ironMat);
      deckUnder.rotation.x = -Math.PI / 2;
      deckUnder.position.y = HL - 0.25;
      T.add(deckUnder);
      // Corbels: iron brackets under the gallery.
      for (let k = 0; k < 24; k++) {
        const phi = (k / 24) * TAU;
        const b = new THREE.Mesh(new THREE.BoxGeometry(RR - rExt(HL) + 0.1, 0.9, 0.12), ironMat);
        b.geometry.translate(0, -0.45, 0);
        const pos = b.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -0.5 && pos.getX(i) > 0) pos.setY(i, -0.12);
        b.position.copy(P(phi, (rExt(HL) + RR) / 2, HL - 0.2));
        b.rotation.y = -phi;
        T.add(b);
      }
      // Lamp room: an iron parapet, the glazing on diagonal bars, a domed
      // roof with a ventilator ball, the door out.
      const gapH = 0.45 / RG;
      const thStart = Math.PI / 2 - PHI_G + gapH;
      const parapet = new THREE.Mesh(new THREE.CylinderGeometry(RG, RG, 0.9, 64, 1, true, thStart, TAU - 2 * gapH), new THREE.MeshStandardMaterial({ color: 0x24302a, metalness: 0.5, roughness: 0.6, side: THREE.DoubleSide }));
      parapet.position.y = HL + 0.45;
      T.add(parapet);
      const glazing = new THREE.Mesh(new THREE.CylinderGeometry(RG, RG, 2.5, 64, 1, true, thStart, TAU - 2 * gapH), glassMat);
      glazing.position.y = HL + 2.15;
      glazing.renderOrder = 3;
      T.add(glazing);
      {
        const bars = [];
        const barGeo = new THREE.BoxGeometry(0.035, 1, 0.035);
        const seg = (a, b) => {
          const mid = a.clone().add(b).multiplyScalar(0.5);
          const g2 = barGeo.clone();
          g2.scale(1, a.distanceTo(b), 1);
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
          g2.applyQuaternion(q);
          g2.translate(mid.x, mid.y, mid.z);
          bars.push(g2);
        };
        const N = 18;
        const y0 = HL + 0.9;
        const y1 = HL + 3.4;
        const twist = TAU / 9;
        for (let k = 0; k < N; k++) {
          for (const dir of [-1, 1]) {
            const a0 = (k / N) * TAU;
            for (let s = 0; s < 3; s++) {
              const pa = a0 + dir * twist * (s / 3);
              const pb = a0 + dir * twist * ((s + 1) / 3);
              const mida = wrapPi((pa + pb) / 2 - PHI_G);
              if (Math.abs(mida) < gapH * 1.6) continue;
              seg(P(pa, RG - 0.01, y0 + (y1 - y0) * (s / 3)), P(pb, RG - 0.01, y0 + (y1 - y0) * ((s + 1) / 3)));
            }
          }
        }
        for (const y of [HL + 0.9, HL + 3.4]) {
          const ring = new THREE.TorusGeometry(RG, 0.04, 4, 64);
          ring.rotateX(Math.PI / 2);
          ring.translate(0, y, 0);
          bars.push(ring);
        }
        // The door frame and the door, standing open outward.
        for (const s of [-1, 1]) {
          const g2 = new THREE.BoxGeometry(0.06, 2.2, 0.08);
          const p = P(PHI_G + s * gapH, RG, HL + 1.1);
          g2.rotateY(faceIn(PHI_G));
          g2.translate(p.x, p.y, p.z);
          bars.push(g2);
        }
        T.add(new THREE.Mesh(mergeGeometries(bars), ironMat));
        const door = new THREE.Group();
        box(door, 0.85, 2.15, 0.05, new THREE.MeshStandardMaterial({ color: 0x24302a, metalness: 0.5, roughness: 0.6 }), 0.42, 1.08, 0);
        box(door, 0.4, 0.6, 0.055, glassMat, 0.42, 1.6, 0);
        door.position.copy(P(PHI_G - gapH, RG + 0.03, HL));
        door.rotation.y = faceOut(PHI_G) - Math.PI / 2 - 1.2;
        T.add(door);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(RG + 0.15, 40, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1c2420, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide }));
        dome.scale.y = 0.42;
        dome.position.y = HL + 3.4;
        T.add(dome);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 10), new THREE.MeshStandardMaterial({ color: 0x1c2420, metalness: 0.5, roughness: 0.4 }));
        ball.position.y = HL + 3.4 + (RG + 0.15) * 0.42 + 0.35;
        T.add(ball);
        box(T, 0.03, 2.2, 0.03, ironMat, 0, ball.position.y + 1.3, 0);
      }
      // The gallery railing.
      {
        const g = [];
        const post = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5);
        post.translate(0, 0.55, 0);
        for (let k = 0; k < 48; k++) {
          const p = P((k / 48) * TAU, RR - 0.06, HL);
          const g2 = post.clone();
          g2.translate(p.x, p.y, p.z);
          g.push(g2);
        }
        for (const y of [0.55, 1.1]) {
          const ring = new THREE.TorusGeometry(RR - 0.06, 0.025, 4, 96);
          ring.rotateX(Math.PI / 2);
          ring.translate(0, HL + y, 0);
          g.push(ring);
        }
        T.add(new THREE.Mesh(mergeGeometries(g), ironMat));
      }

      // ---------- The lens ----------
      // On a fluted iron pedestal with its clockwork, a drum of eight glass
      // panels in a brass frame: two bullseyes, six of prisms. It turns
      // once every twelve seconds, so from out at sea it flashes every six.
      const lens = new THREE.Group();
      lens.position.set(0, HL, 0);
      T.add(lens);
      {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.0, 16), ironMat);
        ped.position.y = 0.5;
        lens.add(ped);
        box(lens, 0.5, 0.35, 0.5, ironMat, 0, 0.35, 0.42);
        for (const [x, r] of [[-0.12, 0.1], [0.1, 0.07]]) {
          const gear = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 12), brass);
          gear.rotation.x = Math.PI / 2;
          gear.position.set(x, 0.38, 0.68);
          lens.add(gear);
        }
      }
      const drum = new THREE.Group();
      drum.position.y = 1.0;
      lens.add(drum);
      const ringsTex = (bulls) => canvasTex(128, 256, (g) => {
        g.fillStyle = "#3a3020";
        g.fillRect(0, 0, 128, 256);
        if (bulls) {
          for (let r = 60; r > 0; r -= 6) {
            g.strokeStyle = `rgba(255, ${200 + r}, ${120 + r}, ${0.4 + (60 - r) / 120})`;
            g.lineWidth = 3;
            g.beginPath();
            g.arc(64, 128, r, 0, TAU);
            g.stroke();
          }
          g.fillStyle = "rgba(255, 240, 200, 0.9)";
          g.beginPath();
          g.arc(64, 128, 8, 0, TAU);
          g.fill();
        }
        for (let y = 0; y < 256; y += 9) {
          if (bulls && y > 60 && y < 196) continue;
          g.fillStyle = `rgba(255, 220, 160, ${0.25 + 0.45 * Math.sin((y / 256) * Math.PI)})`;
          g.fillRect(0, y, 128, 3);
        }
      }, { repeat: false });
      const prismTex = ringsTex(false);
      const bullTex = ringsTex(true);
      const lensMat = (map) => new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffd8a0, emissiveIntensity: 0.9, color: 0xffffff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
      const LR0 = 0.55;
      const panelW = 2 * LR0 * Math.tan(Math.PI / 8);
      const bullNormals = [];
      for (let k = 0; k < 8; k++) {
        const phi = (k / 8) * TAU;
        const bull = k === 0 || k === 4;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(panelW, 1.8), lensMat(bull ? bullTex : prismTex));
        pane.position.copy(P(phi, LR0, 0.9));
        pane.rotation.y = faceOut(phi);
        pane.renderOrder = 4;
        drum.add(pane);
        if (bull) bullNormals.push(phi);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.85, 0.03), brass);
        post.position.copy(P(phi + Math.PI / 8, LR0 / Math.cos(Math.PI / 8), 0.9));
        drum.add(post);
      }
      for (const y of [0, 1.8]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(LR0 / Math.cos(Math.PI / 8), 0.03, 4, 8), brass);
        ring.rotation.set(Math.PI / 2, 0, Math.PI / 8);
        ring.position.y = y;
        drum.add(ring);
      }
      for (const [y, h, top] of [[1.8, 0.45, true], [0, 0.35, false]]) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(LR0 / Math.cos(Math.PI / 8), h, 8, 1, true), lensMat(prismTex));
        cap.position.y = top ? y + h / 2 : y - h / 2;
        if (!top) cap.rotation.x = Math.PI;
        cap.rotation.y = Math.PI / 8;
        drum.add(cap);
      }
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false }));
      flame.position.y = 0.95;
      drum.add(flame);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd090, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
      halo.scale.setScalar(1.6);
      halo.position.y = 0.95;
      drum.add(halo);
      // The beams: long faint cones from the bullseyes, out over the sea,
      // each with a spotlight that lights what it falls on.
      const BEAM_LEN = 420;
      const beamGeo = (() => {
        const geo = new THREE.CylinderGeometry(0.25, 30, BEAM_LEN, 32, 16, true);
        geo.translate(0, BEAM_LEN / 2, 0);
        geo.rotateZ(-Math.PI / 2);
        return geo;
      })();
      // A shaft of light: brightest down its middle from wherever you look
      // (where you see through the most of it), fading along its length and
      // at its edges, a little brighter during lightning.
      const beamMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // Only the far side of the cone, so wherever you look through it
        // you see one sheet of light, not two with a gap between.
        side: THREE.BackSide,
        uniforms: { uLen: { value: BEAM_LEN }, uOpacity: { value: 0.34 } },
        vertexShader: `
          uniform float uLen;
          varying float vF;
          varying vec3 vN;
          varying vec3 vV;
          varying float vD;
          void main() {
            vF = position.x / uLen;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            vD = length(mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform float uOpacity;
          varying float vF;
          varying vec3 vN;
          varying vec3 vV;
          varying float vD;
          void main() {
            float face = abs(dot(normalize(vN), normalize(vV)));
            // Faded close to you, so a beam sweeping past is a glow in the
            // rain rather than a wall.
            float a = pow(1.0 - vF, 2.2) * smoothstep(0.0, 0.015, vF) * pow(face, 2.5) * smoothstep(1.5, 14.0, vD) * uOpacity;
            gl_FragColor = vec4(vec3(1.0, 0.9, 0.72) * a, 1.0);
          }`,
      });
      beamMat.userData.noClip = true;
      const flares = [];
      bullNormals.forEach((phi) => {
        const arm = new THREE.Group();
        arm.rotation.y = -phi;
        arm.position.y = 0.95;
        drum.add(arm);
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.rotation.z = -0.035; // tilted down toward the sea
        arm.add(beam);
        const spot = new THREE.SpotLight(0xffe8c0, 14, 900, 0.075, 0.5, 0);
        arm.add(spot);
        spot.target.position.set(200, -200 * Math.tan(0.05), 0);
        arm.add(spot.target);
        const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff0d0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
        flare.position.set(LR0 + 0.05, 0, 0);
        flare.scale.setScalar(3);
        arm.add(flare);
        flares.push({ flare, phi });
      });

      // ---------- Furnishings ----------
      // At the foot: the keeper's oil and rope, an easel with a photo, a
      // coat and hat by the door.
      const props = new THREE.Group();
      T.add(props);
      const barrel = (x, z, y = 0) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.75, 12), woodMat);
        b.position.set(x, y + 0.375, z);
        props.add(b);
        for (const yy of [0.12, 0.62]) {
          const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 4, 16), ironMat);
          hoop.rotation.x = Math.PI / 2;
          hoop.position.set(x, y + yy, z);
          props.add(hoop);
        }
      };
      const blockers0 = [];
      {
        const p = P(THREE.MathUtils.degToRad(-140), 2.5);
        barrel(p.x, p.z);
        const p2 = P(THREE.MathUtils.degToRad(-150), 2.35);
        barrel(p2.x - 0.1, p2.z - 0.35);
        blockers0.push([p.x, p.z, 0.35], [p2.x - 0.1, p2.z - 0.35, 0.35]);
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 10), new THREE.MeshStandardMaterial({ color: 0x8a2a1a, metalness: 0.4, roughness: 0.6 }));
        const p3 = P(THREE.MathUtils.degToRad(-128), 2.6);
        can.position.set(p3.x, 0.2, p3.z);
        props.add(can);
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16), new THREE.MeshStandardMaterial({ color: 0x8a7650, roughness: 1 }));
        coil.rotation.x = Math.PI / 2;
        const p4 = P(THREE.MathUtils.degToRad(-55), 2.55);
        coil.position.set(p4.x, 0.05, p4.z);
        props.add(coil);
        // Oilskin coat and sou'wester on a peg by the door.
        const p5 = P(THREE.MathUtils.degToRad(-112), RI - 0.08, 1.75);
        box(props, 0.05, 0.05, 0.1, woodMat, p5.x, p5.y, p5.z, faceIn(-1.95));
        const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 1.0, 8, 1), new THREE.MeshStandardMaterial({ color: 0xc8a020, roughness: 0.5 }));
        const p6 = P(THREE.MathUtils.degToRad(-112), RI - 0.2, 1.2);
        coat.position.copy(p6);
        props.add(coat);
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.15, 10), coat.material);
        hat.position.copy(p6).setY(1.85);
        props.add(hat);
        blockers0.push([p6.x, p6.z, 0.25]);
      }
      // Oil lamps on brackets up the wall, each a flame in a glass chimney.
      const sconces = [];
      const lampGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8, 1, true);
      const chimneyMat = new THREE.MeshStandardMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });
      const addSconce = (phi, y) => {
        const p = P(phi, RI - 0.2, y);
        box(props, 0.04, 0.04, 0.22, ironMat, 0, 0, 0, faceIn(phi)).position.copy(P(phi, RI - 0.1, y - 0.12));
        const ch = new THREE.Mesh(lampGeo, chimneyMat);
        ch.position.copy(p);
        props.add(ch);
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), flameMat);
        fl.scale.y = 1.8;
        fl.position.copy(p).setY(y - 0.03);
        props.add(fl);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.06, 8), brass);
        base.position.copy(p).setY(y - 0.12);
        props.add(base);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa850, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
        glow.scale.setScalar(0.7);
        glow.position.copy(p);
        props.add(glow);
        sconces.push({ p, glow, phase: phi * 3.1 });
      };
      addSconce(THREE.MathUtils.degToRad(-70), 2.0);
      for (let k = 0; k < NPH; k++) {
        const th = PH0 + k * PHSTEP + 0.55;
        if (th > TW) continue;
        addSconce(PHI0 + th, stepH(th) + 2.05);
      }
      addSconce(PHI0 + 1.2, HW + 2.0);
      addSconce(PHI0 + 4.2, HW + 2.0);
      // Puddles where the windows leak onto the steps.
      const puddleMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6, depthWrite: false });
      for (let k = 1; k < NPH; k += 3) {
        const th = PH0 + k * PHSTEP + 0.98;
        if (th > TW - 0.8) continue;
        const kk = Math.floor(th / DA);
        const pd = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), puddleMat);
        pd.rotation.x = -Math.PI / 2;
        pd.scale.set(1.4, 0.8, 1);
        pd.position.copy(P(PHI0 + (kk + 0.5) * DA, RI - 0.45, kk * RISE + 0.005));
        pd.renderOrder = 1;
        props.add(pd);
      }
      // Cobwebs in a few corners where the steps meet the wall.
      const webTex = canvasTex(128, 128, (g) => {
        g.strokeStyle = "rgba(230, 230, 230, 0.45)";
        g.lineWidth = 1;
        for (let k = 0; k < 9; k++) {
          const a = (k / 8) * (Math.PI / 2);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 128, Math.sin(a) * 128); g.stroke();
        }
        for (let r = 12; r < 128; r += 14) {
          g.beginPath();
          for (let k = 0; k <= 8; k++) { const a = (k / 8) * (Math.PI / 2); const rr = r + Math.sin(k * 2.3) * 3; k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          g.stroke();
        }
      }, { repeat: false });
      const webMat = new THREE.MeshBasicMaterial({ map: webTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      for (const th of [3.3, 11.1, 19.4, 26.0]) {
        const k = Math.floor(th / DA);
        const web = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), webMat);
        web.position.copy(P(PHI0 + (k + 0.9) * DA, RI - 0.03, k * RISE + 0.25));
        web.rotation.y = faceIn(PHI0 + (k + 0.9) * DA);
        props.add(web);
      }
      // The landing: the keeper's desk over the well with a lamp and the
      // log, a stove, a barometer, a telescope at the window.
      const blockersW = [];
      {
        const dp = P(PHI0 + 0.9, 1.0, HW);
        const desk = new THREE.Group();
        box(desk, 1.0, 0.05, 0.55, woodMat, 0, 0.75, 0);
        for (const [x, z] of [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]]) box(desk, 0.05, 0.75, 0.05, woodMat, x, 0.375, z);
        box(desk, 0.3, 0.04, 0.22, new THREE.MeshStandardMaterial({ color: 0x5a2a1a, roughness: 0.8 }), -0.15, 0.79, 0);
        box(desk, 0.28, 0.005, 0.2, new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.9 }), -0.15, 0.815, 0);
        const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 10), brass);
        lampBase.position.set(0.32, 0.83, 0.05);
        desk.add(lampBase);
        const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 10, 1, true), chimneyMat);
        lampGlass.position.set(0.32, 0.99, 0.05);
        desk.add(lampGlass);
        const lampFlame = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), flameMat);
        lampFlame.scale.y = 1.8;
        lampFlame.position.set(0.32, 0.96, 0.05);
        desk.add(lampFlame);
        desk.position.copy(dp);
        desk.rotation.y = -(PHI0 + 0.9) + Math.PI / 2;
        T.add(desk);
        deskLight.position.copy(dp).setY(HW + 1.1);
        blockersW.push([dp.x, dp.z, 0.5]);
        // The stove on the floor over the well, its door glowing.
        const sp = P(THREE.MathUtils.degToRad(-100), 0.85, HW);
        const stove = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.7, 12), ironMat);
        body.position.y = 0.45;
        stove.add(body);
        box(stove, 0.16, 0.12, 0.02, new THREE.MeshBasicMaterial({ color: 0xff7a30, toneMapped: false }), 0, 0.35, -0.27);
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), ironMat);
        pipe.position.y = 1.85;
        stove.add(pipe);
        const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a30, metalness: 0.8, roughness: 0.35 }));
        kettle.scale.y = 0.8;
        kettle.position.set(0.05, 0.86, 0);
        stove.add(kettle);
        stove.position.copy(sp);
        stove.rotation.y = faceOut(THREE.MathUtils.degToRad(-100)) + Math.PI;
        T.add(stove);
        blockersW.push([sp.x, sp.z, 0.45]);
        // Barometer on the wall.
        const bp = P(PHI0 + 0.25, RI - 0.04, HW + 1.55);
        const baro = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 20), woodMat);
        baro.rotation.x = Math.PI / 2;
        baro.rotation.z = 0;
        baro.position.copy(bp);
        baro.lookAt(new THREE.Vector3(0, HW + 1.55, 0));
        baro.rotateX(Math.PI / 2);
        T.add(baro);
      }

      // ---------- Photos ----------
      // The shore at the foot, the sea and its birds up the stair, the night
      // sky at the top.
      const base = ["3", "Cruise-5", "Cruise-10"];
      const climb = ["DSC05025", "DSC04972", "Cruise-11", "Cruise-12", "Cruise-6", "DSC05238", "DSC05512", "DSC04824", "2", "4", "DSC05429", "4-alt", "5-alt", "2-alt", "DSC06060"];
      const top = ["DSC06067", "DSC06051", "DSC06058", "DSC06061", "DSC06052"];
      const hang = (stem, phi, y, long = 0.75, rOff = 0.04) => {
        if (!PHOTO[stem]) return;
        const piece = R.photo(stem, { long, frame: 0x2a2420, border: 0.035, depth: 0.03, label: "card", labelSide: 0, labelWidth: 0.34 });
        piece.position.copy(P(phi, RI - rOff - 0.02, y));
        piece.rotation.y = faceIn(phi);
        T.add(piece);
      };
      hang(base[0], THREE.MathUtils.degToRad(-128), 1.45, 0.8);
      hang(base[1], THREE.MathUtils.degToRad(-55), 1.45, 0.8);
      // The third on an easel in the middle, facing the door.
      {
        const easel = new THREE.Group();
        for (const s of [-1, 1]) {
          const leg = box(easel, 0.04, 1.7, 0.04, woodMat, s * 0.32, 0.85, 0);
          leg.rotation.z = -s * 0.12;
        }
        const back = box(easel, 0.04, 1.7, 0.04, woodMat, 0, 0.82, 0.35);
        back.rotation.x = -0.25;
        box(easel, 0.8, 0.04, 0.08, woodMat, 0, 0.95, -0.04);
        const piece = R.photo(base[2], { long: 0.8, frame: 0x2a2420, border: 0.035, depth: 0.03, label: "card", labelSide: 0, labelWidth: 0.34 });
        piece.position.set(0, 1.28, -0.05);
        piece.rotation.x = -0.1;
        easel.add(piece);
        easel.position.set(-0.75, 0, -0.55);
        easel.rotation.y = Math.PI + 0.35;
        T.add(easel);
        blockers0.push([-0.75, -0.45, 0.45]);
      }
      climb.forEach((stem, k) => {
        const th = PH0 + k * PHSTEP;
        if (th > TW - 0.3) return;
        hang(stem, PHI0 + th, stepH(th) + 1.45);
      });
      // At the top: the best of the night skies, Falling Stars biggest, on
      // the landing wall and across the stairwell.
      hang(top[0], PHI0 + 0.55, HW + 1.55, 1.05);
      top.slice(1).forEach((stem, k) => hang(stem, PHI0 + LANDING + 0.55 + k * 1.05, HW + 1.55, 0.8));

      // The keeper, at the desk with the log.
      const people = [];
      {
        const kp = P(PHI0 + 0.9, 0.55, HW);
        const look = { height: 1.0, build: 1.15, skin: 1, hair: ["beanie", 0x1c2a40], beard: 0xb8b0a0, top: 0x1c2a44, sleeves: "long", legs: 0x2a2a30, shoes: 0x1a1410 };
        const keeper = placePerson(R, look, { x: kp.x, z: kp.z + ZC, y: HW }, "Reading", { x: Math.cos(PHI0 + 0.9) * 2, z: ZC + Math.sin(PHI0 + 0.9) * 2 }, { phase: 1.2, glance: 0.02 });
        keeper.focus = null;
        people.push(keeper);
        blockersW.push([kp.x, kp.z, 0.3]);
        // A chair under him.
        const ch = new THREE.Group();
        box(ch, 0.42, 0.04, 0.42, woodMat, 0, 0.44, 0);
        box(ch, 0.42, 0.45, 0.04, woodMat, 0, 0.68, -0.2);
        for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(ch, 0.035, 0.44, 0.035, woodMat, x, 0.22, z);
        ch.position.copy(kp).add(new THREE.Vector3(0, HW, 0)).setY(HW);
        ch.rotation.y = -(PHI0 + 0.9) + Math.PI / 2;
        T.add(ch);
      }

      mergeStatic(props);

      // ---------- Outside ----------
      // The headland: a shelf of rock round the tower, falling in broken
      // cliffs to the sea.
      {
        const rings = D < 0.5 ? 30 : 46;
        const segs = D < 0.5 ? 64 : 96;
        const r = rng(1301);
        const jag = Array.from({ length: segs }, () => r());
        const pos = [];
        const heightAt = (rad, a, k) => {
          const n = jag[k % segs] * 0.6 + jag[(k * 7 + 3) % segs] * 0.4;
          const edge = 9 + n * 9;
          let h = rad < 4.6 ? -0.02 : -0.05 - Math.max(0, rad - 4.6) * 0.06;
          if (rad > edge) h -= 15 * THREE.MathUtils.smoothstep(rad, edge, edge + 6 + n * 6);
          h += Math.sin(rad * 1.7 + k) * 0.25 * Math.min(1, rad / 10);
          // Out of the way of the passage in from the door.
          const x = Math.cos(a) * rad;
          const z = Math.sin(a) * rad + ZC;
          if (z < 1.2 && Math.abs(x) < 2.6) h = Math.min(h, -3);
          return h;
        };
        const ringR = (i) => 3.9 + Math.pow(i / rings, 1.5) * 70;
        for (let i = 0; i < rings; i++) {
          for (let k = 0; k < segs; k++) {
            const a0 = (k / segs) * TAU;
            const a1 = ((k + 1) / segs) * TAU;
            const r0 = ringR(i);
            const r1 = ringR(i + 1);
            const v = (rr, a, kk) => [Math.cos(a) * rr, heightAt(rr, a, kk), Math.sin(a) * rr];
            const A = v(r0, a0, k), B = v(r0, a1, k + 1), C = v(r1, a1, k + 1), Dd = v(r1, a0, k);
            pos.push(...A, ...B, ...C, ...A, ...C, ...Dd);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.computeVertexNormals();
        const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x3a3c3e, roughness: 0.7, metalness: 0.05, flatShading: true }));
        T.add(rock);
        // Boulders at the foot of the cliffs.
        const bg = new THREE.IcosahedronGeometry(1, 0);
        const bm = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: 0x2e3032, roughness: 0.55, flatShading: true }), 60);
        const m4 = new THREE.Matrix4();
        for (let i = 0; i < 60; i++) {
          const a = r() * TAU;
          const rad = 22 + r() * 22;
          const s = 1.5 + r() * 4;
          m4.makeRotationY(r() * 6).scale(new THREE.Vector3(s, s * (0.6 + r() * 0.6), s)).setPosition(Math.cos(a) * rad, SEA - 0.5 + r(), Math.sin(a) * rad);
          bm.setMatrixAt(i, m4);
        }
        T.add(bm);
      }
      // The keeper's cottage beside the tower, one window lit.
      {
        const c = new THREE.Group();
        const wall = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xb0aa9c, roughness: 0.9 });
        box(c, 6, 3, 4, wall, 0, 1.5, 0);
        const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 3.2, 6.6, 3, 1), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6 }));
        roof.rotation.z = Math.PI / 2;
        roof.scale.set(1, 1, 0.75);
        roof.position.y = 3.0 + 1.0;
        c.add(roof);
        box(c, 0.9, 0.9, 0.05, new THREE.MeshBasicMaterial({ color: 0xffb860, toneMapped: false }), 1.2, 1.6, 2.01);
        box(c, 0.9, 0.9, 0.05, new THREE.MeshBasicMaterial({ color: 0x1a1a1c }), -1.4, 1.6, 2.01);
        box(c, 0.6, 1.6, 0.6, wall, 2.4, 4.6, 0);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
        glow.scale.setScalar(3);
        glow.position.set(1.2, 1.6, 2.3);
        c.add(glow);
        c.position.set(-9.5, -0.6, 3.5);
        c.rotation.y = 0.5;
        T.add(c);
      }
      // The sea: big storm swells, foam on their crests and round the rocks.
      const seaUniforms = { uTime: { value: 0 }, uFlash: { value: 0 } };
      const sea = (() => {
        const n = D < 0.5 ? 120 : 200;
        const geo = new THREE.PlaneGeometry(1800, 1800, n, n);
        geo.rotateX(-Math.PI / 2);
        // Bunch the vertices toward the middle, where you look most closely,
        // and lay the texture by position so it doesn't stretch.
        const pos = geo.attributes.position;
        const uv = geo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const f = (v) => Math.sign(v) * Math.pow(Math.abs(v) / 900, 1.8) * 900;
          const x = f(pos.getX(i));
          const z = f(pos.getZ(i));
          pos.setXYZ(i, x, 0, z);
          uv.setXY(i, x / 1800 + 0.5, z / 1800 + 0.5);
        }
        // Ripples: a tile of noise turned into a normal map.
        const rippleTex = (() => {
          const N = 128;
          const r = rng(1341);
          const h = new Float32Array(N * N);
          for (let oct = 0; oct < 4; oct++) {
            const cells = 4 << oct;
            const grid = Array.from({ length: cells * cells }, () => r());
            for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
              const gx = (x / N) * cells;
              const gy = (y / N) * cells;
              const x0 = Math.floor(gx), y0 = Math.floor(gy);
              const fx = gx - x0, fy = gy - y0;
              const g = (i, j) => grid[((j + cells) % cells) * cells + ((i + cells) % cells)];
              const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
              const v = (g(x0, y0) * (1 - sx) + g(x0 + 1, y0) * sx) * (1 - sy) + (g(x0, y0 + 1) * (1 - sx) + g(x0 + 1, y0 + 1) * sx) * sy;
              h[y * N + x] += v / (1 << oct);
            }
          }
          return canvasTex(N, N, (g) => {
            const img = g.createImageData(N, N);
            for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
              const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)];
              const dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
              const nx = -dx * 3, ny = -dy * 3, nz = 1;
              const l = Math.hypot(nx, ny, nz);
              const o = (y * N + x) * 4;
              img.data[o] = (nx / l * 0.5 + 0.5) * 255;
              img.data[o + 1] = (ny / l * 0.5 + 0.5) * 255;
              img.data[o + 2] = (nz / l * 0.5 + 0.5) * 255;
              img.data[o + 3] = 255;
            }
            g.putImageData(img, 0, 0);
          }, { srgb: false });
        })();
        rippleTex.repeat.set(1800 / 14, 1800 / 14);
        const mat = new THREE.MeshStandardMaterial({ color: 0x0a1418, roughness: 0.22, metalness: 0.15, normalMap: rippleTex, normalScale: new THREE.Vector2(0.7, 0.7) });
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uTime = seaUniforms.uTime;
          sh.uniforms.uFlash = seaUniforms.uFlash;
          const waves = `
            uniform float uTime;
            varying vec2 vXZ;
            varying float vH;
            const vec4 WD[3] = vec4[3](vec4(0.8, 0.6, 64.0, 1.7), vec4(0.95, -0.3, 35.0, 0.9), vec4(0.45, 0.89, 22.0, 0.5));
            float seaH(vec2 p, out vec2 grad) {
              float h = 0.0;
              grad = vec2(0.0);
              for (int i = 0; i < 3; i++) {
                vec2 d = normalize(WD[i].xy);
                float k = 6.2831853 / WD[i].z;
                float w = sqrt(9.81 * k);
                float ph = k * dot(d, p) - w * uTime + float(i) * 1.7;
                float a = WD[i].w;
                float s = sin(ph);
                float c = cos(ph);
                // Sharper crests and flatter troughs than a plain sine.
                h += a * (s + 0.25 * (1.0 - c * c) - 0.125);
                grad += a * k * d * (c + 0.5 * s * c);
              }
              return h;
            }
          `;
          sh.vertexShader = waves + sh.vertexShader
            .replace("#include <beginnormal_vertex>", `
              vec2 sgrad;
              float seaY = seaH(position.xz, sgrad);
              vec3 objectNormal = normalize(vec3(-sgrad.x, 1.0, -sgrad.y));
              #ifdef USE_TANGENT
                vec3 objectTangent = vec3(1.0, 0.0, 0.0);
              #endif
            `)
            .replace("#include <begin_vertex>", `
              vec3 transformed = vec3(position.x, seaY, position.z);
              vXZ = position.xz;
              vH = seaY;
            `);
          sh.fragmentShader = `
            uniform float uFlash;
            uniform float uTime;
            varying vec2 vXZ;
            varying float vH;
            float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float vnoise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
            }
            float fbm(vec2 p) {
              float v = 0.0;
              float a = 0.5;
              for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
              return v;
            }
          ` + sh.fragmentShader
            .replace("#include <color_fragment>", `
              #include <color_fragment>
              // Foam: torn streaks on the crests, blown downwind, and a band
              // of white water churning round the rocks.
              vec2 fp = vec2(vXZ.x * 0.9 + vXZ.y * 0.4, vXZ.y * 0.9 - vXZ.x * 0.4);
              float streak = fbm(fp * vec2(0.08, 0.32) + vec2(uTime * 0.05, 0.0));
              float crest = smoothstep(0.55, 1.0, vH / 2.4 + streak * 0.55);
              float d = length(vXZ);
              float churn = (1.0 - smoothstep(18.0, 52.0, d)) * smoothstep(0.35, 0.75, fbm(vXZ * 0.12 + vec2(uTime * 0.12, uTime * 0.07)));
              float foam = clamp(crest * 0.9 + churn, 0.0, 1.0);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.58, 0.6), foam * 0.8);
            `)
            .replace("#include <emissivemap_fragment>", `
              #include <emissivemap_fragment>
              totalEmissiveRadiance += vec3(0.3, 0.36, 0.46) * uFlash * (0.15 + foam * 0.8);
            `);
        };
        mat.customProgramCacheKey = () => "lighthouse-sea-2";
        const m = new THREE.Mesh(geo, mat);
        m.position.y = SEA;
        m.frustumCulled = false;
        T.add(m);
        return m;
      })();
      void sea;
      // Spray bursting over the rocks when a big wave hits.
      const spray = (() => {
        const N = D < 0.5 ? 500 : 1200;
        const pos = new Float32Array(N * 3);
        const vel = new Float32Array(N * 3);
        const life = new Float32Array(N).fill(99);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xc8d2d8, size: 0.55, transparent: true, opacity: 0.55, depthWrite: false }));
        p.frustumCulled = false;
        T.add(p);
        const sites = [];
        const r = rng(1311);
        for (let i = 0; i < 7; i++) { const a = r() * TAU; sites.push({ a, rad: 19 + r() * 9, next: 1 + r() * 8 }); }
        return { p, pos, vel, life, N, sites, cursor: 0 };
      })();
      // A ship far out, riding the swell with its lights on.
      const ship = (() => {
        const g = new THREE.Group();
        const hull = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.8 });
        box(g, 60, 6, 10, hull, 0, 2, 0);
        box(g, 10, 8, 9, hull, -20, 8, 0);
        box(g, 2, 10, 2, hull, -18, 16, 0);
        const pts = [];
        const cols = [];
        const light = (x, y, z, c) => { pts.push(x, y, z); cols.push(...new THREE.Color(c).toArray()); };
        light(-20, 22, 0, 0xffffff);
        light(25, 12, 0, 0xffffff);
        light(-25, 10, -5, 0xff2a20);
        light(-25, 10, 5, 0x30ff60);
        for (let i = 0; i < 9; i++) light(-24 + (i % 3) * 3, 6 + Math.floor(i / 3) * 2.2, -4.6, 0xffd090);
        for (let i = 0; i < 6; i++) light(-10 + i * 6, 5.5, -5.1, 0xffc070);
        const lg = new THREE.BufferGeometry();
        lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        lg.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
        g.add(new THREE.Points(lg, new THREE.PointsMaterial({ map: glowTex, vertexColors: true, size: 5, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
        g.position.set(-150, SEA, 520);
        g.rotation.y = 0.3;
        T.add(g);
        return g;
      })();
      // The sky: low, heavy cloud, lit up by the lightning.
      const skyGroup = new THREE.Group();
      const dome = skyDome({ top: 0x07090c, mid: 0x12161c, low: 0x1c2228, sunDir: new THREE.Vector3(0.3, 0.1, 1), glow: [0.1, 0.12, 0.15], tight: 8, spread: 3, glowAmt: [0.05, 0.02] });
      skyGroup.add(dome);
      const domeBase = { top: dome.material.uniforms.top.value.clone(), mid: dome.material.uniforms.mid.value.clone(), low: dome.material.uniforms.low.value.clone() };
      const cloudTex = canvasTex(512, 512, (g) => {
        const r = rng(1321);
        for (let i = 0; i < 180; i++) {
          const x = r() * 512;
          const y = r() * 512;
          const rad = 20 + r() * 70;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, `rgba(255, 255, 255, ${0.15 + r() * 0.2})`);
          blob.addColorStop(1, "rgba(255, 255, 255, 0)");
          g.fillStyle = blob;
          for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) g.fillRect(x - rad + dx, y - rad + dy, rad * 2, rad * 2);
        }
      });
      cloudTex.repeat.set(3, 3);
      const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, color: 0x2a3038, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const clouds = new THREE.Mesh(new THREE.CircleGeometry(1400, 48), cloudMat);
      clouds.rotation.x = Math.PI / 2;
      clouds.position.y = 160;
      skyGroup.add(clouds);
      R.add(skyGroup);
      // Lightning: a jagged bolt somewhere out over the sea, the sky and sea
      // flashing with it, and the thunder after it as far behind as the
      // strike is far away.
      const bolt = (() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
        const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0, fog: false }));
        l.frustumCulled = false;
        T.add(l);
        return l;
      })();
      const storm = { next: 4, flash: 0, flashes: [], ex: 0, strikes: [], crashes: [], wind: 0 };
      function strike(t) {
        const r = Math.random;
        const a = r() * TAU;
        const dist = 350 + r() * 900;
        const x = Math.cos(a) * dist;
        const z = Math.sin(a) * dist;
        const pos = bolt.geometry.attributes.position;
        let px = x;
        let pz = z;
        for (let i = 0; i < 60; i++) {
          const y = 160 - (i / 59) * (160 - SEA);
          px += (r() - 0.5) * 14;
          pz += (r() - 0.5) * 14;
          pos.setXYZ(i, px, y, pz);
        }
        pos.needsUpdate = true;
        // A few flickers in quick succession.
        storm.flashes = [0, 0.09, 0.2, 0.34].slice(0, 2 + Math.floor(r() * 3)).map((d) => t + d);
        storm.strikes.push({ at: t, dist });
        storm.next = t + 6 + r() * 12;
      }
      // Rain: streaks blown slanting past, everywhere outside but never
      // inside the tower or the lamp room.
      const rain = (() => {
        const N = D < 0.5 ? 1400 : 3200;
        const base = new Float32Array(N * 2 * 3);
        const end = new Float32Array(N * 2);
        const r = rng(1331);
        for (let i = 0; i < N; i++) {
          const x = (r() - 0.5) * 40;
          const y = r() * 30;
          const z = (r() - 0.5) * 40;
          base.set([x, y, z, x, y, z], i * 6);
          end[i * 2] = 0;
          end[i * 2 + 1] = 1;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(base, 3));
        g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
        const m = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFlash: { value: 0 }, uHL: { value: HL }, uBeam: { value: 0 } },
          vertexShader: `
            uniform float uTime;
            uniform vec3 uCam;
            uniform float uHL;
            uniform float uBeam;
            attribute float aEnd;
            varying float vKeep;
            varying float vEnd;
            varying float vLit;
            void main() {
              vec3 p = position;
              float fall = 14.0;
              vec3 wind = vec3(-6.0, 0.0, 3.5);
              p.y = mod(p.y - uTime * fall - uCam.y, 30.0) - 15.0 + uCam.y;
              p.x = mod(p.x + uTime * wind.x - uCam.x + 20.0, 40.0) - 20.0 + uCam.x;
              p.z = mod(p.z + uTime * wind.z - uCam.z + 20.0, 40.0) - 20.0 + uCam.z;
              p += vec3(wind.x, -fall, wind.z) * 0.045 * aEnd;
              // Not inside the tower, the lamp room, or the way in.
              float rr = length(p.xz);
              float rex = p.y < uHL ? 4.05 - 0.6 * clamp(p.y / uHL, 0.0, 1.0) : 3.65;
              vKeep = (rr < rex && p.y < uHL + 5.0) || (p.z < -2.8 && abs(p.x) < 3.0 && p.y < 4.0) ? 0.0 : 1.0;
              vEnd = aEnd;
              // Caught in one of the beams: they point along uBeam and
              // uBeam + pi from the lens.
              vec3 q = p - vec3(0.0, uHL + 1.95, 0.0);
              float along = length(q.xz);
              float ang = atan(q.z, q.x);
              float off = abs(mod(ang - uBeam + 3.14159265, 3.14159265) - 1.5707963);
              float spread = 0.075 + 0.6 / max(along, 1.0);
              vLit = (1.0 - smoothstep(spread * 0.6, spread, 1.5707963 - off)) * smoothstep(-2.0, 1.0, -abs(q.y + along * 0.035) + along * 0.075 + 0.3);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }`,
          fragmentShader: `
            uniform float uFlash;
            varying float vKeep;
            varying float vEnd;
            varying float vLit;
            void main() {
              if (vKeep < 0.5) discard;
              vec3 c = vec3(0.62, 0.68, 0.76) + uFlash * 0.5 + vec3(1.0, 0.9, 0.7) * vLit * 1.2;
              gl_FragColor = vec4(c, (0.18 + uFlash * 0.25 + vLit * 0.5) * (0.3 + 0.7 * vEnd));
            }`,
        });
        m.userData.noClip = true;
        const lines = new THREE.LineSegments(g, m);
        lines.frustumCulled = false;
        T.add(lines);
        return lines;
      })();

      // ---------- Where you can walk ----------
      // Lines on the floor plan and round blockers, for whichever level
      // you're on, in the room's own coordinates.
      const walls = [];
      const blockers = [];
      const W = (x0, z0, x1, z1) => walls.push([x0, z0 + ZC, x1, z1 + ZC]);
      const arc = (r, a0, a1, n = 0) => {
        const segs = n || Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.12));
        for (let k = 0; k < segs; k++) {
          const a = a0 + ((a1 - a0) * k) / segs;
          const b = a0 + ((a1 - a0) * (k + 1)) / segs;
          W(Math.cos(a) * r, Math.sin(a) * r, Math.cos(b) * r, Math.sin(b) * r);
        }
      };
      const radial = (phi, r0, r1) => W(Math.cos(phi) * r0, Math.sin(phi) * r0, Math.cos(phi) * r1, Math.sin(phi) * r1);
      const lad = (s0, n0, s1, n1) => { const a = fromLadder(s0, n0); const b = fromLadder(s1, n1); W(a.x, a.z, b.x, b.z); };
      const B = (list) => { for (const [x, z, r] of list) blockers.push({ x, z: z + ZC, r }); };
      const doorHalf = Math.asin(0.8 / RI);
      function rebuild() {
        walls.length = 0;
        blockers.length = 0;
        const m = S.mode;
        if (m === "ground") {
          arc(RI, DOOR_PHI + doorHalf, DOOR_PHI - doorHalf + TAU);
          const zIn = -Math.sqrt(RI * RI - 0.64);
          W(-0.8, zIn, -0.8, -ZC - 0.3);
          W(0.8, zIn, 0.8, -ZC - 0.3);
          arc(RW, PHI0 + 0.5, PHI0 + UNDER);
          radial(PHI0 + UNDER, RW, RI);
          B(blockers0);
        } else if (m === "stair") {
          arc(RI, 0, TAU);
          if (S.theta < 1.2) arc(RW, PHI0 + 0.5, PHI0 + TAU);
          else arc(RW, 0, TAU);
        } else if (m === "watch") {
          arc(RI, 0, TAU);
          arc(RW, PHI0 + LANDING, PHI0 + TAU);
          radial(PHI0 + LANDING, RW, RI);
          lad(-LS + 0.3, -LWID, LS, -LWID);
          lad(-LS + 0.3, LWID, LS, LWID);
          B(blockersW);
        } else {
          arc(RG, PHI_G + gapH, PHI_G - gapH + TAU);
          arc(RR - 0.06, 0, TAU);
          blockers.push({ x: 0, z: ZC, r: 0.6 });
          lad(HATCH, -LWID, LS, -LWID);
          lad(HATCH, LWID, LS, LWID);
          lad(HATCH, -LWID, HATCH, LWID);
          // The door frame's posts.
          for (const s of [-1, 1]) { const p = P(PHI_G + s * gapH, RG); blockers.push({ x: p.x, z: p.z + ZC, r: 0.06 }); }
        }
        S.changed = false;
      }
      rebuild();

      // How high the floor is where you stand, and which level you're on.
      function floor(lx, lz) {
        const x = lx;
        const z = lz - ZC;
        const r = Math.hypot(x, z);
        const phi = Math.atan2(z, x);
        const pend = S.pending;
        if (pend) {
          if (Math.hypot(lx - pend.x, lz - pend.z) < 0.6) { S.mode = pend.mode; S.theta = pend.theta; S.prevPhi = phi; S.changed = true; }
          if (Math.hypot(lx - pend.x, lz - pend.z) < 0.6 || performance.now() - pend.at > 3000) S.pending = null;
        }
        // Coming in at the door always puts you on the ground.
        if (z < -RI + 0.15 && Math.abs(x) < 1.2 && S.mode !== "ground") { S.mode = "ground"; S.changed = true; }
        const before = S.mode;
        const a = rel(phi);
        const L = ladder(x, z);
        const onLadder = Math.abs(L.s) <= LS && Math.abs(L.n) <= LWID;
        if (S.mode === "ground") {
          if (r > RW + 0.02 && a < 0.5) { S.mode = "stair"; S.theta = a; }
        } else if (S.mode === "stair") {
          S.theta += wrapPi(phi - S.prevPhi);
          if (S.theta < 0 || (S.theta < 0.5 && r < RW - 0.02)) S.mode = "ground";
          else if (S.theta >= TW) S.mode = "watch";
        } else if (S.mode === "watch") {
          if (r > RW + 0.02 && a > TAU - 0.6 && !onLadder) { S.mode = "stair"; S.theta = TW - (TAU - a); }
          // At the top of the steep stair, or just stepped off its end while
          // high on it (a slow frame can carry you past the last tread).
          else if ((onLadder && L.s > LS - 0.1) || (!onLadder && lastFloor > HW + 1.5 && L.s > 0)) S.mode = "top";
        } else if (S.mode === "top") {
          if (onLadder && L.s >= HATCH && L.s < LS - 0.1) S.mode = "watch";
        }
        S.prevPhi = phi;
        if (S.mode !== before) S.changed = true;
        if (S.changed) rebuild();
        if (S.mode === "ground") return 0;
        if (S.mode === "stair") return stepH(Math.min(S.theta, TW - 0.001));
        if (S.mode === "watch") return onLadder ? rampH(L.s) : HW;
        return onLadder && L.s >= HATCH ? rampH(L.s) : HL;
      }

      // ---------- Every frame ----------
      const toCam = new THREE.Vector3();
      const camT = new THREE.Vector3();
      const motionState = { gust: 0 };
      let lastSconces = -1;
      const api = {
        floor,
        walls,
        blockers,
        people,
        noShove: true,
        storm,
        debug: { drum, state: S, LH },
        ground(lx, lz) {
          if (S.mode === "watch") return "wood";
          if (S.mode === "top") return Math.hypot(lx, lz - ZC) > RG ? "gravel" : "tile";
          return "concrete";
        },
        pace() { return S.mode === "stair" ? 0.85 : 1; },
        cameraFx(t) {
          // Out on the gallery the wind shoves you about.
          const out = S.mode === "top" && Math.hypot(R.player.x, R.player.z - ZC) > RG;
          const k = out ? 1 : 0;
          const g = motionState.gust;
          return { x: k * (Math.sin(t * 2.3) * 0.02 + Math.sin(t * 5.1) * 0.01) * (0.5 + g), y: 0, roll: k * Math.sin(t * 1.7) * 0.012 * (0.5 + g) };
        },
        update(t, dt) {
          const you = R.player;
          const yz = you.z - ZC;
          const yr = Math.hypot(you.x, yz);
          const camY = LH_floorY();
          // How exposed you are to the storm: shut in at the foot, more so
          // up high, wide open on the gallery.
          const outside = S.mode === "top" && yr > RG;
          const exTarget = outside ? 1 : S.mode === "top" ? 0.55 : S.mode === "watch" ? 0.3 : Math.min(0.25, camY / HW * 0.25);
          storm.ex += (exTarget - storm.ex) * Math.min(1, dt * 3);
          motionState.gust = 0.5 + 0.5 * Math.sin(t * 0.37) * Math.sin(t * 0.11 + 2);
          storm.wind = motionState.gust;

          // The lens turns; a bullseye facing you flares.
          drum.rotation.y = (t / 12) * TAU;
          camT.set(you.x, camY + 1.62, yz);
          for (const f of flares) {
            const a = f.phi - drum.rotation.y;
            toCam.copy(camT).sub(new THREE.Vector3(0, HL + 1.95, 0)).normalize();
            const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
            const d = Math.max(0, n.dot(toCam));
            const k = Math.pow(d, 40);
            f.flare.material.opacity = k * (yr > 1 ? 0.9 : 0);
            f.flare.scale.setScalar(0.8 + k * 2.2);
          }
          flame.scale.setScalar(1 + Math.sin(t * 13) * 0.03);

          // The three nearest lamps light the stair round you.
          const nearest = sconces.map((sc, i) => ({ i, d: Math.hypot(sc.p.x - you.x, (sc.p.y - camY - 1.5) * 1.5, sc.p.z - yz) })).sort((a, b) => a.d - b.d);
          const key = nearest.slice(0, sconceLights.length).map((n) => n.i).join(",");
          if (key !== lastSconces) {
            lastSconces = key;
            sconceLights.forEach((l, k) => l.position.copy(sconces[nearest[k].i].p).add(new THREE.Vector3(0, 0.05, 0)));
          }
          for (const sc of sconces) sc.glow.material.opacity = 0.45 + Math.sin(t * 9 + sc.phase) * 0.05 + Math.sin(t * 23 + sc.phase) * 0.03;
          sconceLights.forEach((l, k) => { l.intensity = 3.2 * (0.92 + Math.sin(t * 11 + k * 2) * 0.05 + Math.sin(t * 27 + k) * 0.03); });
          deskLight.intensity = 2.6 * (0.93 + Math.sin(t * 10) * 0.05);

          // Lightning.
          if (t > storm.next) strike(t);
          let fl = 0;
          for (const ft of storm.flashes) { const d = t - ft; if (d >= 0 && d < 0.12) fl = Math.max(fl, 1 - d / 0.12); }
          storm.flash += (fl - storm.flash) * Math.min(1, dt * 40);
          const f = storm.flash;
          bolt.material.opacity = f > 0.3 ? 1 : 0;
          hemi.intensity = 0.55 + f * 2.2;
          hemi.color.setHex(0x4a5468).lerp(new THREE.Color(0xc8d8ff), f);
          sky.intensity = 0.18 + f * 2.5;
          seaUniforms.uFlash.value = f;
          rain.material.uniforms.uFlash.value = f;
          winGlassMat.emissive.setRGB(0.5 * f, 0.55 * f, 0.7 * f);
          dome.material.uniforms.top.value.copy(domeBase.top).lerp(new THREE.Color(0x8a9ab8), f * 0.8);
          dome.material.uniforms.mid.value.copy(domeBase.mid).lerp(new THREE.Color(0xa8b8d0), f * 0.8);
          dome.material.uniforms.low.value.copy(domeBase.low).lerp(new THREE.Color(0x8a98a8), f * 0.6);
          cloudMat.color.setHex(0x2a3038).lerp(new THREE.Color(0xb8c4dc), f);

          // Sea, rain, clouds, glass.
          seaUniforms.uTime.value = t;
          sea.material.normalMap.offset.set((t * 0.011) % 1, (t * 0.006) % 1);
          rain.material.uniforms.uTime.value = t;
          // The beams' direction in the tower's frame: the bullseyes face
          // drum angles 0 and pi.
          rain.material.uniforms.uBeam.value = -drum.rotation.y;
          rain.material.uniforms.uCam.value.set(you.x, camY + 1.62, yz);
          cloudTex.offset.x = (t * 0.004) % 1;
          cloudTex.offset.y = (t * 0.0025) % 1;
          rainGlassTex.offset.y = (t * 0.12) % 1;
          skyGroup.position.copy(R.camLocal);

          // Waves bursting on the rocks.
          for (const site of spray.sites) {
            if (t < site.next) continue;
            site.next = t + 4 + Math.random() * 9;
            const big = 0.6 + Math.random() * 0.8;
            storm.crashes.push({ at: t, big, x: Math.cos(site.a) * site.rad, z: Math.sin(site.a) * site.rad });
            for (let k = 0; k < (D < 0.5 ? 60 : 140); k++) {
              const i = spray.cursor;
              spray.cursor = (spray.cursor + 1) % spray.N;
              const spread = (Math.random() - 0.5) * 9;
              spray.pos.set([Math.cos(site.a) * site.rad - Math.sin(site.a) * spread, SEA + 0.5 + Math.random(), Math.sin(site.a) * site.rad + Math.cos(site.a) * spread], i * 3);
              const out = new THREE.Vector2(Math.cos(site.a), Math.sin(site.a));
              spray.vel.set([-out.x * Math.random() * 4 + (Math.random() - 0.5) * 3, (8 + Math.random() * 10) * big, -out.y * Math.random() * 4 + (Math.random() - 0.5) * 3], i * 3);
              spray.life[i] = 0;
            }
          }
          for (let i = 0; i < spray.N; i++) {
            if (spray.life[i] > 2.6) { spray.pos[i * 3 + 1] = -999; continue; }
            spray.life[i] += dt;
            spray.vel[i * 3 + 1] -= 9.81 * dt;
            spray.vel[i * 3] += -6 * dt * 0.2;
            spray.pos[i * 3] += spray.vel[i * 3] * dt;
            spray.pos[i * 3 + 1] += spray.vel[i * 3 + 1] * dt;
            spray.pos[i * 3 + 2] += spray.vel[i * 3 + 2] * dt;
          }
          spray.p.geometry.attributes.position.needsUpdate = true;

          // The ship rides the swell and creeps along.
          ship.position.x = -150 + ((t * 1.2) % 600) - 300;
          ship.rotation.z = Math.sin(t * 0.5) * 0.04;
          ship.rotation.x = Math.sin(t * 0.37 + 1) * 0.03;
          ship.position.y = SEA + Math.sin(t * 0.6) * 1.2;
        },
      };
      // The camera's floor height as the core will have set it: the last
      // floor this room handed out.
      let lastFloor = 0;
      const floorFn = api.floor;
      api.floor = (lx, lz) => (lastFloor = floorFn(lx, lz));
      function LH_floorY() { return lastFloor; }
      return api;
    },
    sound(A, R, api) {
      const st = api.storm;
      // Everything is heard through the stone at the foot and opens up as
      // you climb: the storm's sounds pass through a filter that opens
      // with how exposed you are.
      const open = A.filter("lowpass", 600, 0.5);
      open.connect(A.bus);
      // Wind: a low roar, and a moving howl round the gallery.
      const windAmp = A.gain(0.08);
      const windTone = A.filter("bandpass", 260, 0.7);
      A.hiss().connect(windTone).connect(windAmp).connect(open);
      const howlAmp = A.gain(0);
      const howlTone = A.filter("bandpass", 600, 1.4);
      A.hiss().connect(howlTone).connect(howlAmp).connect(open);
      // Rain: on stone and glass.
      const rainAmp = A.gain(0.03);
      A.hiss().connect(A.filter("highpass", 900)).connect(A.filter("lowpass", 3800, 0.5)).connect(rainAmp).connect(open);
      // Waves: a deep boom and a wash for each one that hits the rocks.
      const boomAmp = A.gain(0);
      A.hiss().connect(A.filter("lowpass", 160, 0.7)).connect(boomAmp).connect(A.bus);
      const washAmp = A.gain(0);
      const washTone = A.filter("bandpass", 700, 0.5);
      A.hiss().connect(washTone).connect(washAmp).connect(open);
      // Thunder: a long low rumble, and a crack before it when close.
      const thunderAmp = A.gain(0);
      const thunderTone = A.filter("lowpass", 140, 0.6);
      A.hiss().connect(thunderTone).connect(thunderAmp).connect(A.bus);
      const crackAmp = A.gain(0);
      A.hiss().connect(A.filter("highpass", 900)).connect(crackAmp).connect(open);
      // The clockwork turning the lens: a soft tick, close by it.
      const tickAmp = A.gain(0);
      const tickOut = A.placed(0, LH.HL + 0.6, LH.ZC, 1.2, 1.6);
      A.hiss().connect(A.filter("bandpass", 2600, 1.2)).connect(tickAmp).connect(tickOut);
      let tick = A.ctx.currentTime + 0.5;
      A.extras.push((until) => {
        tick = Math.max(tick, A.ctx.currentTime);
        while (tick < until) {
          tickAmp.gain.setValueAtTime(0.0001, tick);
          tickAmp.gain.linearRampToValueAtTime(0.25, tick + 0.003);
          tickAmp.gain.exponentialRampToValueAtTime(0.0001, tick + 0.03);
          tick += 0.5;
        }
      });
      // Water dripping in the stairwell, with a little stone echo.
      const echo = A.ctx.createDelay(1);
      echo.delayTime.value = 0.13;
      const fb = A.gain(0.38);
      const echoTone = A.filter("lowpass", 2200);
      echo.connect(echoTone).connect(fb).connect(echo);
      echoTone.connect(A.bus);
      const drip = A.osc("sine", 1400);
      const dripAmp = A.gain(0);
      drip.connect(dripAmp);
      dripAmp.connect(A.bus);
      dripAmp.connect(echo);
      let dripAt = A.ctx.currentTime + 2;
      A.extras.push((until) => {
        dripAt = Math.max(dripAt, A.ctx.currentTime);
        while (dripAt < until) {
          const f = 1100 + A.chance() * 900;
          drip.frequency.setValueAtTime(f, dripAt);
          drip.frequency.exponentialRampToValueAtTime(f * 1.6, dripAt + 0.04);
          dripAmp.gain.setValueAtTime(0.0001, dripAt);
          dripAmp.gain.linearRampToValueAtTime(0.03 * (1 - st.ex), dripAt + 0.004);
          dripAmp.gain.exponentialRampToValueAtTime(0.0001, dripAt + 0.07);
          dripAt += 1.2 + A.chance() * 4;
        }
      });
      // A ship's horn out at sea, now and then: low and brief.
      const horn = A.osc("sawtooth", 98);
      const hornAmp = A.gain(0);
      horn.connect(A.filter("lowpass", 320, 0.7)).connect(hornAmp).connect(open);
      let hornAt = A.ctx.currentTime + 25;
      A.extras.push((until) => {
        while (hornAt < until) {
          hornAmp.gain.setTargetAtTime(0.05, hornAt, 0.15);
          hornAmp.gain.setTargetAtTime(0, hornAt + 2.2, 0.4);
          hornAt += 60 + A.chance() * 50;
        }
      });
      const seen = new Set();
      return {
        update() {
          const now = A.ctx.currentTime;
          const ex = st.ex;
          const g = st.wind;
          open.frequency.setTargetAtTime(500 + ex * ex * 4500, now, 0.3);
          windAmp.gain.setTargetAtTime((0.06 + g * 0.07) * (0.9 + ex * 1.6), now, 0.4);
          windTone.frequency.setTargetAtTime(200 + g * 180, now, 0.5);
          howlAmp.gain.setTargetAtTime(ex * ex * (0.015 + g * 0.04), now, 0.4);
          howlTone.frequency.setTargetAtTime(450 + g * 450 + Math.sin(now * 0.7) * 80, now, 0.4);
          rainAmp.gain.setTargetAtTime(0.02 + ex * 0.03, now, 0.4);
          // Waves that have just hit.
          for (const c of st.crashes) {
            if (seen.has(c)) continue;
            seen.add(c);
            const at = now + 0.05;
            boomAmp.gain.setTargetAtTime(0.25 * c.big, at, 0.04);
            boomAmp.gain.setTargetAtTime(0, at + 0.3, 0.6);
            washAmp.gain.setTargetAtTime(0.06 * c.big, at + 0.15, 0.2);
            washAmp.gain.setTargetAtTime(0, at + 0.9, 0.9);
          }
          st.crashes.length = 0;
          // Thunder, delayed by the distance to the strike.
          for (const s of st.strikes) {
            if (seen.has(s)) continue;
            seen.add(s);
            const at = now + s.dist / 343;
            const close = s.dist < 600;
            if (close) {
              crackAmp.gain.setTargetAtTime(0.12, at - 0.05, 0.01);
              crackAmp.gain.setTargetAtTime(0, at + 0.15, 0.1);
            }
            const loud = Math.min(0.5, 180 / s.dist);
            thunderTone.frequency.setValueAtTime(close ? 220 : 120, at);
            thunderTone.frequency.linearRampToValueAtTime(70, at + 4);
            thunderAmp.gain.setTargetAtTime(loud, at, 0.15);
            for (let k = 1; k < 6; k++) thunderAmp.gain.setTargetAtTime(loud * (0.4 + A.chance() * 0.6) * (1 - k / 7), at + k * 0.6, 0.2);
            thunderAmp.gain.setTargetAtTime(0, at + 4, 1.2);
          }
          st.strikes.length = 0;
        },
      };
    },
  };
