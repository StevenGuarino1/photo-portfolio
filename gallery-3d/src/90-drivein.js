  // ---------- The Drive-in ----------
  // An abandoned drive-in at night. You come in through a gap in the
  // chain-link by a half-lit marquee: an overgrown gravel lot of parking
  // mounds and leaning speaker poles, a cinder-block projection booth in
  // the middle, and at the far end a huge weathered screen. The projector
  // still runs, showing the photos one after another through the fog.

  ROOMS.drivein = {
    name: "The Drive-in",
    short: "Drive-in",
    tagline: "Now showing, on the big screen",
    color: 0xb6a8ff,
    leak: 0xa79cf0,
    leakStyle: "flicker",
    frame: 0x6b6f75,
    fogColor: 0x10121a,
    loudness: 2.2,
    ground: "gravel",
    entrance: { x: 0, z: 0, nx: 0, nz: -1 },
    spawn: { x: 0, z: 2.2, yaw: Math.PI, pitch: 0.12 },
    spots: { front: { name: "Front Row", x: 1.5, z: 40.5, yaw: Math.PI, pitch: 0.2 } },
    build(R) {
      const LOT = { x0: -30, x1: 30, z0: 0, z1: 66 };
      const SCREEN = { z: 64, y: 4.2, w: 30, h: 14 };
      const BOOTH = { x: 0, z: 32, w: 8, d: 6, h: 3.2 };
      const ROWS = [12, 18, 24, 42, 48, 54];
      function ground(x, z) {
        let y = Math.sin(x * 0.4 + z * 0.3) * 0.03;
        for (const rz of ROWS) {
          const c = rz + x * x * 0.003;
          y += 0.32 * Math.exp(-((z - c) ** 2) / 2.4);
        }
        return y;
      }

      R.scene.fog = new THREE.FogExp2(0x10121a, 0.012);
      const MOON = new THREE.Vector3(0.75, 0.14, 0.62).normalize();
      R.add(new THREE.HemisphereLight(0x6a78a4, 0x2a2620, 1.15));
      // The moon sits low on the horizon, but its light falls from higher up,
      // or the lot would be lit edge-on and read as black.
      const moonlight = new THREE.DirectionalLight(0xa9b8dc, 0.9);
      moonlight.position.set(0, 0, 30).addScaledVector(new THREE.Vector3(0.62, 0.5, 0.6).normalize(), 80);
      moonlight.target.position.set(0, 0, 30);
      R.shadows(moonlight, 45, 200);
      R.add(moonlight, moonlight.target);

      // A clear night: a few stars, a low moon.
      const sky = new THREE.Group();
      sky.add(skyDome({ top: 0x04070f, mid: 0x0b1122, low: 0x1b2032, sunDir: MOON, glow: [0.45, 0.5, 0.7], tight: 80, spread: 10, glowAmt: [0.3, 0.05] }));
      {
        const pts = [];
        const r = rng(19);
        while (pts.length < 600 * 3) {
          const v = new THREE.Vector3(r() * 2 - 1, r(), r() * 2 - 1);
          if (v.lengthSq() > 1 || v.y < 0.1) continue;
          v.normalize().multiplyScalar(1400);
          pts.push(v.x, v.y, v.z);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8, depthWrite: false }));
        stars.frustumCulled = false;
        stars.renderOrder = -1;
        const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: 0xe0dccf, depthWrite: false, fog: false, transparent: true }));
        moon.position.copy(MOON).multiplyScalar(1290);
        moon.scale.setScalar(80);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x3d4670, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
        halo.position.copy(MOON).multiplyScalar(1300);
        halo.scale.setScalar(380);
        moon.renderOrder = halo.renderOrder = -1;
        sky.add(stars, halo, moon);
      }
      R.add(sky);

      // The lot: cracked asphalt gone to gravel, the parking mounds in arcs
      // facing the screen.
      const asphalt = canvasTex(512, 512, (g) => {
        const r = rng(29);
        g.fillStyle = "#4a4a47";
        g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 5000; i++) {
          const v = 50 + r() * 70;
          g.fillStyle = `rgba(${v}, ${v - 4}, ${v - 8}, ${0.25 + r() * 0.3})`;
          g.fillRect(r() * 512, r() * 512, 2, 2);
        }
        g.strokeStyle = "rgba(10, 10, 10, 0.7)";
        for (let i = 0; i < 18; i++) {
          let x = r() * 512;
          let y = r() * 512;
          g.lineWidth = 1 + r() * 2;
          g.beginPath();
          g.moveTo(x, y);
          for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); }
          g.stroke();
        }
      });
      asphalt.repeat.set(14, 18);
      {
        const geo = new THREE.PlaneGeometry(140, 160, Q.density < 0.5 ? 70 : 140, Q.density < 0.5 ? 80 : 160);
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, 0, 33);
        const p = geo.attributes.position;
        const cols = [];
        const r = rng(31);
        const a = new THREE.Color(0xc4c0b6);
        const b = new THREE.Color(0x7d8a64);
        const c = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const z = p.getZ(i);
          p.setY(i, ground(x, z));
          const outside = Math.abs(x) > LOT.x1 || z > LOT.z1 + 4 || z < 0;
          c.copy(a).lerp(b, outside ? 0.9 : r() * 0.45);
          cols.push(c.r, c.g, c.b);
        }
        geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
        geo.computeVertexNormals();
        const lot = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: asphalt, vertexColors: true }));
        lot.receiveShadow = true;
        R.add(lot);
      }

      const walls = [];
      const blockers = [];
      const chainMat = new THREE.MeshLambertMaterial({
        map: canvasTex(64, 64, (g) => {
          g.strokeStyle = "#7d838a";
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(0, 0); g.lineTo(64, 64);
          g.moveTo(64, 0); g.lineTo(0, 64);
          g.stroke();
        }),
        transparent: true,
        alphaTest: 0.3,
        side: THREE.DoubleSide,
      });
      const fence = (x0, z0, x1, z1) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const geo = scaleUV(new THREE.PlaneGeometry(len, 2.1), len / 0.12, 2.1 / 0.12);
        const m = new THREE.Mesh(geo, chainMat);
        m.position.set((x0 + x1) / 2, 1.05, (z0 + z1) / 2);
        m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        R.add(m);
        for (let d = 0; d <= len; d += 3) {
          const k = d / len;
          R.add(part(new THREE.CylinderGeometry(0.04, 0.04, 2.25, 5), 0x5b6066, x0 + (x1 - x0) * k, 1.12, z0 + (z1 - z0) * k));
        }
        R.add(Object.assign(part(new THREE.CylinderGeometry(0.025, 0.025, len, 4), 0x5b6066, (x0 + x1) / 2, 2.1, (z0 + z1) / 2), {}));
        const rail = R.root.children[R.root.children.length - 1];
        rail.rotation.z = Math.PI / 2;
        rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        walls.push([x0, z0, x1, z1]);
      };
      fence(LOT.x0, 0, -DOOR_HALF - 0.1, 0);
      fence(DOOR_HALF + 0.1, 0, LOT.x1, 0);
      fence(LOT.x0, 0, LOT.x0, LOT.z1 + 4);
      fence(LOT.x1, 0, LOT.x1, LOT.z1 + 4);
      fence(LOT.x0, LOT.z1 + 4, LOT.x1, LOT.z1 + 4);
      const gate = doorFrame(0x6b6f75, DOOR_HALF, DOOR_H, 0.12, 0.08);
      R.add(gate);

      // A dark treeline all round outside the fence.
      {
        const tree = new THREE.ConeGeometry(1.6, 6, 6);
        tree.translate(0, 3, 0);
        const n = R.density(150);
        const trees = new THREE.InstancedMesh(tree, new THREE.MeshLambertMaterial({ color: 0x0c140f, flatShading: true }), n);
        const r = rng(37);
        const m = new THREE.Matrix4();
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2;
          let x;
          let z;
          do {
            x = Math.cos(a) * (36 + r() * 14);
            z = 33 + Math.sin(a) * (42 + r() * 14);
          } while (Math.abs(x) < LOT.x1 + 3 && z > -3 && z < LOT.z1 + 7);
          const s = 0.8 + r() * 0.9;
          m.makeScale(s, s * (0.8 + r() * 0.6), s).setPosition(x, 0, z);
          trees.setMatrixAt(i, m);
        }
        R.add(trees);
      }

      // The marquee by the gate: half its bulbs dead.
      const marquee = new THREE.Group();
      {
        for (const x of [-2.6, 2.6]) marquee.add(part(new THREE.BoxGeometry(0.22, 4.4, 0.22), 0x3a3d42, x, 2.2, 0));
        marquee.add(part(new THREE.BoxGeometry(6, 2.1, 0.35), 0x23252a, 0, 4.3, 0));
        const face = labelMesh(["NOW SHOWING", "Photographs by Steven Guarino", "Open every night · No admission"], "film", 5.4);
        face.scale.y = 1.9 / 2.7;
        face.position.set(0, 4.3, -0.18);
        face.rotation.y = Math.PI;
        marquee.add(face);
        const bulbs = [];
        for (let i = 0; i < 26; i++) {
          const k = i / 26;
          const along = k * 2 * (6 + 2.1);
          let x;
          let y;
          if (along < 6) { x = -3 + along; y = 5.35; } else if (along < 8.1) { x = 3; y = 5.35 - (along - 6); } else if (along < 14.1) { x = 3 - (along - 8.1); y = 3.25; } else { x = -3; y = 3.25 + (along - 14.1); }
          const lit = x < 0.4 || i % 5 === 0;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: lit ? 0xffd27a : 0x3a332a }));
          bulb.position.set(x, y, -0.2);
          marquee.add(bulb);
          if (lit) bulbs.push(bulb);
        }
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x5a4220, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.position.set(-1.4, 4.3, -0.6);
        glow.scale.set(6, 3.5, 1);
        marquee.add(glow);
        marquee.userData.bulbs = bulbs;
        marquee.position.set(-6.5, 0, 5);
        marquee.rotation.y = 0.35;
        R.add(marquee);
        for (const x of [-2.6, 2.6]) {
          const w = new THREE.Vector3(x, 0, 0).applyEuler(marquee.rotation).add(marquee.position);
          blockers.push({ x: w.x, z: w.z, r: 0.25 });
        }
      }

      // The screen: weathered panels on a steel frame, a few gone.
      const screenGroup = new THREE.Group();
      screenGroup.position.set(0, 0, SCREEN.z);
      R.add(screenGroup);
      const panelTex = canvasTex(256, 256, (g) => {
        const r = rng(43);
        g.fillStyle = "#cfcbc0";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 60; i++) {
          g.fillStyle = `rgba(${90 + r() * 40}, ${80 + r() * 30}, ${60 + r() * 20}, ${0.08 + r() * 0.2})`;
          g.beginPath();
          g.ellipse(r() * 256, r() * 256, 4 + r() * 30, 2 + r() * 10, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
        for (let i = 0; i < 12; i++) {
          g.fillStyle = "rgba(60, 55, 45, 0.25)";
          g.fillRect(r() * 256, 0, 2 + r() * 3, 256);
        }
      }, { repeat: false });
      const panelMat = new THREE.MeshLambertMaterial({ map: panelTex });
      const PW = 3;
      const PH = 2.8;
      const missing = new Set(["0,4", "9,4", "8,4", "0,0", "9,3"]);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 5; j++) {
          if (missing.has(`${i},${j}`)) continue;
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.03, PH - 0.03), panelMat);
          panel.position.set(-SCREEN.w / 2 + PW * (i + 0.5), SCREEN.y + PH * (j + 0.5), 0);
          panel.rotation.y = Math.PI;
          panel.rotation.x = (i * 7 + j * 3) % 5 === 0 ? 0.03 : 0;
          screenGroup.add(panel);
        }
      }
      // The frame behind: legs, cross-beams, braces.
      {
        const parts = [];
        const beam = (x, y, z, w, h, d, rz = 0) => {
          const g = new THREE.BoxGeometry(w, h, d);
          g.rotateZ(rz);
          g.translate(x, y, z);
          parts.push(g);
        };
        for (let i = 0; i <= 5; i++) beam(-SCREEN.w / 2 + i * 6, (SCREEN.y + SCREEN.h) / 2, 0.6, 0.25, SCREEN.y + SCREEN.h, 0.25);
        for (let j = 0; j <= 3; j++) beam(0, SCREEN.y + j * (SCREEN.h / 3), 0.6, SCREEN.w, 0.18, 0.18);
        for (let i = 0; i < 5; i++) beam(-SCREEN.w / 2 + i * 6 + 3, SCREEN.y + SCREEN.h / 2, 0.75, 0.12, 15, 0.12, (i % 2 ? 1 : -1) * 0.38);
        for (let i = 0; i <= 5; i++) beam(-SCREEN.w / 2 + i * 6, SCREEN.y / 2, 2.2, 0.2, SCREEN.y, 0.2, 0);
        const frame = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ color: 0x3e3a35, flatShading: true }));
        frame.castShadow = Q.shadow > 0;
        screenGroup.add(frame);
        for (let i = 0; i <= 5; i++) blockers.push({ x: -SCREEN.w / 2 + i * 6, z: SCREEN.z + 0.6, r: 0.3 });
      }

      // The picture on it: two planes crossfading, flickering slightly, with
      // a fine grain over the top.
      const slides = PHOTOS.filter((p) => p.w > p.h).map((p) => p.stem);
      const showA = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false, fog: false, transparent: true, opacity: 1 }));
      const showB = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false, fog: false, transparent: true, opacity: 0 }));
      for (const s of [showA, showB]) {
        s.position.set(0, SCREEN.y + SCREEN.h / 2 + 0.3, -0.14);
        s.rotation.y = Math.PI;
        screenGroup.add(s);
      }
      const grainTex = canvasTex(128, 128, (g) => {
        const img = g.createImageData(128, 128);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() * 255;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
      }, { srgb: false });
      grainTex.repeat.set(6, 3);
      const grain = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w * 0.66, SCREEN.h * 0.9), new THREE.MeshBasicMaterial({ map: grainTex, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      grain.position.set(0, SCREEN.y + SCREEN.h / 2 + 0.3, -0.2);
      grain.rotation.y = Math.PI;
      screenGroup.add(grain);
      const screenPhoto = { mesh: showA, photo: PHOTO[slides[0]], w: 18, h: 12 };
      R.reg.photos.push(screenPhoto);
      function setSlide(mesh, stem) {
        const P = PHOTO[stem];
        const h = 12.6;
        const w = Math.min(SCREEN.w - 2, (h * P.w) / P.h);
        mesh.scale.set(w, (w * P.h) / P.w, 1);
        mesh.material.map = photoTexture(stem, R.reg);
        mesh.material.needsUpdate = true;
        return P;
      }
      const show = { i: 0, next: 12, fade: 1, front: showA, back: showB };
      setSlide(showA, slides[0]);
      // The light from the screen, washing faintly over the lot.
      const screenGlow = new THREE.PointLight(0xc9d2ff, 22, 70, 1.2);
      screenGlow.position.set(0, 3, SCREEN.z - 16);
      R.add(screenGlow);

      // The booth: cinder block, a projection window toward the screen, a
      // dead snack-bar sign, and the beam reaching out through the fog.
      const blockTex = canvasTex(256, 128, (g) => {
        g.fillStyle = "#77746c";
        g.fillRect(0, 0, 256, 128);
        g.fillStyle = "rgba(40, 38, 34, 0.55)";
        for (let row = 0; row < 8; row++) {
          g.fillRect(0, row * 16, 256, 2);
          for (let k = 0; k < 6; k++) g.fillRect(((k + (row % 2) * 0.5) * 256) / 6, row * 16, 2, 16);
        }
      });
      blockTex.repeat.set(3, 1.5);
      const booth = new THREE.Mesh(new THREE.BoxGeometry(BOOTH.w, BOOTH.h, BOOTH.d), new THREE.MeshLambertMaterial({ map: blockTex }));
      booth.position.set(BOOTH.x, BOOTH.h / 2, BOOTH.z);
      booth.castShadow = Q.shadow > 0;
      booth.receiveShadow = true;
      R.add(booth, part(new THREE.BoxGeometry(BOOTH.w + 0.5, 0.15, BOOTH.d + 0.5), 0x2e2c28, BOOTH.x, BOOTH.h + 0.07, BOOTH.z));
      const WIN = new THREE.Vector3(0, 2.4, BOOTH.z + BOOTH.d / 2 + 0.01);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff1cf }));
      win.position.copy(WIN);
      R.add(win);
      const boothLight = new THREE.PointLight(0xffd59a, 3, 8, 1.6);
      boothLight.position.copy(WIN).add(new THREE.Vector3(0, 0, 0.6));
      R.add(boothLight);
      // The snack bar's counter shutter, closed, and its dead sign.
      R.add(part(new THREE.BoxGeometry(3.4, 1.0, 0.05), 0x55524a, 0, 1.4, BOOTH.z - BOOTH.d / 2 - 0.02));
      const snack = labelMesh(["SNACK BAR", "Closed", ""], "film", 2.2);
      snack.position.set(0, 2.55, BOOTH.z - BOOTH.d / 2 - 0.03);
      snack.rotation.y = Math.PI;
      R.add(snack);
      walls.push(
        [BOOTH.x - BOOTH.w / 2, BOOTH.z - BOOTH.d / 2, BOOTH.x + BOOTH.w / 2, BOOTH.z - BOOTH.d / 2],
        [BOOTH.x - BOOTH.w / 2, BOOTH.z + BOOTH.d / 2, BOOTH.x + BOOTH.w / 2, BOOTH.z + BOOTH.d / 2],
        [BOOTH.x - BOOTH.w / 2, BOOTH.z - BOOTH.d / 2, BOOTH.x - BOOTH.w / 2, BOOTH.z + BOOTH.d / 2],
        [BOOTH.x + BOOTH.w / 2, BOOTH.z - BOOTH.d / 2, BOOTH.x + BOOTH.w / 2, BOOTH.z + BOOTH.d / 2],
      );
      // The card by the booth with what's showing.
      const cardStand = new THREE.Group();
      cardStand.add(part(new THREE.BoxGeometry(0.08, 1.2, 0.08), 0x3a3d42, 0, 0.6, 0));
      let card = labelMesh(labelLines(PHOTO[slides[0]]), "film", 0.7);
      card.position.set(0, 1.35, -0.05);
      card.rotation.y = Math.PI;
      cardStand.add(card);
      cardStand.position.set(BOOTH.x + BOOTH.w / 2 + 1.2, 0, BOOTH.z - BOOTH.d / 2 - 0.8);
      cardStand.rotation.y = 0.3;
      R.add(cardStand);
      blockers.push({ x: cardStand.position.x, z: cardStand.position.z, r: 0.15 });

      // The beam: a long soft cone from the window to the screen, with dust
      // drifting through it.
      const target = new THREE.Vector3(0, SCREEN.y + SCREEN.h / 2 + 0.3, SCREEN.z);
      const beamLen = WIN.distanceTo(target);
      const beamGeo = new THREE.CylinderGeometry(9.5, 0.2, beamLen, 24, 1, true);
      beamGeo.translate(0, beamLen / 2, 0);
      beamGeo.rotateX(Math.PI / 2);
      // Fade the beam out toward the screen with vertex colours.
      {
        const pos = beamGeo.attributes.position;
        const cols = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          const k = pos.getZ(i) / beamLen;
          const v = 0.7 * (1 - smooth(k, 0.35, 0.8));
          cols.set([v, v, v * 1.1], i * 3);
        }
        beamGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      }
      const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0x7d86b8, vertexColors: true, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.copy(WIN);
      beam.lookAt(target);
      R.add(beam);
      const DUST = R.density(500);
      const dustPos = new Float32Array(DUST * 3);
      const dustSeed = [];
      const dir = new THREE.Vector3().subVectors(target, WIN).normalize();
      const side1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const side2 = new THREE.Vector3().crossVectors(side1, dir).normalize();
      for (let i = 0; i < DUST; i++) dustSeed.push([Math.random(), Math.random() * Math.PI * 2, Math.sqrt(Math.random()), Math.random() * 10]);
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xcfd6ff, size: 0.12, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      dust.frustumCulled = false;
      R.add(dust);
      // Moths at the booth window.
      const mothMat = new THREE.MeshBasicMaterial({ color: 0xbdb5a3, side: THREE.DoubleSide });
      const moths = Array.from({ length: 5 }, (_, i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), mothMat);
        R.add(m);
        return { m, a: 1.3 + i * 0.4, b: 2.2 + i * 0.3, phase: i * 1.3 };
      });

      // Speaker poles along the mounds, some leaning, some knocked flat.
      const poles = [];
      {
        const r = rng(47);
        for (const rz of ROWS) {
          for (let x = -24; x <= 24; x += 6) {
            if (Math.abs(x) < BOOTH.w / 2 + 1 && Math.abs(rz - BOOTH.z) < 6) continue;
            const z = rz + x * x * 0.003;
            const state = r();
            poles.push({ x, z, tilt: state < 0.12 ? 1.45 : state < 0.3 ? 0.25 + r() * 0.3 : (r() - 0.5) * 0.08, turn: r() * Math.PI * 2 });
          }
        }
        const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.45, 6);
        poleGeo.translate(0, 0.72, 0);
        const boxGeo = new THREE.BoxGeometry(0.28, 0.22, 0.12);
        boxGeo.translate(0, -0.14, 0.05);
        const poleMesh = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x6d4a34 }), poles.length);
        const boxMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x4a4f4a }), poles.length * 2);
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const e = new THREE.Euler();
        poles.forEach((p, i) => {
          e.set(0, p.turn, p.tilt, "YXZ");
          q.setFromEuler(e);
          m.compose(new THREE.Vector3(p.x, ground(p.x, p.z) - 0.05, p.z), q, new THREE.Vector3(1, 1, 1));
          poleMesh.setMatrixAt(i, m);
          for (const s of [-1, 1]) {
            const hook = new THREE.Vector3(s * 0.18, 1.32, 0).applyQuaternion(q).add(new THREE.Vector3(p.x, ground(p.x, p.z), p.z));
            const hang = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15 * s, p.turn + (s > 0 ? 0 : Math.PI), 0));
            m.compose(p.tilt > 1 ? new THREE.Vector3(hook.x, 0.1, hook.z) : hook, hang, new THREE.Vector3(1, 1, 1));
            boxMesh.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m);
          }
          if (p.tilt < 1) blockers.push({ x: p.x, z: p.z, r: 0.12 });
        });
        poleMesh.castShadow = boxMesh.castShadow = Q.shadow > 0;
        R.add(poleMesh, boxMesh);
      }

      // Weeds through the gravel.
      {
        const tuft = new THREE.ConeGeometry(0.08, 0.4, 3);
        tuft.translate(0, 0.18, 0);
        const n = R.density(3000);
        const weeds = new THREE.InstancedMesh(tuft, new THREE.MeshLambertMaterial({ color: 0x3f4a2c, flatShading: true }), n);
        const r = rng(53);
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        for (let i = 0; i < n; i++) {
          const x = (r() - 0.5) * 2 * (LOT.x1 - 0.5);
          const z = 0.5 + r() * (LOT.z1 - 1);
          q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.7, r() * 6, (r() - 0.5) * 0.7));
          m.compose(new THREE.Vector3(x, ground(x, z) - 0.03, z), q, new THREE.Vector3(1, 0.5 + r() * 1.3, 1));
          weeds.setMatrixAt(i, m);
        }
        R.add(weeds);
      }

      // An old car facing the screen, two people sat on its hood.
      const CAR = { x: -6.5, z: 47.4 };
      {
        const car = new THREE.Group();
        const paint = 0x4c7a78;
        const rust = 0x6a3b2a;
        car.add(part(new THREE.BoxGeometry(1.95, 0.62, 4.9), paint, 0, 0.62, 0));
        car.add(part(new THREE.BoxGeometry(1.7, 0.55, 2.3), paint, 0, 1.2, -0.35));
        car.add(part(new THREE.BoxGeometry(1.62, 0.42, 2.2), 0x101214, 0, 1.22, -0.35));
        car.add(part(new THREE.BoxGeometry(2.0, 0.12, 0.25), 0xa9a49a, 0, 0.42, 2.45));
        car.add(part(new THREE.BoxGeometry(2.0, 0.12, 0.25), 0xa9a49a, 0, 0.42, -2.45));
        for (const s of [-1, 1]) {
          car.add(part(new THREE.BoxGeometry(0.1, 0.3, 1.2), paint, s * 0.95, 1.0, -2.0));
          car.add(part(new THREE.BoxGeometry(0.4, 0.3, 0.5), rust, s * 0.75, 0.75, 1.6));
          for (const z of [-1.5, 1.5]) {
            const wheel = part(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 10), 0x141414, s * 0.92, 0.36, z);
            wheel.rotation.z = Math.PI / 2;
            car.add(wheel);
          }
        }
        car.add(part(new THREE.BoxGeometry(0.5, 0.18, 0.05), 0xe8dfa8, -0.55, 0.72, 2.46), part(new THREE.BoxGeometry(0.5, 0.18, 0.05), 0xe8dfa8, 0.55, 0.72, 2.46));
        car.position.set(CAR.x, ground(CAR.x, CAR.z), CAR.z);
        car.rotation.y = 0.05;
        car.traverse((o) => { if (o.isMesh) o.castShadow = Q.shadow > 0; });
        R.add(car);
        walls.push([CAR.x - 1.05, CAR.z - 2.5, CAR.x + 1.05, CAR.z - 2.5], [CAR.x - 1.05, CAR.z + 2.5, CAR.x + 1.05, CAR.z + 2.5], [CAR.x - 1.05, CAR.z - 2.5, CAR.x - 1.05, CAR.z + 2.5], [CAR.x + 1.05, CAR.z - 2.5, CAR.x + 1.05, CAR.z + 2.5]);
      }

      // The audience.
      const rand = rng(61);
      const people = [];
      const screenAt = { x: 0, z: SCREEN.z };
      const hoodY = ground(CAR.x, CAR.z) + 0.95;
      people.push(placePerson(R, randomLook(rand), { x: CAR.x - 0.45, z: CAR.z + 1.6, y: 0 }, { ...POSES.find((p) => p.name === "On the hood"), seat: hoodY }, screenAt, { glance: 0.04 }));
      people.push(placePerson(R, { height: 0.95, build: 0.95, skin: 2, hair: ["ponytail", 0x6e3b1f], top: 0xb8443a, sleeves: "long", legs: 0x3a3f6b, shoes: 0xe9e4da }, { x: CAR.x + 0.45, z: CAR.z + 1.6, y: 0 }, { ...POSES.find((p) => p.name === "On the hood"), seat: hoodY }, screenAt, { glance: 0.04 }));
      people.push(placePerson(R, randomLook(rand), { x: 12.6, z: 42.6 }, "Hands on hips", screenAt, { lean: 0.1 }));
      people.push(placePerson(R, randomLook(rand), { x: 5.2, z: 20.8 }, "In the grass", screenAt));
      for (const p of people) p.frozen = false;

      // Fog drifting low across the lot, fireflies over the weeds.
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
      mistTex.repeat.set(3, 3);
      const mists = [0.35, 0.8].map((y, i) => {
        const tex = mistTex.clone();
        tex.needsUpdate = true;
        tex.offset.set(i * 0.4, i * 0.2);
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(90, 100), new THREE.MeshBasicMaterial({ map: tex, color: 0x5a6078, transparent: true, opacity: 0.28 - i * 0.08, depthWrite: false }));
        sheet.rotation.x = -Math.PI / 2;
        sheet.position.set(0, y, 33);
        sheet.renderOrder = 1;
        sheet.material.userData.noClip = true;
        R.add(sheet);
        return { tex, drift: new THREE.Vector2(0.006, 0.002 + i * 0.002) };
      });
      const fireflies = Array.from({ length: R.density(50) }, (_, i) => {
        const r = rng(91 + i);
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xd9ff8f, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        s.scale.setScalar(0.2);
        R.add(s);
        return { s, home: new THREE.Vector3((r() - 0.5) * 50, 0, 3 + r() * 58), phase: r() * 20, speed: 0.3 + r() * 0.4 };
      });

      const api = {
        floor: ground,
        walls: walls.concat([[LOT.x0, LOT.z1 + 4, LOT.x1, LOT.z1 + 4]]),
        blockers,
        people,
        BOOTH,
        speakerAt: poles.find((p) => p.tilt < 1 && p.z > 40 && p.x > 5) ?? poles[0],
        show,
        slideChanges: [],
        update(t, dt) {
          sky.position.copy(R.camLocal);
          // The slideshow: a new photo every 12 seconds, crossfading over
          // two; the picture flickers faintly, the grain crawls.
          if (t > show.next) {
            show.i = (show.i + 1) % slides.length;
            const P = setSlide(show.back, slides[show.i]);
            [show.front, show.back] = [show.back, show.front];
            show.fade = 0;
            show.next = t + 12;
            screenPhoto.mesh = show.front;
            screenPhoto.photo = P;
            cardStand.remove(card);
            card.geometry.dispose();
            card.material.map?.dispose();
            card.material.dispose();
            card = labelMesh(labelLines(P), "film", 0.7);
            card.position.set(0, 1.35, -0.05);
            card.rotation.y = Math.PI;
            cardStand.add(card);
            setThrough(R.reg, R.reg !== here);
            if (R.reg.through) { R.reg.through = undefined; setThrough(R.reg, true); }
            api.slideChanges.forEach((f) => f());
          }
          show.fade = Math.min(1, show.fade + dt / 2);
          const flick = 0.93 + Math.random() * 0.07;
          show.front.material.opacity = show.fade;
          show.back.material.opacity = 1 - show.fade;
          show.front.material.color.setScalar(flick);
          show.back.material.color.setScalar(flick);
          show.front.position.z = -0.17;
          show.back.position.z = -0.14;
          grainTex.offset.set(Math.random(), Math.random());
          beam.material.opacity = 0.075 + flick * 0.02;
          screenGlow.intensity = 18 + flick * 6;
          boothLight.intensity = 2.6 + flick * 0.6;
          // Dust in the beam.
          for (let i = 0; i < DUST; i++) {
            const [a, ang, rad, ph] = dustSeed[i];
            const k = ((a + t * 0.004 * (1 + (i % 5) * 0.2)) % 1) * 0.75;
            const along = k * beamLen;
            const r = rad * (0.2 + along * (9.3 / beamLen)) * 0.9;
            const ang2 = ang + Math.sin(t * 0.3 + ph) * 0.2;
            dustPos[i * 3] = WIN.x + dir.x * along + (side1.x * Math.cos(ang2) + side2.x * Math.sin(ang2)) * r;
            dustPos[i * 3 + 1] = WIN.y + dir.y * along + (side1.y * Math.cos(ang2) + side2.y * Math.sin(ang2)) * r;
            dustPos[i * 3 + 2] = WIN.z + dir.z * along + (side1.z * Math.cos(ang2) + side2.z * Math.sin(ang2)) * r;
          }
          dustGeo.attributes.position.needsUpdate = true;
          for (const m of moths) {
            m.m.position.set(WIN.x + Math.sin(t * m.a + m.phase) * 0.5, WIN.y + Math.sin(t * m.b + m.phase) * 0.3, WIN.z + 0.4 + (1 + Math.sin(t * 1.7 + m.phase)) * 0.4);
            m.m.rotation.y = t * 8 + m.phase;
          }
          for (const ms of mists) ms.tex.offset.addScaledVector(ms.drift, dt);
          for (const f of fireflies) {
            const k = t * f.speed + f.phase;
            const x = f.home.x + Math.sin(k * 0.7) * 2.5;
            const z = f.home.z + Math.cos(k * 0.6) * 2.5;
            f.s.position.set(x, ground(x, z) + 0.5 + Math.sin(k * 1.3) * 0.35, z);
            f.s.material.opacity = Math.max(0, Math.sin(k * 2.3)) ** 3;
          }
          // The marquee's live bulbs buzz now and then.
          const bulbs = marquee.userData.bulbs;
          if (Math.random() < 0.08) bulbs[Math.floor(Math.random() * bulbs.length)].material.color.setHex(Math.random() < 0.5 ? 0x5a4a30 : 0xffd27a);
        },
      };
      return api;
    },
    sound(A, R, api) {
      // Crickets, wind in the trees, the projector whirring in the booth
      // (louder as you come close), and one speaker still crackling.
      for (const [x, z] of [[-25, 10], [24, 20], [-22, 52], [20, 58], [0, 8]]) {
        const chirp = A.osc("sine", 4300 + A.chance() * 700);
        const amp = A.gain(0);
        chirp.connect(amp).connect(A.placed(x, 0.2, z, 3, 1));
        let t = A.ctx.currentTime + A.chance();
        A.extras.push((until) => {
          t = Math.max(t, A.ctx.currentTime);
          while (t < until) {
            for (let i = 0; i < 3; i++) {
              amp.gain.setValueAtTime(0.045, t);
              amp.gain.setValueAtTime(0, t + 0.018);
              t += 0.032;
            }
            t += A.chance() < 0.08 ? 2 + A.chance() * 3 : 0.5 + A.chance() * 0.6;
          }
        });
      }
      const windTone = A.filter("bandpass", 380, 0.5);
      const wind = A.gain(0.06);
      A.hiss().connect(windTone).connect(wind).connect(A.bus);
      let gust = A.ctx.currentTime;
      A.extras.push((until) => {
        gust = Math.max(gust, A.ctx.currentTime);
        while (gust < until) {
          wind.gain.setTargetAtTime(0.03 + A.chance() * 0.08, gust, 1.5);
          windTone.frequency.setTargetAtTime(260 + A.chance() * 300, gust, 1.5);
          gust += 2 + A.chance() * 3;
        }
      });
      // The projector: a 24-frame clatter, a motor whine.
      const booth = A.placed(api.BOOTH.x, 2.4, api.BOOTH.z + 2.5, 1.5, 1.3);
      const clatter = A.gain(0);
      A.hiss().connect(A.filter("bandpass", 2200, 1.5)).connect(clatter).connect(booth);
      const gate = A.osc("square", 24);
      const gateDepth = A.gain(0.05);
      gate.connect(gateDepth).connect(clatter.gain);
      const whine = A.gain(0.012);
      A.osc("triangle", 1180).connect(whine).connect(booth);
      const motor = A.gain(0.05);
      A.osc("sawtooth", 72).connect(A.filter("lowpass", 300)).connect(motor).connect(booth);
      // The speaker: crackle, and the ghost of a soundtrack.
      const sp = api.speakerAt;
      const speaker = A.placed(sp.x, 1.25, sp.z, 1, 1.6);
      const crackle = A.gain(0);
      A.hiss().connect(A.filter("highpass", 1500)).connect(crackle).connect(speaker);
      let pop = A.ctx.currentTime;
      A.extras.push((until) => {
        pop = Math.max(pop, A.ctx.currentTime);
        while (pop < until) {
          crackle.gain.setValueAtTime(A.chance() < 0.7 ? 0 : 0.05 + A.chance() * 0.12, pop);
          pop += 0.02 + A.chance() * 0.09;
        }
      });
      const hum = A.gain(0.008);
      A.osc("sine", 60).connect(hum).connect(speaker);
      return {};
    },
  };
