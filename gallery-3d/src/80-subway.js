  // ---------- The Subway ----------
  // Inside a moving subway car at night: five cars joined by end doors,
  // molded seats, steel poles and grab bars, swinging straps, fluorescent
  // tubes (one flickering), and photos in the ad-card frames and posters.
  // Outside, a dark tunnel streams past: lights throwing bands across the
  // car, signals, cables, a train going the other way. The car leans into
  // curves and jolts over joints; M tones the motion down.

  // The train runs along a track that keeps turning: five cars, each
  // straight, laid along a curve whose bend changes as you go, easing from
  // straight into a turn one way, back through straight, into a turn the
  // other. The middle car is the one you step into and stays square to the
  // doorway; the others swing out round it, and you ride along with
  // whichever car you're in.
  const SUBWAY = (() => {
    const CW = 2.9; // car width (z from 0 to CW, car-local)
    const CL = 15; // car length (x from -CL/2 to CL/2)
    const GAP = 0.6; // gangway between cars
    const L = CL + GAP; // from one car's centre to the next
    const N = 5;
    const MID = 2;
    const S = { k: 0 }; // the track's curvature right now (1 / radius)
    // The bend between one car and the next, in radians, over time.
    // Smooth, steady turning: one way, through straight, the other way,
    // about every 25 seconds, with a smaller wander on top.
    const bendAt = (t) => 0.1 * Math.sin(t * 0.25) + 0.03 * Math.sin(t * 0.61 + 1);
    // A point on the track: `s` metres along from the middle car's centre,
    // `n` metres to the side (toward the curve's inside when it bends to +z).
    const track = (s, n) => {
      const k = S.k;
      const a = k * s;
      let x, z;
      if (Math.abs(k) < 1e-7) { x = s; z = (k * s * s) / 2; }
      else { x = Math.sin(a) / k; z = (1 - Math.cos(a)) / k; }
      return { x: x - Math.sin(a) * n, z: CW / 2 + z + Math.cos(a) * n, yaw: -a };
    };
    // A car's frame: where its centre sits and which way it points.
    const frame = (o) => track(o * L, 0);
    // Car-local (x, z) to room coordinates, and back.
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
    return { CW, CL, GAP, L, N, MID, S, bendAt, track, frame, toCar, fromCar };
  })();

  ROOMS.subway = {
    name: "The Night Train",
    short: "Subway",
    tagline: "Photos in the ad frames, last train home",
    color: 0xc9d4ff,
    leak: 0xd6deff,
    leakStyle: "bands",
    frame: 0x8b9096,
    fogColor: 0x1a1d22,
    loudness: 0.6,
    ground: "floor",
    entrance: { x: 0, z: 0, nx: 0, nz: -1 },
    spawn: { x: 0, z: 1.1, yaw: -Math.PI / 2 - 0.45, pitch: 0.06 },
    spots: {
      car: { name: "Down the Car", x: -6.6, z: 1.45, yaw: -Math.PI / 2, pitch: 0.05 },
      // Where the last car is depends on how the track is bending now.
      get last() {
        const p = SUBWAY.toCar(-2, -6.4, 1.45);
        return { name: "The Last Car", x: p.x, z: p.z, yaw: SUBWAY.frame(-2).yaw - Math.PI / 2, pitch: 0.04 };
      },
    },
    build(R) {
      const { CW, CL, L, N, MID, S, bendAt, track, frame, toCar, fromCar } = SUBWAY;
      S.k = bendAt(performance.now() / 1000) / L;
      const CH = 2.5; // wall height
      const TOP = CH + 0.12; // the ceiling
      const OFFSETS = Array.from({ length: N }, (_, i) => i - MID);
      const DOORS_X = [-5, 0, 5];
      const SEATS = [[-7.3, -5.95], [-4.05, -0.95], [0.95, 4.05], [5.95, 7.3]];
      R.scene.fog = new THREE.FogExp2(0x231e2a, 0.0026);

      R.add(new THREE.HemisphereLight(0xe2ead6, 0x3a3730, 0.8));
      const tubeLight = new THREE.PointLight(0xf2f5ff, 3, 7, 1.6);
      tubeLight.position.set(1.6, 2.3, 0.85);
      R.add(tubeLight);

      // A soft reflection of a lit car interior, for the steel and glass to
      // pick up: a pale box with two bright strips along the ceiling.
      {
        const env = new THREE.Scene();
        env.add(new THREE.Mesh(new THREE.BoxGeometry(10, 3, 4), new THREE.MeshBasicMaterial({ color: 0x8a8c90, side: THREE.BackSide })));
        for (const z of [-1, 1]) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          strip.position.set(0, 1.45, z);
          env.add(strip);
        }
        const floorStrip = new THREE.Mesh(new THREE.BoxGeometry(10, 0.05, 4), new THREE.MeshBasicMaterial({ color: 0x3a3a3c }));
        floorStrip.position.y = -1.48;
        env.add(floorStrip);
        const pmrem = new THREE.PMREMGenerator(renderer);
        R.scene.environment = pmrem.fromScene(env, 0.02).texture;
        pmrem.dispose();
      }

      // Brushed stainless: fine streaks running along the car.
      const brushed = canvasTex(256, 256, (g) => {
        const r = rng(83);
        g.fillStyle = "#b9bcc0";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 900; i++) {
          const v = 150 + r() * 90;
          g.fillStyle = `rgba(${v}, ${v + 2}, ${v + 6}, ${0.15 + r() * 0.2})`;
          g.fillRect(r() * 256, r() * 256, 20 + r() * 120, 1);
        }
        // Grime collecting toward the bottom, smudges, scratches.
        const fade = g.createLinearGradient(0, 0, 0, 256);
        fade.addColorStop(0, "rgba(60, 55, 45, 0)");
        fade.addColorStop(1, "rgba(60, 55, 45, 0.45)");
        g.fillStyle = fade;
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 40; i++) {
          const x = r() * 256;
          const y = r() * 256;
          const rad = 6 + r() * 18;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, `rgba(70, 64, 55, ${0.15 + r() * 0.2})`);
          blob.addColorStop(1, "rgba(70, 64, 55, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        g.strokeStyle = "rgba(235, 238, 240, 0.35)";
        for (let i = 0; i < 30; i++) {
          g.lineWidth = 0.6 + r();
          g.beginPath();
          const x = r() * 256;
          const y = r() * 256;
          g.moveTo(x, y);
          g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 30);
          g.stroke();
        }
      });
      brushed.repeat.set(3, 1);
      // Off-white fiberglass panels with a seam every metre and a little grime.
      const fiberglass = canvasTex(256, 256, (g) => {
        const r = rng(84);
        g.fillStyle = "#cfc8b6";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 700; i++) {
          g.fillStyle = `rgba(90, 80, 62, ${r() * 0.08})`;
          g.fillRect(r() * 256, r() * 256, 3 + r() * 10, 3 + r() * 10);
        }
        // Drip streaks and grubby patches.
        for (let i = 0; i < 18; i++) {
          g.fillStyle = `rgba(80, 70, 55, ${0.05 + r() * 0.1})`;
          g.fillRect(r() * 256, r() * 128, 1 + r() * 3, 40 + r() * 120);
        }
        for (let i = 0; i < 10; i++) {
          const x = r() * 256;
          const y = r() * 256;
          const rad = 15 + r() * 35;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, `rgba(70, 62, 48, ${0.12 + r() * 0.15})`);
          blob.addColorStop(1, "rgba(70, 62, 48, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        g.fillStyle = "rgba(60, 58, 52, 0.55)";
        g.fillRect(0, 0, 3, 256);
        g.fillStyle = "rgba(255, 255, 255, 0.5)";
        g.fillRect(3, 0, 2, 256);
      });
      fiberglass.repeat.set(1, 1);
      const steel = new THREE.MeshStandardMaterial({ color: 0xb9bdc0, metalness: 1, roughness: 0.4 });
      const wallMat = new THREE.MeshStandardMaterial({ map: fiberglass, roughness: 0.55, metalness: 0 });
      const panelMat = new THREE.MeshStandardMaterial({ map: brushed, color: 0xb2b4b6, metalness: 0.75, roughness: 0.5 });
      const doorMat = new THREE.MeshStandardMaterial({ map: brushed, color: 0xb8babd, metalness: 0.75, roughness: 0.45 });
      const rubber = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
      const scratchTex = canvasTex(512, 128, (g) => {
        g.fillStyle = "#0a0c0f";
        g.fillRect(0, 0, 512, 128);
        const r = rng(87);
        g.strokeStyle = "rgba(200, 205, 210, 0.35)";
        for (let i = 0; i < 40; i++) {
          g.lineWidth = 0.5 + r() * 0.8;
          g.beginPath();
          const x = r() * 512;
          const y = r() * 128;
          g.moveTo(x, y);
          g.lineTo(x + (r() - 0.5) * 90, y + (r() - 0.5) * 30);
          g.stroke();
        }
        // An etched tag.
        g.strokeStyle = "rgba(220, 225, 230, 0.5)";
        g.lineWidth = 1.5;
        g.beginPath();
        let x = 300;
        let y = 70;
        g.moveTo(x, y);
        for (let k = 0; k < 14; k++) { x += 6 + r() * 6; y = 50 + r() * 40; g.lineTo(x, y); }
        g.stroke();
      });
      const glassMat = new THREE.MeshStandardMaterial({ map: scratchTex, color: 0xffffff, metalness: 0.1, roughness: 0.2, envMapIntensity: 1.2, transparent: true, opacity: 0.38, depthWrite: false });
      const doorGlass = new THREE.MeshStandardMaterial({ color: 0x0c1015, metalness: 0.1, roughness: 0.06, envMapIntensity: 1.6, transparent: true, opacity: 0.45, depthWrite: false });
      // Speckled rubber flooring.
      const floorTex = canvasTex(256, 256, (g) => {
        const r = rng(81);
        g.fillStyle = "#3f4145";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 14; i++) {
          const x = r() * 256;
          const y = r() * 256;
          const rad = 10 + r() * 30;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, `rgba(25, 22, 18, ${0.25 + r() * 0.3})`);
          blob.addColorStop(1, "rgba(25, 22, 18, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        for (let i = 0; i < 3500; i++) {
          const c = r();
          g.fillStyle = c < 0.4 ? "rgba(20,22,26,0.5)" : c < 0.8 ? "rgba(140,144,150,0.35)" : "rgba(200,190,160,0.4)";
          g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
        }
        // Gum, flattened into black spots.
        for (let i = 0; i < 26; i++) {
          g.fillStyle = `rgba(${r() < 0.7 ? "18,18,20" : "120,110,95"}, 0.85)`;
          g.beginPath();
          g.ellipse(r() * 256, r() * 256, 1.5 + r() * 3, 1.2 + r() * 2.5, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
        g.strokeStyle = "rgba(20, 20, 20, 0.25)";
        for (let i = 0; i < 30; i++) {
          g.lineWidth = 1 + r() * 2;
          g.beginPath();
          const x = r() * 256;
          const y = r() * 256;
          g.moveTo(x, y);
          g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 16);
          g.stroke();
        }
      });
      floorTex.repeat.set(CL / 1.5, CW / 1.5);
      const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });
      // A darker, scuffed path worn down the middle of the car.
      const wearTex = canvasTex(64, 256, (g) => {
        const grad = g.createLinearGradient(0, 0, 64, 0);
        grad.addColorStop(0, "rgba(0, 0, 0, 0.35)");
        grad.addColorStop(0.18, "rgba(0, 0, 0, 0)");
        grad.addColorStop(0.35, "rgba(30, 26, 20, 0.22)");
        grad.addColorStop(0.65, "rgba(30, 26, 20, 0.22)");
        grad.addColorStop(0.82, "rgba(0, 0, 0, 0)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0.35)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 256);
      }, { repeat: false });
      const wearMat = new THREE.MeshBasicMaterial({ map: wearTex, transparent: true, depthWrite: false });
      const ceilMat = new THREE.MeshStandardMaterial({ color: 0xd2ccb8, roughness: 0.7, emissive: 0x18170f });
      const ventTex = canvasTex(64, 64, (g) => {
        g.fillStyle = "#c9c9c4";
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = "#4a4b4d";
        for (let i = 0; i < 8; i++) g.fillRect(4, 4 + i * 7.5, 56, 3.5);
      });
      ventTex.repeat.set(CL / 0.6, 1);
      const ventMat = new THREE.MeshStandardMaterial({ map: ventTex, roughness: 0.7 });
      const grilleTex = canvasTex(64, 64, (g) => {
        g.fillStyle = "#3c3f43";
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = "#121315";
        for (let i = 0; i < 8; i++) g.fillRect(0, 3 + i * 8, 64, 3);
      });
      const grilleMat = new THREE.MeshStandardMaterial({ map: grilleTex, metalness: 0.6, roughness: 0.5 });
      const warnMat = new THREE.MeshStandardMaterial({ color: 0xe0b52a, roughness: 0.7 });
      const scuffTex = canvasTex(128, 128, (g) => {
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, 128, 128);
        const r = rng(86);
        for (let i = 0; i < 60; i++) {
          g.fillStyle = `rgba(60, 55, 50, ${0.08 + r() * 0.15})`;
          g.fillRect(r() * 128, r() * 128, 2 + r() * 10, 1 + r() * 3);
        }
        g.strokeStyle = "rgba(240, 240, 235, 0.55)";
        for (let i = 0; i < 6; i++) {
          g.lineWidth = 1;
          g.beginPath();
          let x = r() * 128;
          let y = r() * 128;
          g.moveTo(x, y);
          for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 18; y += (r() - 0.5) * 12; g.lineTo(x, y); }
          g.stroke();
        }
      });
      const seatMats = [new THREE.MeshStandardMaterial({ map: scuffTex, color: 0x2a5d96, roughness: 0.5 }), new THREE.MeshStandardMaterial({ map: scuffTex, color: 0xc56d2a, roughness: 0.5 })];
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.4 });
      // Light panels: a faint green cast, and the shadows of dead bugs and
      // dust collected inside them.
      const diffuserTex = canvasTex(256, 48, (g) => {
        g.fillStyle = "#eef3e6";
        g.fillRect(0, 0, 256, 48);
        const r = rng(85);
        for (let i = 0; i < 26; i++) {
          g.fillStyle = `rgba(60, 60, 45, ${0.25 + r() * 0.4})`;
          g.fillRect(r() * 256, 4 + r() * 40, 1 + r() * 3, 1 + r() * 2);
        }
        const dust = g.createLinearGradient(0, 0, 256, 0);
        dust.addColorStop(0, "rgba(120, 110, 80, 0.25)");
        dust.addColorStop(0.15, "rgba(120, 110, 80, 0)");
        dust.addColorStop(0.85, "rgba(120, 110, 80, 0)");
        dust.addColorStop(1, "rgba(120, 110, 80, 0.25)");
        g.fillStyle = dust;
        g.fillRect(0, 0, 256, 48);
      }, { repeat: false });
      const tubeMat = new THREE.MeshBasicMaterial({ map: diffuserTex, color: 0xe6eedc });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc1, metalness: 1, roughness: 0.3 });

      // A molded bucket seat, `width` wide: the profile of pan and back,
      // extruded across, laid with its back to the wall at z = 0.
      const seatGeos = new Map();
      function seatGeo(width) {
        const key = width.toFixed(3);
        if (seatGeos.has(key)) return seatGeos.get(key);
        const sh = new THREE.Shape();
        sh.moveTo(0.04, 0.96);
        sh.lineTo(0.085, 0.96);
        sh.quadraticCurveTo(0.075, 0.62, 0.11, 0.53);
        sh.quadraticCurveTo(0.14, 0.47, 0.24, 0.465);
        sh.lineTo(0.41, 0.475);
        sh.quadraticCurveTo(0.455, 0.48, 0.455, 0.45);
        sh.lineTo(0.44, 0.425);
        sh.lineTo(0.12, 0.425);
        sh.quadraticCurveTo(0.04, 0.44, 0.04, 0.56);
        sh.lineTo(0.04, 0.96);
        const geo = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 5 });
        geo.rotateY(-Math.PI / 2);
        geo.translate(width / 2, 0, 0);
        geo.computeVertexNormals();
        seatGeos.set(key, geo);
        return geo;
      }
      let flickerTube = null;

      // The amber LED sign over each end door.
      const ledTex = canvasTex(512, 92, (g) => {
        g.fillStyle = "#0b0b0c";
        g.fillRect(0, 0, 512, 92);
        g.fillStyle = "#ff8a1c";
        g.font = "600 34px Poppins, system-ui, sans-serif";
        g.textBaseline = "middle";
        g.fillText("NIGHT LINE · NEXT: GALLERY", 14, 48);
        // The dot pattern of an LED board.
        g.fillStyle = "rgba(0, 0, 0, 0.55)";
        for (let x = 0; x < 512; x += 4) g.fillRect(x, 0, 1, 92);
        for (let y = 0; y < 92; y += 4) g.fillRect(0, y, 512, 1);
      }, { repeat: false });
      fontsReady.then(() => (ledTex.needsUpdate = true));
      const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false });

      // Litter: crumpled wrappers, a cup, a newspaper, a can, kicked under
      // the seats and into the corners.
      const litterMats = [0xe9e4d6, 0xc93a2c, 0x2f6fb4, 0xd9c070, 0xb8b8b2].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
      const paperTex = canvasTex(128, 96, (g) => {
        g.fillStyle = "#d9d4c6";
        g.fillRect(0, 0, 128, 96);
        g.fillStyle = "#3a3a3a";
        g.fillRect(8, 8, 112, 10);
        for (let i = 0; i < 14; i++) g.fillRect(8 + (i % 2) * 58, 24 + Math.floor(i / 2) * 9, 50, 3);
      }, { repeat: false });
      function litter(car, o) {
        const r = rng(500 + o * 17);
        const near = (side) => (side ? CW - 0.15 - r() * 0.35 : 0.15 + r() * 0.35);
        for (let i = 0; i < 7; i++) {
          const x = (r() - 0.5) * (CL - 1);
          const side = r() < 0.5 ? 0 : 1;
          const kind = r();
          let m;
          if (kind < 0.45) {
            m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + r() * 0.03, 0), litterMats[Math.floor(r() * litterMats.length)]);
            m.scale.y = 0.6;
            m.position.set(x, 0.025, near(side));
          } else if (kind < 0.65) {
            m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.11, 8), litterMats[0]);
            m.rotation.z = Math.PI / 2;
            m.rotation.y = r() * 3;
            m.position.set(x, 0.04, near(side));
          } else if (kind < 0.85) {
            m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9 }));
            m.rotation.set(-Math.PI / 2, 0, r() * 3);
            m.position.set(x, 0.006, 0.5 + r() * (CW - 1));
          } else {
            m = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xb02a2a, metalness: 0.6, roughness: 0.4 }));
            m.rotation.z = Math.PI / 2;
            m.rotation.y = r() * 3;
            m.position.set(x, 0.033, near(side));
          }
          car.add(m);
        }
      }

      const carGroups = [];
      const straps = [];
      const adSlots = [];
      const posterSlots = [];
      // Walls and blockers are kept in each car's own coordinates and turned
      // into the room's every frame, as the cars swing.
      const wallDefs = [];
      const blockerDefs = [];
      const walls = [];
      const blockers = [];
      const wallIn = (o, x0, z0, x1, z1) => wallDefs.push([o, x0, z0, x1, z1]);

      OFFSETS.forEach((o, ci) => {
        const car = new THREE.Group();
        car.userData.o = o;
        R.add(car);
        carGroups.push(car);
        const plane = (w, h, mat, x, y, z, ry = 0, rx = 0) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
          m.position.set(x, y, z);
          m.rotation.set(rx, ry, 0);
          car.add(m);
          return m;
        };
        plane(CL, CW, floorMat, 0, 0, CW / 2, 0, -Math.PI / 2);
        const wear = plane(CL, CW, wearMat, 0, 0.002, CW / 2, 0, -Math.PI / 2);
        wear.renderOrder = 1;
        litter(car, o);
        plane(CL, CW, ceilMat, 0, TOP, CW / 2, 0, Math.PI / 2);
        plane(CL - 0.4, 0.32, ventMat, 0, TOP - 0.004, CW / 2, 0, Math.PI / 2);
        for (const side of [0, 1]) {
          const z = side ? CW : 0;
          const ry = side ? Math.PI : 0;
          let x0 = -CL / 2;
          const spans = [];
          for (const dx of DOORS_X) { spans.push([x0, dx - 0.8]); x0 = dx + 0.8; }
          spans.push([x0, CL / 2]);
          for (const [a, b] of spans) {
            const w = b - a;
            const mid = (a + b) / 2;
            plane(w, 0.95, panelMat, mid, 0.475, z, ry);
            plane(w, TOP - 1.8, wallMat, mid, 1.8 + (TOP - 1.8) / 2, z, ry);
            const glass = plane(w, 0.85, glassMat, mid, 1.375, z + (side ? 0.002 : -0.002), ry);
            glass.renderOrder = 2;
            for (const y of [0.95, 1.8]) {
              const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, 0.05), trimMat);
              trim.position.set(mid, y, side ? z - 0.02 : z + 0.02);
              car.add(trim);
            }
            wallIn(o, a, z, b, z);
          }
          // Doors: closed except the one you came in by. Each leaf has a
          // tall window onto the dark tunnel.
          for (const dx of DOORS_X) {
            const open = o === 0 && side === 0 && dx === 0;
            const zz = side ? z - 0.03 : z + 0.03;
            if (!open) {
              for (const s of [-1, 1]) {
                const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.25, 0.04), doorMat);
                leaf.position.set(dx + s * 0.4, 1.125, zz);
                const seal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.2, 0.05), rubber);
                seal.position.x = -s * 0.385;
                leaf.add(seal);
                const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.95), doorGlass);
                pane.position.set(0, 0.25, side ? -0.022 : 0.022);
                if (side) pane.rotation.y = Math.PI;
                leaf.add(pane);
                car.add(leaf);
              }
              wallIn(o, dx - 0.8, z, dx + 0.8, z);
            } else {
              for (const s of [-1, 1]) {
                const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.25, 0.04), doorMat);
                leaf.position.set(dx + s * 1.2, 1.125, -0.05);
                car.add(leaf);
              }
            }
            plane(1.6, TOP - 2.4, wallMat, dx, 2.4 + (TOP - 2.4) / 2, z, ry);
            const warn = plane(1.6, 0.1, warnMat, dx, 0.003, side ? CW - 0.06 : 0.06, 0, -Math.PI / 2);
            warn.renderOrder = 1;
            for (const s of [-1, 1]) {
              const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, TOP, 8), steel);
              pole.position.set(dx + s * 0.95, TOP / 2, side ? CW - 0.55 : 0.55);
              car.add(pole);
              blockerDefs.push([o, dx + s * 0.95, side ? CW - 0.55 : 0.55, 0.06]);
            }
          }
          for (const [a, b] of SEATS) {
            const n = Math.round((b - a) / 0.5);
            for (let k = 0; k < n; k++) {
              const x = a + (k + 0.5) * ((b - a) / n);
              const seat = new THREE.Mesh(seatGeo((b - a) / n - 0.04), seatMats[(k + ci) % 2]);
              seat.position.set(x, 0, side ? CW : 0);
              if (side) seat.rotation.y = Math.PI;
              car.add(seat);
            }
            {
              const grille = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.4, 0.05), grilleMat);
              grilleMat.map.repeat.set((b - a) / 0.4, 1);
              grille.position.set((a + b) / 2, 0.2, side ? CW - 0.42 : 0.42);
              car.add(grille);
              // A steel partition and grab pole at each end of the bench.
              for (const ex of [a, b]) {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.98, 8), steel);
                pole.position.set(ex, 0.99, side ? CW - 0.46 : 0.46);
                car.add(pole);
                const screen = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.55, 0.38), trimMat);
                screen.position.set(ex, 0.8, side ? CW - 0.25 : 0.25);
                car.add(screen);
              }
            }
            wallIn(o, a, side ? CW - 0.5 : 0.5, b, side ? CW - 0.5 : 0.5);
            if (b - a > 2) for (const fx of [0.27, 0.73]) adSlots.push({ o, side, x: a + (b - a) * fx, car });
          }
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, CL - 0.8, 6), steel);
          bar.rotation.z = Math.PI / 2;
          bar.position.set(0, 1.98, side ? CW - 0.78 : 0.78);
          car.add(bar);
          for (let x = -CL / 2 + 1; x < CL / 2 - 0.9; x += 0.62) {
            if (DOORS_X.some((d) => Math.abs(x - d) < 1.0)) continue;
            const strap = new THREE.Group();
            strap.userData.keep = true;
            strap.position.set(x, 1.98, side ? CW - 0.78 : 0.78);
            strap.add(part(new THREE.BoxGeometry(0.03, 0.22, 0.012), 0x2a2d31, 0, -0.11, 0));
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 4, 10), ringMat);
            ring.position.y = -0.27;
            strap.add(ring);
            car.add(strap);
            straps.push({ strap, phase: x * 1.7 + side + o * 3.1, k: 0.8 + ((x * 7) % 1) * 0.4, side });
          }
        }
        for (const z of [0.85, CW - 0.85]) {
          for (let x = -CL / 2 + 1; x < CL / 2 - 0.8; x += 1.6) {
            const flickers = o === 0 && x > 0 && !flickerTube;
            const tube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.26), flickers ? new THREE.MeshBasicMaterial({ map: diffuserTex, color: 0xe6eedc }) : tubeMat);
            tube.userData.keep = flickers;
            tube.position.set(x + 0.6, TOP - 0.025, z);
            car.add(tube);
            const trim = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.02, 0.32), trimMat);
            trim.position.set(x + 0.6, TOP - 0.008, z);
            car.add(trim);
            if (flickers) flickerTube = tube;
          }
        }
        // End walls: a doorway through to the next car, or a closed door at
        // either end of the train.
        for (const end of [-1, 1]) {
          const ex = end * CL / 2;
          const through = end < 0 ? o > -MID : o < N - 1 - MID;
          const endWall = wallFaces(CW, TOP, wallMat, { x: 0, half: 0.5, h: 2.2 }, 0x55585c);
          endWall.position.set(ex, 0, CW / 2);
          endWall.rotation.y = end > 0 ? -Math.PI / 2 : Math.PI / 2;
          car.add(endWall);
          if (!through) {
            const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 1.0), doorMat);
            door.position.set(ex - end * 0.02, 1.1, CW / 2);
            const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), doorGlass);
            pane.position.set(-end * 0.022, 0.3, 0);
            pane.rotation.y = end > 0 ? -Math.PI / 2 : Math.PI / 2;
            door.add(pane);
            car.add(door);
            wallIn(o, ex, 0, ex, CW);
          } else {
            wallIn(o, ex, 0, ex, CW / 2 - 0.5);
            wallIn(o, ex, CW / 2 + 0.5, ex, CW);
          }
          for (const s of [-1, 1]) posterSlots.push({ o, end, s, car, x: ex - end * 0.03, z: CW / 2 + s * 0.98 });
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.16), ledMat);
          sign.position.set(ex - end * 0.012, 2.4, CW / 2);
          sign.rotation.y = end > 0 ? -Math.PI / 2 : Math.PI / 2;
          sign.userData.keep = true;
          car.add(sign);
        }
      });

      // The gangways: a floor plate and dark bellows between each pair of
      // cars, stretched and turned to fit as the train bends.
      const gangways = [];
      for (let o = -MID; o < N - 1 - MID; o++) {
        const g = new THREE.Group();
        g.add(part(new THREE.BoxGeometry(1, 0.02, 1.0), 0x3a3c40, 0, 0.01, 0));
        for (const s of [-1, 1]) g.add(part(new THREE.BoxGeometry(1, 2.25, 0.05), 0x141517, 0, 1.12, s * 0.52));
        g.add(part(new THREE.BoxGeometry(1, 0.05, 1.04), 0x141517, 0, 2.22, 0));
        R.add(g);
        gangways.push({ g, o });
      }

      // Photos: every one of them somewhere along the train, in the ad frames
      // above the seats, and a few as posters by the end doors. Spare frames
      // carry the line's own adverts.
      const posterStems = ["DSC05238", "1", "DSC04734", "DSC05995", "DSC05025", "DSC04824"];
      const firstAds = ["DSC05752", "DSC05851", "5-alt", "2-alt", "DSC06067", "Cruise-5", "DSC06051", "DSC06058"];
      const adStems = [...firstAds, ...PHOTOS.map((p) => p.stem).filter((st) => !firstAds.includes(st) && !posterStems.includes(st))];
      // Fill the car you arrive in first, then outward.
      adSlots.sort((p, q) => Math.abs(p.o) - Math.abs(q.o) || p.o - q.o);
      const FILLERS = [["Night Line", "Mind the gap between", "the car and the platform"], ["See something?", "Say something.", ""], ["Night Line", "Last train 1:12 am", "Every 20 minutes after midnight"]];
      adSlots.forEach((slot, i) => {
        const card = new THREE.Group();
        const H = 0.36;
        const W = 1.25;
        card.add(new THREE.Mesh(new THREE.PlaneGeometry(W + 0.06, H + 0.06), new THREE.MeshLambertMaterial({ color: 0x2a2d31 })));
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: 0xf6f4ee, toneMapped: false }));
        paper.position.z = 0.001;
        card.add(paper);
        const stem = adStems[i];
        if (stem) {
          const P = PHOTO[stem];
          const ph = H - 0.04;
          const pw = Math.min(0.6, (ph * P.w) / P.h);
          const lab = labelMesh(labelLines(P), "ad", Math.min(0.62, W - pw - 0.08));
          lab.position.set(-W / 2 + lab.geometry.parameters.width / 2 + 0.01, 0, 0.002);
          card.add(lab);
          const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, (pw * P.h) / P.w > ph ? ph : (pw * P.h) / P.w), new THREE.MeshBasicMaterial({ map: photoTexture(stem, R.reg), toneMapped: false, fog: false }));
          pic.position.set(W / 2 - pw / 2 - 0.03, 0, 0.004);
          card.add(pic);
          R.reg.photos.push({ mesh: pic, photo: P, w: pw, h: ph });
        } else {
          const lab = labelMesh(FILLERS[i % FILLERS.length], "ad", W - 0.04);
          lab.scale.y = (H - 0.02) / ((W - 0.04) / 2);
          lab.position.z = 0.002;
          card.add(lab);
        }
        card.position.set(slot.x, 2.12, slot.side ? CW - 0.01 : 0.01);
        card.rotation.y = slot.side ? Math.PI : 0;
        card.rotation.x = slot.side ? 0.12 : -0.12;
        slot.car.add(card);
      });
      posterSlots.filter((s) => s.o === 0 || s.s === 1).slice(0, posterStems.length).forEach((slot, i) => {
        const piece = R.photo(posterStems[i], { long: 0.82, frame: 0x8b9096, border: 0.03, depth: 0.02, label: "ad", labelSide: 0, labelWidth: 0.42, matte: { size: 0.04, color: 0xf2f0ea } });
        piece.position.set(slot.x, 1.58, slot.z);
        piece.rotation.y = slot.end > 0 ? -Math.PI / 2 : Math.PI / 2;
        slot.car.add(piece);
      });

      for (const car of carGroups) mergeStatic(car);

      {
        const sticker = labelMesh(["Do not lean", "on doors", ""], "ad", 0.3);
        sticker.position.set(5, 1.45, 0.06);
        carGroups[MID].add(sticker);
      }

      // ---------- Outside: an elevated line over the city at night ----------
      // The train runs on a viaduct twelve metres above the streets. Close
      // by, the viaduct's posts flick past; beyond them the city lies in
      // layers, each further one hazier and dimmer: blocks right below the
      // line, towers a few hundred metres out, and a skyline on the horizon
      // under a sky lit orange from beneath. The layers all move at the
      // train's speed, so the near ones sweep by and the far ones barely
      // drift, which is what makes the distance read.
      const tunnel = new THREE.Group();
      R.add(tunnel);
      const SPAN = 120; // metres of viaduct either side of the middle car
      const N_NEAR = -(CW / 2 + 0.75); // the edge on the doors' side
      const N_FAR = CW / 2 + 4.6; // the edge across the other track
      const N_OTHER = CW / 2 + 2.6; // the other track
      const STREET = -12; // the street, below the viaduct
      const at = (s, n, y) => { const p = track(s, n); return new THREE.Vector3(p.x, y, p.z); };
      const wallTex = canvasTex(512, 128, (g) => {
        g.fillStyle = "#2a2a2c";
        g.fillRect(0, 0, 512, 128);
        const r = rng(91);
        for (let i = 0; i < 60; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? "10,10,10" : "90,88,84"}, ${0.1 + r() * 0.2})`;
          g.fillRect(r() * 512, r() * 128, 6 + r() * 40, 2 + r() * 20);
        }
        g.fillStyle = "rgba(0, 0, 0, 0.5)";
        for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 3, 128);
      });
      // A strip between two edges along the track, from s0 to s1. `edge`
      // gives the two ends of each cross-section.
      const strips = [];
      const strip = (s0, s1, segs, mat, edge) => {
        const pos = new Float32Array((segs + 1) * 6);
        const uv = [];
        const idx = [];
        for (let i = 0; i <= segs; i++) {
          const u = (s0 + ((s1 - s0) * i) / segs) / 20;
          uv.push(u, 0, u, 1);
          if (i < segs) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        const st = { mesh, s0, s1, segs, edge };
        strips.push(st);
        return st;
      };
      const layStrip = (st, shift = 0) => {
        const pos = st.mesh.geometry.attributes.position;
        for (let i = 0; i <= st.segs; i++) {
          const s = st.s0 + ((st.s1 - st.s0) * i) / st.segs + shift;
          const [a, b] = st.edge(s);
          pos.setXYZ(i * 2, a.x, a.y, a.z);
          pos.setXYZ(i * 2 + 1, b.x, b.y, b.z);
        }
        pos.needsUpdate = true;
      };
      // The viaduct: a deck under the train and a low concrete parapet on
      // each side, bent with the track.
      const SEGS = Q.density < 0.5 ? 60 : 120;
      const parapetMat = new THREE.MeshBasicMaterial({ map: wallTex, color: 0x6a6660, side: THREE.DoubleSide });
      tunnel.add(
        strip(-SPAN, SPAN, SEGS, new THREE.MeshBasicMaterial({ color: 0x151517, side: THREE.DoubleSide }), (s) => [at(s, N_NEAR - 0.3, -0.9), at(s, N_FAR + 0.3, -0.9)]).mesh,
        strip(-SPAN, SPAN, SEGS, parapetMat, (s) => [at(s, N_NEAR - 0.3, -0.9), at(s, N_NEAR - 0.3, 0.15)]).mesh,
        strip(-SPAN, SPAN, SEGS, parapetMat, (s) => [at(s, N_FAR + 0.3, -0.9), at(s, N_FAR + 0.3, 0.15)]).mesh,
      );

      // The viaduct's posts, each with an arm over the track and a lamp,
      // streaming past along the curve; two real lights ride with whichever
      // is nearest, so bands of light sweep through the car.
      const SPEED = 17;
      const lamps = [];
      const postMat = new THREE.MeshStandardMaterial({ color: 0x2d3034, metalness: 0.6, roughness: 0.6 });
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
      for (let i = 0; i < 10; i++) {
        const side = i % 2;
        const lamp = new THREE.Group();
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 15.2, 0.24), postMat);
        post.position.y = STREET + 7.6;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.0), postMat);
        arm.position.set(0, 3.0, side ? -0.5 : 0.5);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.18), lampMat);
        head.position.set(0, 2.92, side ? -0.85 : 0.85);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffcf90, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.scale.set(2.2, 1.4, 1);
        glow.position.copy(head.position);
        lamp.add(post, arm, head, glow);
        tunnel.add(lamp);
        lamps.push({ lamp, side, s: -60 + i * 12 + side * 6, n: side ? N_FAR + 0.45 : N_NEAR - 0.45 });
      }
      const sweepers = [0, 1].slice(0, Q.density < 0.5 ? 1 : 2).map((side) => {
        const l = new THREE.PointLight(0xffd8a0, 6, 9, 1.4);
        tunnel.add(l);
        return { l, side };
      });
      const SIGNAL = [0xff3b30, 0x34d058, 0xffb02e];
      const signals = Array.from({ length: 5 }, (_, i) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: SIGNAL[i % 3], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        sp.scale.setScalar(0.5);
        tunnel.add(sp);
        return { sp, s: -60 + i * 27, n: i % 2 ? N_FAR + 0.2 : N_NEAR - 0.2, y: 0.4 + (i % 2) * 1.4 };
      });
      // A train going the other way: a long lit flank on the other track,
      // bent to the curve, and a flash of light as it passes.
      const flankTex = canvasTex(512, 64, (g) => {
        g.fillStyle = "#3a3d42";
        g.fillRect(0, 0, 512, 64);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = "#fff4d6";
          g.fillRect(14 + i * 64, 14, 40, 22);
        }
      });
      flankTex.wrapS = THREE.RepeatWrapping;
      const other = strip(-24, 24, 24, new THREE.MeshBasicMaterial({ map: flankTex, side: THREE.DoubleSide }), (s) => [at(s, N_OTHER, -0.4), at(s, N_OTHER, 2.6)]);
      other.mesh.visible = false;
      tunnel.add(other.mesh);
      const flash = new THREE.PointLight(0xfff0d0, 0, 14, 1.3);
      tunnel.add(flash);
      const passing = { next: 14, start: -100 };

      // ---------- The city ----------
      // Laid out in a straight frame along the middle car (x along the line,
      // z across it); each layer slides past and wraps round seamlessly.
      const city = new THREE.Group();
      R.add(city);
      const sky = new THREE.Group();
      const MOON = new THREE.Vector3(-0.55, 0.32, -0.77).normalize();
      sky.add(skyDome({ top: 0x05060d, mid: 0x13131f, low: 0x4a2f22, sunDir: MOON, glow: [0.5, 0.5, 0.6], tight: 90, spread: 9, glowAmt: [0.4, 0.06] }));
      {
        const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: 0xd8d2c0, depthWrite: false, fog: false, transparent: true }));
        moon.position.copy(MOON).multiplyScalar(1290);
        moon.scale.setScalar(70);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x3a3a52, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
        halo.position.copy(MOON).multiplyScalar(1300);
        halo.scale.setScalar(360);
        moon.renderOrder = halo.renderOrder = -1;
        sky.add(halo, moon);
        // Low cloud, lit orange from the streets below.
        const cloudTex = canvasTex(256, 128, (g) => {
          const r = rng(19);
          for (let i = 0; i < 24; i++) {
            const x = 30 + r() * 196;
            const y = 40 + r() * 50;
            const rad = 18 + r() * 40;
            const blob = g.createRadialGradient(x, y, 0, x, y, rad);
            blob.addColorStop(0, "rgba(255, 255, 255, 0.4)");
            blob.addColorStop(1, "rgba(255, 255, 255, 0)");
            g.fillStyle = blob;
            g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
          }
        }, { repeat: false });
        const r = rng(23);
        for (let i = 0; i < 10; i++) {
          const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0x6a4a3a, depthWrite: false, fog: false, transparent: true, opacity: 0.6 }));
          const a = r() * Math.PI * 2;
          const el = THREE.MathUtils.degToRad(6 + r() * 14);
          c.position.set(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el)).multiplyScalar(1250);
          c.scale.set(500 + r() * 400, 160 + r() * 80, 1);
          c.renderOrder = -1;
          sky.add(c);
        }
      }
      R.add(sky);

      // Facades: lit windows in a grid, some dark, some flickering blue with
      // a television, on a near-black wall. One texture covers a block about
      // 24 m wide and 48 m tall.
      const facade = (seed, lit) => {
        const t = canvasTex(128, 256, (g) => {
          const r = rng(seed);
          g.fillStyle = "#0d0d12";
          g.fillRect(0, 0, 128, 256);
          for (let row = 0; row < 16; row++) {
            for (let col = 0; col < 8; col++) {
              const on = r() < lit;
              const c = r();
              g.fillStyle = !on ? "#17171d" : c < 0.75 ? `rgb(${230 + r() * 25}, ${170 + r() * 50}, ${90 + r() * 40})` : c < 0.9 ? "#f2efe0" : "#7fa6e6";
              g.fillRect(4 + col * 15.5, 6 + row * 15.5, 9, 10);
            }
          }
        }, { repeat: false });
        return t;
      };
      const roofMat = new THREE.MeshBasicMaterial({ color: 0x08080b });
      const unitBox = new THREE.BoxGeometry(1, 1, 1);
      unitBox.translate(0, 0.5, 0);
      // One layer of buildings: `P` metres long, repeated, `n0`–`n1` metres
      // either side of the line.
      const layers = [];
      function layer({ seed, P, n0, n1, every, w, d, h, tint, lit, count }) {
        const r = rng(seed);
        const spots = [];
        for (const side of [-1, 1]) {
          for (let x = 0; x < P; x += every * (0.7 + r() * 0.6)) {
            const n = side * (n0 + r() * (n1 - n0));
            const bw = w[0] + r() * (w[1] - w[0]);
            const bd = d[0] + r() * (d[1] - d[0]);
            const bh = h[0] + Math.pow(r(), 1.8) * (h[1] - h[0]);
            spots.push([x, n, bw, bd, bh, r()]);
          }
        }
        const take = Math.max(1, Math.round(spots.length * count));
        const used = spots.slice(0, take);
        const mats = [0, 1].map((k) => new THREE.MeshBasicMaterial({ map: facade(seed * 7 + k, lit), color: tint }));
        const group = new THREE.Group();
        for (const k of [0, 1]) {
          const mine = used.filter((sp) => (sp[5] < 0.5 ? 0 : 1) === k);
          if (!mine.length) continue;
          const mesh = new THREE.InstancedMesh(unitBox, [mats[k], mats[k], roofMat, roofMat, mats[k], mats[k]], mine.length * 3);
          const m = new THREE.Matrix4();
          let i = 0;
          for (const [x, n, bw, bd, bh] of mine) {
            for (const copy of [-1, 0, 1]) {
              m.makeScale(bw, bh, bd).setPosition(x + copy * P, STREET, CW / 2 + n);
              mesh.setMatrixAt(i++, m);
            }
          }
          mesh.frustumCulled = false;
          group.add(mesh);
        }
        city.add(group);
        layers.push({ group, P });
        return { group, used };
      }
      const D = Q.density;
      // Right below the line: low blocks, close enough to sweep past.
      const nearL = layer({ seed: 301, P: 420, n0: 20, n1: 60, every: 16, w: [10, 22], d: [10, 20], h: [4, 15], tint: 0xffffff, lit: 0.42, count: 1 });
      // A few hundred metres out: taller blocks, a little hazier.
      layer({ seed: 302, P: 900, n0: 110, n1: 300, every: 24, w: [14, 30], d: [14, 30], h: [14, 70], tint: 0xb9b3c4, lit: 0.36, count: D < 0.5 ? 0.6 : 1 });
      // The skyline on the horizon: towers, dim and blue with distance.
      const farL = layer({ seed: 303, P: 2400, n0: 420, n1: 950, every: 34, w: [20, 44], d: [20, 44], h: [50, 230], tint: 0x6c6a86, lit: 0.3, count: D < 0.5 ? 0.5 : 1 });

      // Red aircraft lights blinking on the tallest towers.
      const beacons = (() => {
        const pts = [];
        for (const [x, n, bw, bd, bh] of farL.used) {
          if (bh < 140) continue;
          for (const copy of [-1, 0, 1]) pts.push(x + copy * 2400, STREET + bh + 2, CW / 2 + n);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xff3020, size: 9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        p.frustumCulled = false;
        farL.group.add(p);
        return p;
      })();

      // Streets: a grid of sodium-lit roads far below, and street lamps in
      // rows along the avenues either side of the line.
      const streetTex = canvasTex(256, 256, (g) => {
        g.fillStyle = "#09090b";
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = "#2a1c10";
        g.fillRect(0, 118, 256, 20);
        g.fillRect(118, 0, 20, 256);
        g.fillStyle = "#4a3018";
        g.fillRect(0, 127, 256, 2);
        g.fillRect(127, 0, 2, 256);
      });
      streetTex.repeat.set(40, 40);
      const streets = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200), new THREE.MeshBasicMaterial({ map: streetTex }));
      streets.rotation.x = -Math.PI / 2;
      streets.position.set(0, STREET - 0.05, CW / 2);
      city.add(streets);
      const lampPts = [];
      for (const n of [-12, 12, -50, 50]) for (let x = 0; x < 420; x += 22) for (const copy of [-1, 0, 1]) lampPts.push(x + copy * 420, STREET + 7, CW / 2 + n);
      {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(lampPts, 3));
        const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xffa040, size: 4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        p.frustumCulled = false;
        nearL.group.add(p);
      }
      // Traffic on the avenue below: headlights one way, tail lights the other.
      const traffic = [[0xfff2d0, 9, 18], [0xff2a1a, -11, 23]].map(([color, speed, n]) => {
        const pts = [];
        const r = rng(n * 13);
        for (let x = 0; x < 420; x += 9 + r() * 30) for (const copy of [-1, 0, 1]) pts.push(x + copy * 420, STREET + 0.8, CW / 2 + n, x + copy * 420 + 0.1, STREET + 0.8, CW / 2 + n + 1.6);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color, size: 1.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        p.frustumCulled = false;
        city.add(p);
        return { p, speed, x: 0 };
      });
      // Two searchlights sweeping the clouds from far across the city.
      const beams = [[-700, -820], [600, 760]].map(([x, n], i) => {
        const len = 900;
        const geo = new THREE.CylinderGeometry(22, 1.5, len, 16, 1, true);
        geo.translate(0, len / 2, 0);
        const pos = geo.attributes.position;
        const cols = new Float32Array(pos.count * 3);
        for (let k = 0; k < pos.count; k++) {
          const v = 0.55 * (1 - pos.getY(k) / len);
          cols.set([v, v, v], k * 3);
        }
        geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
        const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x9aa4c8, vertexColors: true, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        beam.position.set(x, STREET, CW / 2 + n);
        beam.frustumCulled = false;
        city.add(beam);
        return { beam, phase: i * 2.1 };
      });
      let travelled = 0;
      function cityTick(t, dt) {
        sky.position.copy(R.camLocal);
        travelled += SPEED * dt;
        for (const L of layers) L.group.position.x = -(travelled % L.P);
        streetTex.offset.x = (travelled / 80) % 1;
        for (const tr of traffic) {
          tr.x = (tr.x + (tr.speed - SPEED) * dt) % 420;
          tr.p.position.x = tr.x > 0 ? tr.x - 420 : tr.x;
        }
        beacons.material.opacity = Math.sin(t * 3) > 0.2 ? 1 : 0.15;
        for (const b of beams) {
          b.beam.rotation.z = Math.sin(t * 0.12 + b.phase) * 0.45;
          b.beam.rotation.x = Math.sin(t * 0.09 + b.phase * 2) * 0.25;
        }
      }

      layout();

      // ---------- The riders ----------
      // They sit and stand in their cars and swing with them.
      const rand = rng(57);
      const people = [];
      const riderAt = [];
      const ride = (look, o, x, z, poseName, fx, fz, lean = 0) => {
        const entry = placePerson(R, look, toCar(o, x, z), poseName, toCar(o, fx, fz), { lean, phase: rand() * 10, glance: 0.03 });
        entry.focus = null;
        people.push(entry);
        riderAt.push([o, x, z]);
        return entry;
      };
      ride(randomLook(rand), 0, 2.45, CW - 0.32, "Asleep", 2.45, 0);
      ride({ height: 0.97, build: 1.0, skin: 3, hair: ["long", 0x1a1412], top: 0x6b4a8a, sleeves: "long", legs: 0x22303f, shoes: 0x1c1c1c, skirt: true }, 0, -2.6, 0.32, "Reading", -2.6, CW);
      const strapper = ride(randomLook(rand), 0, 6.9, 1.0, "Holding a strap", 0, 1.0);
      ride(randomLook(rand), -1, 3.1, 0.95, "Looking up", 3.1, 0);
      ride(randomLook(rand), -1, -4.0, CW - 0.32, "Reading", -4.0, 0);
      ride(randomLook(rand), 1, -6.6, 0.32, "Asleep", -6.6, CW);
      ride(randomLook(rand), 1, 3.2, 1.9, "Holding a strap", -5, 1.9);
      ride(randomLook(rand), 2, 1.5, CW - 0.32, "Asleep", 1.5, 0);
      ride(randomLook(rand), -2, -3.0, 1.9, "Looking up", -3.0, CW);
      // Each rider belongs to their car from now on.
      R.root.updateMatrixWorld(true);
      people.forEach((p, i) => carGroups[riderAt[i][0] + MID].attach(p.fig.root));
      for (const [o, x, z] of riderAt) blockerDefs.push([o, x, z, 0.3]);

      // Put every car, gangway, wall and blocker where the track says.
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
        for (const st of strips) if (st !== other) layStrip(st);
      }
      layout();

      // Which car you're standing in (or the gangway nearest), in its own
      // coordinates, so a swing can carry you with it.
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

      // The ride: sway and jolts, and the bend felt as a lean.
      const motionState = { bend: 0, sway: 0, swayV: 0, jolt: 0, nextJolt: 3, screech: 0 };
      const api = {
        floor: () => 0,
        walls,
        blockers,
        people,
        noShove: true,
        ride: motionState,
        cameraFx() {
          const s = motionState;
          const lean = s.bend * 0.35;
          const w = R.reg.dirToWorld(0, s.sway * 0.03 + lean * 0.4);
          return { x: w.x, y: s.jolt * 0.025, roll: s.sway * 0.012 + lean };
        },
        update(t, dt, info) {
          const s = motionState;
          const m = motion();
          // How hard the track is turning now; ride with your car as it swings.
          const bend = bendAt(performance.now() / 1000);
          const dBend = (bend - s.bend) / Math.max(dt, 1e-3);
          s.bend = bend;
          const before = info.here ? riding() : null;
          S.k = bend / L;
          layout();
          if (before) {
            const now = toCar(before.o, before.l.x, before.l.z);
            const you = R.player;
            R.nudgePlayer(now.x - you.x, now.z - you.z, frame(before.o).yaw - before.yaw);
          }
          s.screech = Math.min(1, Math.abs(bend) * 6 + Math.abs(dBend) * 20);
          // Snapping into a turn gives everyone a shove.
          if (Math.abs(dBend) > 0.05) s.jolt = Math.max(s.jolt, 0.8);
          s.swayV += dBend * dt * 25;
          const push = Math.sin(t * 1.3) * 0.6 + Math.sin(t * 2.9 + 1) * 0.3;
          s.swayV += (push - s.sway * 6) * dt - s.swayV * dt * 1.5;
          s.sway += s.swayV * dt;
          if (t > s.nextJolt) {
            s.jolt = 1;
            s.nextJolt = t + 2.5 + Math.random() * 5;
          }
          s.jolt *= Math.exp(-dt * 7);
          // The other cars rock a little out of step with yours.
          carGroups.forEach((car, i) => {
            if (i !== MID) car.rotation.x = Math.sin(t * 1.3 + i * 0.9) * 0.006 * m;
          });
          // Straps swing out toward the outside of the turn.
          for (const st of straps) {
            st.strap.rotation.x = (-s.sway * 0.35 - bend * 2.5 + Math.sin(t * 3 + st.phase) * 0.03) * st.k * m + s.jolt * 0.25 * Math.sin(t * 20 + st.phase) * m;
            st.strap.rotation.z = Math.sin(t * 2.2 + st.phase) * 0.06 * m;
          }
          strapper.fig.root.rotation.z = -s.sway * 0.03 * m;
          // Everything outside streams past along the curve.
          wallTex.offset.x -= (SPEED / 20) * dt;
          cityTick(t, dt);
          for (const Lp of lamps) {
            Lp.s -= SPEED * dt;
            if (Lp.s < -60) Lp.s += 120;
            const p = track(Lp.s, Lp.n);
            Lp.lamp.position.set(p.x, 0, p.z);
            Lp.lamp.rotation.y = p.yaw;
          }
          for (const sw of sweepers) {
            let best = null;
            for (const Lp of lamps) if (Lp.side === sw.side && (!best || Math.abs(Lp.s) < Math.abs(best.s))) best = Lp;
            sw.l.position.copy(at(best.s, sw.side ? N_FAR - 0.2 : N_NEAR + 0.2, 2.6));
          }
          for (const sg of signals) {
            sg.s -= SPEED * dt;
            if (sg.s < -67.5) {
              sg.s += 135;
              sg.sp.material.color.setHex(SIGNAL[Math.floor(Math.random() * 3)]);
            }
            sg.sp.position.copy(at(sg.s, sg.n, sg.y));
          }
          if (t > passing.next) { passing.start = t; passing.next = t + 25 + Math.random() * 25; api.passes.forEach((fn) => fn()); }
          const pa = t - passing.start;
          if (pa < 3) {
            const centre = 70 - pa * 55;
            layStrip(other, centre);
            flash.position.copy(at(centre, N_OTHER - 1.4, 1.2));
            flash.intensity = 30 * Math.max(0, 1 - Math.abs(centre) / 30);
            other.mesh.visible = true;
          } else {
            other.mesh.visible = false;
            flash.intensity = 0;
          }
          const fl = Math.sin(t * 13.1) * Math.sin(t * 3.7) > 0.55 && Math.random() < 0.5;
          flickerTube.material.color.setHex(fl ? 0x3a3c40 : 0xe6eedc);
          tubeLight.intensity = fl ? 0.4 : 3;
        },
        passes: [],
      };
      return api;
    },
    sound(A, R, api) {
      const s = api.ride;
      // A low rumble, the hum of the motors, the wheels clacking over rail
      // joints, a screech on the curves, and an announcement now and then.
      const rumble = A.gain(0.18);
      A.hiss().connect(A.filter("lowpass", 140, 0.7)).connect(rumble).connect(A.bus);
      const motor = A.gain(0.03);
      A.osc("sawtooth", 46).connect(A.filter("lowpass", 220)).connect(motor).connect(A.bus);
      const clackTone = A.filter("bandpass", 1600, 2.5);
      const clackAmp = A.gain(0);
      A.hiss().connect(clackTone).connect(clackAmp).connect(A.bus);
      const thump = A.osc("sine", 70);
      const thumpAmp = A.gain(0);
      thump.connect(thumpAmp).connect(A.bus);
      let joint = A.ctx.currentTime + 0.3;
      A.extras.push((until) => {
        joint = Math.max(joint, A.ctx.currentTime);
        while (joint < until) {
          // Two trucks over each joint: clack-clack ... clack-clack.
          for (const dt of [0, 0.13, 0.82, 0.95]) {
            const t = joint + dt;
            clackAmp.gain.setValueAtTime(0.0001, t);
            clackAmp.gain.linearRampToValueAtTime(0.22, t + 0.005);
            clackAmp.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
            thumpAmp.gain.setValueAtTime(0.0001, t);
            thumpAmp.gain.linearRampToValueAtTime(0.25, t + 0.008);
            thumpAmp.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          }
          joint += 1.06 + A.chance() * 0.08;
        }
      });
      const screechTone = A.filter("bandpass", 3600, 18);
      const screechAmp = A.gain(0);
      A.hiss().connect(screechTone).connect(screechAmp).connect(A.bus);
      const squeal = A.osc("sine", 3300);
      const squealAmp = A.gain(0);
      squeal.connect(squealAmp).connect(A.bus);

      // The announcement: a two-note chime, then a muffled voice through a
      // tinny speaker.
      const V = voiceKit(A);
      const speaker = A.filter("bandpass", 1300, 0.9);
      const speakerAmp = A.gain(0);
      speaker.connect(A.filter("highpass", 380)).connect(speakerAmp).connect(A.placed(0, 2.4, 1.45, 3, 0.6));
      const announcer = V.voice(speaker, true, { talk: 3 });
      const chime = A.osc("sine", 660);
      const chimeAmp = A.gain(0);
      chime.connect(chimeAmp).connect(A.bus);
      let ann = A.ctx.currentTime + 8;
      A.extras.push((until) => {
        ann = Math.max(ann, A.ctx.currentTime);
        while (ann < until) {
          chime.frequency.setValueAtTime(660, ann);
          chime.frequency.setValueAtTime(523, ann + 0.45);
          chimeAmp.gain.setTargetAtTime(0.08, ann, 0.02);
          chimeAmp.gain.setTargetAtTime(0, ann + 0.38, 0.05);
          chimeAmp.gain.setTargetAtTime(0.08, ann + 0.45, 0.02);
          chimeAmp.gain.setTargetAtTime(0, ann + 0.9, 0.08);
          speakerAmp.gain.setTargetAtTime(0.55, ann + 1.1, 0.05);
          speakerAmp.gain.setTargetAtTime(0, ann + 4.6, 0.2);
          ann += 38 + A.chance() * 30;
        }
      });
      announcer.amp.gain.value = 1;
      const whoosh = A.gain(0);
      A.hiss().connect(A.filter("bandpass", 500, 0.6)).connect(whoosh).connect(A.bus);
      api.passes.push(() => {
        const now = A.ctx.currentTime;
        whoosh.gain.setTargetAtTime(0.4, now + 0.6, 0.3);
        whoosh.gain.setTargetAtTime(0, now + 1.8, 0.4);
      });
      return {
        update() {
          const now = A.ctx.currentTime;
          screechAmp.gain.setTargetAtTime(s.screech * 0.05, now, 0.3);
          squealAmp.gain.setTargetAtTime(s.screech * 0.012, now, 0.3);
          squeal.frequency.setTargetAtTime(3100 + Math.sin(now * 3) * 200, now, 0.2);
          rumble.gain.setTargetAtTime(0.16 + Math.abs(s.sway) * 0.08, now, 0.2);
        },
      };
    },
  };
