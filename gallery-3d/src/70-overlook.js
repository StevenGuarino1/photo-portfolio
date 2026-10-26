  // ---------- The Hawk Watch ----------
  // A windy rocky summit at golden hour. The doorway opens onto the ridge
  // through a low dry-stone wall: big flat slabs and boulders to stand on,
  // windblown pines and tall grass, and then the ground drops away into a
  // wide valley of forested ridges fading into haze, with a river glinting
  // far below. Raptors ride the thermals; now and then one glides past at
  // eye level. Bird photos stand along the edge on weathered posts.

  ROOMS.overlook = {
    name: "The Hawk Watch",
    short: "Hawk Watch",
    tagline: "Raptors on the wind at golden hour",
    color: 0xe0a24e,
    leak: 0xf0b25e,
    leakStyle: "sun",
    frame: 0x5a4632,
    fogColor: 0x8a7a66,
    loudness: 0.76,
    ground: "grass",
    entrance: { x: 0, z: 0, nx: 0, nz: -1 },
    spawn: { x: 0, z: 1.8, yaw: Math.PI, pitch: 0.02 },
    spots: { edge: { name: "The Edge", x: 0.6, z: 13.4, yaw: Math.PI, pitch: -0.05 } },
    build(R) {
      const W = 11; // you can walk from x = -W to W
      const edgeZ = (x) => 19.5 + Math.sin(x * 0.35) * 1.0 + Math.sin(x * 0.9 + 1) * 0.4;
      // Flat-topped rocks to stand on: [x, z, half-width, half-depth, turn, top].
      const SLABS = [[-4, 8, 1.6, 1.1, 0.3, 0.55], [3.5, 10.5, 2.0, 1.4, -0.2, 0.7], [-1, 15, 2.4, 1.3, 0.1, 0.85], [6.5, 16, 1.5, 1.0, 0.5, 0.95], [-6.5, 14, 1.3, 1.7, -0.4, 0.75], [-8.6, 9, 1.2, 0.9, 0.2, 0.45]];
      // Rounded boulders: [x, z, radius, height].
      const BOULDERS = [[7.8, 6.2, 1.1, 1.0], [-8.2, 4.4, 0.9, 0.8], [1.2, 18.4, 0.8, 0.6], [9.2, 12.5, 0.9, 0.9], [-3.2, 4.2, 0.6, 0.45], [-9.6, 17.5, 1.0, 0.9]];
      function rockiness(x, z) {
        let k = 0;
        for (const [cx, cz, hw, hd, rot, top] of SLABS) {
          const c = Math.cos(rot);
          const s = Math.sin(rot);
          const lx = (x - cx) * c - (z - cz) * s;
          const lz = (x - cx) * s + (z - cz) * c;
          const d = Math.max(Math.abs(lx) - hw, Math.abs(lz) - hd);
          k = Math.max(k, 1 - smooth(d, -0.1, 0.4));
        }
        for (const [bx, bz, r] of BOULDERS) k = Math.max(k, 1 - smooth(Math.hypot(x - bx, z - bz) / r, 0.8, 1.2));
        return k;
      }
      function ground(x, z) {
        let y = smooth(z, 0, 12) * 0.8 + Math.sin(x * 0.7 + z * 0.4) * 0.08 + Math.sin(x * 1.7 - z * 1.1) * 0.05;
        if (z < 0) y = Math.min(y, z * 0.18);
        for (const [cx, cz, hw, hd, rot, top] of SLABS) {
          const c = Math.cos(rot);
          const s = Math.sin(rot);
          const lx = (x - cx) * c - (z - cz) * s;
          const lz = (x - cx) * s + (z - cz) * c;
          const d = Math.max(Math.abs(lx) - hw, Math.abs(lz) - hd);
          y = Math.max(y, top + Math.sin(lx * 3 + lz * 2) * 0.03 - Math.max(0, d) * 3.2);
        }
        for (const [bx, bz, r, h] of BOULDERS) {
          const d = Math.hypot(x - bx, z - bz) / r;
          if (d < 1) y = Math.max(y, h * Math.sqrt(1 - d * d) + 0.1);
        }
        const e = edgeZ(x);
        if (z > e) y -= (z - e) ** 1.35 * 9;
        if (Math.abs(x) > W + 2) y -= (Math.abs(x) - W - 2) ** 1.3 * 1.5;
        return y;
      }

      const SUN = new THREE.Vector3(-0.82, 0.17, 0.55).normalize();
      R.scene.fog = new THREE.Fog(0xb9a48c, 60, 1500);
      R.add(new THREE.HemisphereLight(0xa9bddb, 0x6a5438, 0.85));
      const sun = new THREE.DirectionalLight(0xffc27e, 2.3);
      sun.position.set(0, 0, 10).addScaledVector(SUN, 70);
      sun.target.position.set(0, 0, 10);
      R.shadows(sun, 26, 160);
      R.add(sun, sun.target);

      // Golden-hour sky with a low sun and a few fast clouds.
      const sky = new THREE.Group();
      sky.add(skyDome({ top: 0x35588a, mid: 0x93abc6, low: 0xf2c48c, sunDir: SUN, glow: [1.0, 0.72, 0.42], tight: 220, spread: 5, glowAmt: [1.4, 0.32] }));
      const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb35c, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
      sunHalo.position.copy(SUN).multiplyScalar(1300);
      sunHalo.scale.setScalar(700);
      const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
      sunDisc.position.copy(SUN).multiplyScalar(1290);
      sunDisc.scale.setScalar(110);
      sunHalo.renderOrder = sunDisc.renderOrder = -1;
      sky.add(sunHalo, sunDisc);
      const cloudTex = canvasTex(256, 128, (g) => {
        const r = rng(9);
        for (let i = 0; i < 22; i++) {
          const x = 40 + r() * 176;
          const y = 50 + r() * 40;
          const rad = 18 + r() * 34;
          const blob = g.createRadialGradient(x, y, 0, x, y, rad);
          blob.addColorStop(0, "rgba(255, 255, 255, 0.55)");
          blob.addColorStop(1, "rgba(255, 255, 255, 0)");
          g.fillStyle = blob;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }, { repeat: false });
      const clouds = new THREE.Group();
      const cr = rng(14);
      for (let i = 0; i < 9; i++) {
        const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: i % 3 ? 0xffe0c0 : 0xf3c7b0, depthWrite: false, fog: false, transparent: true, opacity: 0.85 }));
        const a = cr() * Math.PI * 2;
        const el = THREE.MathUtils.degToRad(7 + cr() * 18);
        c.position.set(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el)).multiplyScalar(1250);
        c.scale.set(420 + cr() * 300, 150 + cr() * 80, 1);
        c.renderOrder = -1;
        clouds.add(c);
      }
      sky.add(clouds);
      R.add(sky);

      // The valley: ridge after ridge, each one hazier, a river glinting far
      // below, a hazy floor under it all.
      const valleyFloor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshBasicMaterial({ color: 0x3d4a33 }));
      valleyFloor.rotation.x = -Math.PI / 2;
      valleyFloor.position.set(0, -140, 1200);
      R.add(valleyFloor);
      const ridgeColors = [0x324029, 0x3b4c39, 0x55665b, 0x76857f, 0x96a0a2];
      [[300, -100, 30], [460, -88, 40], [680, -70, 52], [980, -52, 64], [1350, -36, 80]].forEach(([z, base, amp], i) => {
        const r = rng(200 + i);
        const ph = [r() * 6, r() * 6, r() * 6];
        const pos = [];
        const cols = [];
        const n = 220;
        const top = new THREE.Color(ridgeColors[i]).lerp(new THREE.Color(0xd9b58a), 0.25);
        const bottom = new THREE.Color(ridgeColors[i]).multiplyScalar(0.7);
        for (let k = 0; k <= n; k++) {
          const x = -2400 + (k / n) * 4800;
          const h = base + amp * (0.5 + 0.3 * Math.sin(x * 0.004 + ph[0]) + 0.15 * Math.sin(x * 0.011 + ph[1])) + (r() - 0.5) * amp * 0.12;
          const zz = z + Math.sin(x * 0.003 + ph[2]) * 40;
          pos.push(x, -150, zz, x, h, zz);
          cols.push(bottom.r, bottom.g, bottom.b, top.r, top.g, top.b);
        }
        const idx = [];
        for (let k = 0; k < n; k++) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
        geo.setIndex(idx);
        R.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
      });
      {
        const pts = [];
        for (let k = 0; k <= 60; k++) {
          const x = -900 + k * 30;
          pts.push(new THREE.Vector3(x, -137, 205 + Math.sin(x * 0.006) * 45 + Math.sin(x * 0.017) * 12));
        }
        const river = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 4, 3, false), new THREE.MeshBasicMaterial({ color: 0xf6d6a2 }));
        river.scale.y = 0.15;
        river.position.y = -137 * 0.85;
        R.add(river);
      }

      // The summit: faceted rock and dry grass ground, low-poly.
      const step = Q.density < 0.5 ? 0.8 : 0.5;
      const terrainGeo = new THREE.PlaneGeometry(80, 70, Math.round(80 / step), Math.round(70 / step));
      terrainGeo.rotateX(-Math.PI / 2);
      terrainGeo.translate(0, 0, 10);
      {
        const p = terrainGeo.attributes.position;
        const cols = [];
        const r = rng(23);
        const rock = new THREE.Color(0x8d8274);
        const rockDark = new THREE.Color(0x6a6158);
        const grass = new THREE.Color(0x9a8a4c);
        const dry = new THREE.Color(0x7a6a3c);
        const c = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const z = p.getZ(i);
          const y = ground(x, z);
          p.setY(i, y);
          const cliff = z > edgeZ(x) - 0.3 || Math.abs(x) > W + 2.5;
          const k = cliff ? 1 : rockiness(x, z);
          c.copy(grass).lerp(dry, r()).lerp(r() < 0.5 ? rock : rockDark, k);
          cols.push(c.r, c.g, c.b);
        }
        terrainGeo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
        terrainGeo.computeVertexNormals();
      }
      const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
      terrain.receiveShadow = true;
      terrain.castShadow = Q.shadow > 0;
      R.add(terrain);

      // Boulders as solid faceted rocks too, so they cast long shadows.
      const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a7f71, flatShading: true });
      for (const [bx, bz, r, h] of BOULDERS) {
        const geo = new THREE.IcosahedronGeometry(1, 1);
        const pr = rng(Math.round(bx * 10 + bz));
        const pos = geo.attributes.position;
        for (let k = 0; k < pos.count; k++) pos.setXYZ(k, pos.getX(k) * (0.85 + pr() * 0.25), pos.getY(k), pos.getZ(k) * (0.85 + pr() * 0.25));
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, rockMat);
        m.scale.set(r * 0.95, h, r * 0.95);
        m.position.set(bx, ground(bx, bz) - h * 0.92, bz);
        m.castShadow = Q.shadow > 0;
        R.add(m);
      }

      // The way in: a low dry-stone wall across the back of the summit, and
      // the doorframe standing in a gap in it.
      {
        const parts = [];
        const r = rng(33);
        for (let x = -14; x <= 14; x += 0.55) {
          if (Math.abs(x) < DOOR_HALF + 0.25) continue;
          for (let row = 0; row < 2 + (r() < 0.5 ? 1 : 0); row++) {
            const g = new THREE.BoxGeometry(0.5 + r() * 0.2, 0.28, 0.45 + r() * 0.15);
            g.rotateY((r() - 0.5) * 0.3);
            g.translate(x + (r() - 0.5) * 0.1, ground(x, 0.1) + 0.14 + row * 0.27, 0.15 + (r() - 0.5) * 0.08);
            parts.push(g);
          }
        }
        const wall = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ color: 0x7d7366, flatShading: true }));
        wall.castShadow = Q.shadow > 0;
        wall.receiveShadow = true;
        R.add(wall);
        const frame = doorFrame(0x5a4632);
        frame.position.set(0, 0, 0);
        frame.traverse((o) => { o.castShadow = Q.shadow > 0; });
        R.add(frame);
      }

      const blockers = [];

      // Wind: a steady blow with gusts on top. Everything that moves in the
      // wind reads this.
      const wind = { gust: 0, next: 2, start: -10, len: 3 };
      const windU = { time: { value: 0 }, gust: { value: 0 } };

      // Tall grass, bending in the gusts: one instanced mesh, bent in its
      // vertex shader so it costs nothing to animate.
      {
        const blade = new THREE.BufferGeometry();
        blade.setAttribute("position", new THREE.Float32BufferAttribute([-0.022, 0, 0, 0.022, 0, 0, -0.013, 0.5, 0, 0.013, 0.5, 0, 0, 1, 0], 3));
        blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
        blade.computeVertexNormals();
        const grassMat = new THREE.MeshLambertMaterial({ color: 0xcdb46c, emissive: 0x3a2d12, side: THREE.DoubleSide });
        grassMat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = windU.time;
          shader.uniforms.uGust = windU.gust;
          shader.vertexShader = "uniform float uTime;\nuniform float uGust;\n" + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
            vec4 root = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float bend = position.y * position.y;
            float sway = sin(uTime * 2.3 + root.x * 0.6 + root.z * 0.4) * 0.12 + sin(uTime * 5.1 + root.x * 1.7) * 0.05;
            transformed.x += (sway + uGust * 0.6) * bend;
            transformed.z += (sway * 0.4 - uGust * 0.15) * bend;
            transformed.y -= uGust * 0.22 * bend;`);
        };
        const count = R.density(2600);
        const grass = new THREE.InstancedMesh(blade, grassMat, count);
        const r = rng(43);
        const m = new THREE.Matrix4();
        let n = 0;
        for (let tries = 0; n < count && tries < count * 6; tries++) {
          const x = (r() - 0.5) * 2 * (W + 1.5);
          const z = r() * 20.5 - 0.2;
          if (z > edgeZ(x) - 0.2 || rockiness(x, z) > 0.3) continue;
          const h = 0.25 + r() * 0.45;
          m.makeScale(1, h, 1).setPosition(x, ground(x, z) - 0.02, z);
          grass.setMatrixAt(n++, m);
        }
        grass.count = n;
        R.add(grass);
      }

      // Low shrubs and scraggly pines, all leaning away from the wind.
      const swayers = [];
      {
        const r = rng(53);
        const shrubMat = new THREE.MeshLambertMaterial({ color: 0x5b5a2e, flatShading: true });
        for (let i = 0; i < 16; i++) {
          const x = (r() - 0.5) * 2 * W;
          const z = 2 + r() * 16;
          if (z > edgeZ(x) - 0.6 || rockiness(x, z) > 0.4 || Math.abs(x) < 1.5 && z < 6) continue;
          const shrub = new THREE.Group();
          for (let k = 0; k < 3; k++) {
            const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + r() * 0.2, 0), shrubMat);
            b.position.set((r() - 0.5) * 0.5, 0.2 + r() * 0.15, (r() - 0.5) * 0.5);
            b.scale.y = 0.7;
            shrub.add(b);
          }
          shrub.position.set(x, ground(x, z), z);
          R.add(shrub);
          swayers.push({ o: shrub, k: 0.08, phase: r() * 6 });
        }
        const bark = new THREE.MeshLambertMaterial({ color: 0x4a3626, flatShading: true });
        const needles = new THREE.MeshLambertMaterial({ color: 0x2d3d25, flatShading: true });
        for (const [x, z, s] of [[-9.6, 6.5, 1.1], [9.8, 3.2, 1.3], [-5.5, 18.6, 0.9], [8.2, 18.9, 1.0], [10.4, 9.8, 0.85]]) {
          const tree = new THREE.Group();
          const lean = 0.18;
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 3.6, 5), bark);
          trunk.position.y = 1.8;
          tree.add(trunk);
          // Flag-shaped: branches only on the downwind side.
          for (let k = 0; k < 4; k++) {
            const layer = new THREE.Mesh(new THREE.ConeGeometry(0.9 - k * 0.15, 0.55, 6), needles);
            layer.position.set(0.45 - k * 0.05, 1.5 + k * 0.62, 0);
            layer.scale.set(1.3, 1, 0.7);
            tree.add(layer);
          }
          tree.rotation.z = -lean;
          tree.scale.setScalar(s);
          tree.position.set(x, ground(x, z) - 0.1, z);
          tree.traverse((o) => { o.castShadow = Q.shadow > 0; });
          R.add(tree);
          swayers.push({ o: tree, k: 0.035, phase: x, base: -lean });
          blockers.push({ x, z, r: 0.3 });
        }
      }

      // A flag on a pole by the edge, snapping in the wind.
      const flagGeo = new THREE.PlaneGeometry(1.3, 0.75, 18, 6);
      flagGeo.translate(0.65, 0, 0);
      const flagBase = flagGeo.attributes.position.array.slice();
      const flagTex = canvasTex(128, 64, (g) => {
        for (let i = 0; i < 4; i++) {
          g.fillStyle = i % 2 ? "#efe6d6" : "#d4552c";
          g.fillRect(0, i * 16, 128, 16);
        }
      }, { repeat: false });
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide }));
      const FLAG = { x: 8.6, z: 13.6 };
      const pole = part(new THREE.CylinderGeometry(0.035, 0.045, 4.2, 6), 0xb7b2a6, FLAG.x, ground(FLAG.x, FLAG.z) + 2.1, FLAG.z);
      pole.castShadow = Q.shadow > 0;
      flag.position.set(FLAG.x, ground(FLAG.x, FLAG.z) + 3.75, FLAG.z);
      flag.castShadow = Q.shadow > 0;
      R.add(pole, flag);
      blockers.push({ x: FLAG.x, z: FLAG.z, r: 0.15 });

      // Bird photos along the edge, the valley behind them: three on a rough
      // board, four on single weathered posts, each with a burned-wood sign.
      const facing = (x, z) => Math.atan2(0 - x, 2 - z) * 0.4 + Math.PI;
      const post = (x, z, h) => {
        const p = part(new THREE.BoxGeometry(0.12, h, 0.12), 0x5a4632, x, ground(x, z) + h / 2 - 0.1, z);
        p.castShadow = Q.shadow > 0;
        R.add(p);
        blockers.push({ x, z, r: 0.18 });
      };

      // Raptors: most circling in wide spirals at different heights and
      // distances, a few far off as specks, and now and then one gliding
      // right past the edge at eye level before banking away.
      const birdMats = [new THREE.MeshLambertMaterial({ color: 0x3b2a1d, side: THREE.DoubleSide }), new THREE.MeshLambertMaterial({ color: 0x2a2420, side: THREE.DoubleSide })];
      const tailMat = new THREE.MeshLambertMaterial({ color: 0x9a4f2a, side: THREE.DoubleSide });
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0.13);
      wingShape.lineTo(0.5, 0.16);
      wingShape.lineTo(0.86, 0.1);
      wingShape.lineTo(1.0, 0.04);
      wingShape.lineTo(0.95, -0.01);
      wingShape.lineTo(1.0, -0.06);
      wingShape.lineTo(0.9, -0.08);
      wingShape.lineTo(0.93, -0.13);
      wingShape.lineTo(0.55, -0.15);
      wingShape.lineTo(0, -0.12);
      const wingGeo = new THREE.ShapeGeometry(wingShape);
      wingGeo.rotateX(Math.PI / 2);
      const tailGeo = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.05, 0), new THREE.Vector2(0.05, 0), new THREE.Vector2(0.13, -0.3), new THREE.Vector2(-0.13, -0.3)]));
      tailGeo.rotateX(Math.PI / 2);
      function raptor(span, dark) {
        const bird = new THREE.Group();
        const mat = birdMats[dark ? 1 : 0];
        const left = new THREE.Group();
        const right = new THREE.Group();
        const lw = new THREE.Mesh(wingGeo, mat);
        lw.scale.setScalar(span / 2);
        const rw = new THREE.Mesh(wingGeo, mat);
        rw.scale.set(-span / 2, span / 2, span / 2);
        left.add(lw);
        right.add(rw);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(span * 0.035, span * 0.05, span * 0.34, 5), mat);
        body.rotation.x = Math.PI / 2;
        const head = new THREE.Mesh(new THREE.IcosahedronGeometry(span * 0.045, 0), mat);
        head.position.z = span * 0.19;
        const tail = new THREE.Mesh(tailGeo, dark ? mat : tailMat);
        tail.scale.setScalar(span * 0.9);
        tail.position.z = -span * 0.15;
        bird.add(left, right, body, head, tail);
        bird.traverse((o) => { o.castShadow = false; });
        R.add(bird);
        return { bird, left, right };
      }
      const br = rng(71);
      const orbits = [
        [6, 16, 70, 26, 1.3], [-24, 28, 105, 34, 1.5], [30, 10, 92, 22, 1.25], [-50, 44, 210, 48, 1.7],
        [70, 64, 250, 58, 1.8], [2, 36, 175, 40, 1.4], [-140, 80, 500, 70, 4.2], [170, 105, 600, 80, 4.8], [40, 140, 720, 90, 5.5],
      ].map(([cx, cy, cz, rad, span], i) => ({
        ...raptor(span, i % 3 === 2),
        cx, cy, cz, rad,
        speed: (7 + br() * 4) * (br() < 0.4 ? -1 : 1),
        phase: br() * 6,
        flapAt: 3 + br() * 10,
      }));
      const flyer = raptor(1.45, false);
      const flyby = { start: -100, next: 9, curve: null, len: 12 };

      function wingsFor(b, t, flapping) {
        const flap = flapping ? Math.sin(t * 24) * 0.55 : 0;
        const dihedral = 0.1 + Math.sin(t * 1.7 + (b.phase ?? 0)) * 0.03;
        b.left.rotation.z = dihedral + flap;
        b.right.rotation.z = -dihedral - flap;
      }

      const api = {
        floor: (x, z) => ground(x, z),
        walls: [
          [-14, 0, -DOOR_HALF - 0.05, 0],
          [DOOR_HALF + 0.05, 0, 14, 0],
          [-W, 0, -W, 22],
          [W, 0, W, 22],
          ...Array.from({ length: 22 }, (_, i) => {
            const x0 = -W + i;
            const x1 = x0 + 1;
            return [x0, edgeZ(x0) - 0.85, x1, edgeZ(x1) - 0.85];
          }),
        ],
        blockers,
        flagAt: FLAG,
        wind,
        flybys: [],
        update(t, dt) {
          sky.position.copy(R.camLocal);
          clouds.rotation.y += dt * 0.004;
          // The wind: a steady blow, with a gust every few seconds.
          if (t > wind.next) {
            wind.start = t;
            wind.len = 2 + Math.random() * 2.5;
            wind.next = t + 3 + Math.random() * 5;
          }
          const g = t - wind.start;
          const gust = g < wind.len ? Math.sin((g / wind.len) * Math.PI) : 0;
          wind.gust += (gust - wind.gust) * Math.min(1, dt * 4);
          const m = motion();
          windU.time.value = t;
          windU.gust.value = (0.35 + wind.gust * 0.65) * m;
          for (const s of swayers) {
            s.o.rotation.z = (s.base ?? 0) - (Math.sin(t * 2.1 + s.phase) * 0.3 + 0.5 + wind.gust) * s.k * m;
            s.o.rotation.x = Math.sin(t * 1.6 + s.phase * 1.3) * s.k * 0.4 * m;
          }
          // The flag snaps harder in the gusts.
          const fp = flagGeo.attributes.position;
          const snap = 7 + wind.gust * 9;
          for (let i = 0; i < fp.count; i++) {
            const bx = flagBase[i * 3];
            const by = flagBase[i * 3 + 1];
            const k = bx / 1.3;
            fp.setXYZ(i, bx * (0.97 + wind.gust * 0.03), by - 0.08 * k * k * (1 - wind.gust), Math.sin(t * snap - bx * 5.5) * 0.13 * k * (0.5 + wind.gust) + Math.sin(t * snap * 1.7 - bx * 9) * 0.03 * k);
          }
          fp.needsUpdate = true;
          flagGeo.computeVertexNormals();

          for (const b of orbits) {
            const a = b.phase + (t * b.speed) / b.rad;
            const s = Math.sign(b.speed);
            b.bird.position.set(b.cx + Math.cos(a) * b.rad, b.cy + Math.sin(t * 0.05 + b.phase) * 8, b.cz + Math.sin(a) * b.rad);
            b.bird.rotation.set(0, Math.atan2(-Math.sin(a) * s, Math.cos(a) * s), 0);
            b.bird.rotateZ(s * 0.32);
            const flapping = (t % 14) > b.flapAt && (t % 14) < b.flapAt + 1.6;
            wingsFor(b, t, flapping);
          }
          // The close pass.
          if (t > flyby.next && !flyby.curve) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            flyby.curve = new THREE.CatmullRomCurve3([
              new THREE.Vector3(-130 * dir, 32, 90),
              new THREE.Vector3(-32 * dir, 7, 38),
              new THREE.Vector3(0, ground(0, 18) + 2.2, 26.5),
              new THREE.Vector3(24 * dir, 6, 33),
              new THREE.Vector3(120 * dir, 42, 105),
            ]);
            flyby.start = t;
            api.flybys.forEach((f) => f());
          }
          if (flyby.curve) {
            const k = (t - flyby.start) / flyby.len;
            if (k >= 1) {
              flyby.curve = null;
              flyby.next = t + 22 + Math.random() * 18;
              flyer.bird.visible = false;
            } else {
              flyer.bird.visible = true;
              const p = flyby.curve.getPointAt(k);
              const ahead = flyby.curve.getPointAt(Math.min(1, k + 0.01));
              const after = flyby.curve.getPointAt(Math.min(1, k + 0.03));
              flyer.bird.position.copy(p);
              flyer.bird.lookAt(ahead);
              const turn = new THREE.Vector3().subVectors(ahead, p).cross(new THREE.Vector3().subVectors(after, ahead)).y;
              flyer.bird.rotateZ(clamp(-turn * 0.6, -0.8, 0.8));
              wingsFor(flyer, t, k > 0.62 && k < 0.7);
            }
          } else flyer.bird.visible = false;
        },
      };
      return api;
    },
    sound(A, R, api) {
      // Wind that rises and falls with the gusts, a whistle over the rocks,
      // the flag cracking, and now and then a hawk's cry.
      const windTone = A.filter("lowpass", 500, 0.5);
      const windAmp = A.gain(0.1);
      A.hiss().connect(windTone).connect(windAmp).connect(A.bus);
      const whistle = A.filter("bandpass", 1300, 9);
      const whistleAmp = A.gain(0.02);
      A.hiss().connect(whistle).connect(whistleAmp).connect(A.bus);
      const rustle = A.filter("highpass", 2600, 0.7);
      const rustleAmp = A.gain(0.01);
      A.hiss().connect(rustle).connect(rustleAmp).connect(A.bus);
      const flapTone = A.filter("bandpass", 900, 1.2);
      const flapAmp = A.gain(0);
      A.hiss().connect(flapTone).connect(flapAmp).connect(A.placed(api.flagAt.x, 3.7, api.flagAt.z, 1.5, 1.3));
      const flutter = A.osc("square", 11);
      const flutterDepth = A.gain(0);
      flutter.connect(flutterDepth).connect(flapAmp.gain);

      const cry = A.osc("sawtooth", 2400);
      const cryTone = A.filter("bandpass", 2700, 3);
      const cryAmp = A.gain(0);
      const cryPan = A.placed(10, 30, 60, 20, 1);
      cry.connect(cryTone).connect(cryAmp).connect(cryPan);
      const kee = (when, loud) => {
        cry.frequency.setValueAtTime(2700, when);
        cry.frequency.exponentialRampToValueAtTime(1900, when + 1.2);
        cryAmp.gain.setTargetAtTime(loud, when + 0.05, 0.05);
        cryAmp.gain.setTargetAtTime(0, when + 1.0, 0.12);
      };
      let next = A.ctx.currentTime + 7;
      A.extras.push((until) => {
        next = Math.max(next, A.ctx.currentTime);
        while (next < until) {
          A.move(cryPan, -40 + A.chance() * 80, 25 + A.chance() * 20, 60 + A.chance() * 80);
          kee(next, 0.12);
          next += 16 + A.chance() * 16;
        }
      });
      api.flybys.push(() => {
        A.move(cryPan, 0, 3, 27);
        kee(A.ctx.currentTime + 4.5, 0.22);
      });
      return {
        update() {
          const g = api.wind.gust;
          const now = A.ctx.currentTime;
          windAmp.gain.setTargetAtTime(0.08 + g * 0.28, now, 0.25);
          windTone.frequency.setTargetAtTime(380 + g * 520, now, 0.3);
          whistleAmp.gain.setTargetAtTime(0.01 + g * 0.05, now, 0.3);
          whistle.frequency.setTargetAtTime(1150 + g * 500, now, 0.4);
          rustleAmp.gain.setTargetAtTime(0.006 + g * 0.03, now, 0.2);
          flapAmp.gain.setTargetAtTime(0.03 + g * 0.06, now, 0.2);
          flutterDepth.gain.setTargetAtTime(0.02 + g * 0.06, now, 0.2);
          flutter.frequency.setTargetAtTime(9 + g * 8, now, 0.3);
        },
      };
    },
  };
