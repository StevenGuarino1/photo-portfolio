  // ---------- The Pool ----------

  ROOMS.pool = {
    name: "The Pool",
    short: "Pool",
    tagline: "A drained pool at midnight",
    color: 0x58b7d6,
    leak: 0x3f9cc0,
    leakStyle: "ripple",
    frame: 0x2a2018,
    fogColor: 0x0e1219,
    loudness: 2.4,
    ground: "concrete",
    entrance: { x: 9, z: 8.6, nx: -1, nz: 0 },
    spawn: { x: 24, z: -7.2, yaw: Math.PI, pitch: -0.3 },
    spots: {
      deep: { name: "The Deep End", x: 24, z: 12.6, yaw: Math.PI, pitch: 0.02 },
      across: { name: "Across the Pool", x: 15.2, z: -9, yaw: -2.45, pitch: -0.12 },
      gate: { name: "The Gate", x: 10.8, z: 8.6, yaw: -2.05, pitch: -0.16 },
    },
    build(R) {
      // ---------- The backyard: a drained pool at midnight ----------
      // Through the wooden gate: a big fenced yard, a concrete deck, a long
      // empty pool lying across the yard, and far beyond the chain-link back
      // fence, eerily far off, a dark house with one window lit. The pool's
      // only real light is the lamp in its deep-end wall. After a minute out
      // here, or once you reach the deep end, it starts to rain and the pool
      // slowly fills; R (or the button) drains it again. Cheap lights only and
      // no shadows, so it stays smooth on a phone.

      const yard = { add: (...o) => R.add(...o) };
      R.scene.fog = new THREE.FogExp2(0x0e1219, 0.024);
      const GATE = { z: 8.6, half: DOOR_HALF, h: DOOR_H };
      const YARD = { x0: 9, x1: 44, z0: -14, z1: 26 };
      const SHED = new THREE.Vector3(41, 0, 22.5);
      const blockers = [];

      // The pool is built in its own frame: x runs its length from the shallow
      // end (-) to the deep end (+), z across it. That frame is turned so the
      // pool lies lengthways across the yard, deep end to the north.
      const POOL = { cx: 24, cz: 6, L: 22, W: 10, shallow: -1, deep: -3, slope0: -2, slope1: 4 };
      const HL = POOL.L / 2;
      const HW = POOL.W / 2;
      const WATER_TOP = POOL.deep + 1; // about waist deep at the deep end
      const PWX0 = POOL.cx - HW;
      const PWX1 = POOL.cx + HW;
      const PWZ0 = POOL.cz - HL; // the shallow end
      const PWZ1 = POOL.cz + HL; // the deep end
      const toPool = (x, z) => ({ lx: z - POOL.cz, lz: POOL.cx - x });
      const fromPool = (lx, lz) => ({ x: POOL.cx - lz, z: POOL.cz + lx });

      // The floor under your feet: the deck, or down in the pool, where three
      // steps lead to the shallow end and the floor slopes to the deep end.
      function poolFloor(lx) {
        if (lx < -HL + 0.5) return -0.25;
        if (lx < -HL + 1) return -0.5;
        if (lx < -HL + 1.5) return -0.75;
        if (lx < POOL.slope0) return POOL.shallow;
        if (lx < POOL.slope1) return POOL.shallow + ((lx - POOL.slope0) / (POOL.slope1 - POOL.slope0)) * (POOL.deep - POOL.shallow);
        return POOL.deep;
      }
      const inPoolLocal = (lx, lz) => Math.abs(lx) < HL && Math.abs(lz) < HW;
      const inPool = (x, z) => x > PWX0 && x < PWX1 && z > PWZ0 && z < PWZ1;
      const yardFloor = (x, z) => (inPool(x, z) ? poolFloor(z - POOL.cz) : 0);

      const lambs = new Map();
      function lam(color) {
        if (!lambs.has(color)) lambs.set(color, new THREE.MeshLambertMaterial({ color }));
        return lambs.get(color);
      }
      function block(w, h, d, color, x, y, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color));
        m.position.set(x, y, z);
        return m;
      }
      const scaleUV = (geo, su, sv) => {
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
        return geo;
      };
      function canvasTex(w, h, draw) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        draw(c.getContext("2d"));
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 4;
        return t;
      }

      // Pool tile: small pale-blue squares with darker grout. One copy of the
      // texture covers 1.2 m.
      const TILE = 1.2;
      const tileMat = new THREE.MeshLambertMaterial({
        map: canvasTex(128, 128, (g) => {
          const r = rng(201);
          g.fillStyle = "#6a9cad";
          g.fillRect(0, 0, 128, 128);
          for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
            const v = r() * 14 - 7;
            g.fillStyle = `rgb(${150 + v}, ${204 + v}, ${222 + v})`;
            g.fillRect(i * 16 + 1, j * 16 + 1, 14, 14);
          }
        }),
      });
      const bandMat = lam(0x1b3a5c); // the dark waterline tiles
      const concrete = new THREE.MeshLambertMaterial({
        map: canvasTex(256, 256, (g) => {
          const r = rng(203);
          g.fillStyle = "#5c5b58";
          g.fillRect(0, 0, 256, 256);
          for (let i = 0; i < 2200; i++) {
            g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"}, ${r() * 0.08})`;
            g.fillRect(r() * 256, r() * 256, 2, 2);
          }
          g.fillStyle = "rgba(0, 0, 0, 0.4)";
          g.fillRect(0, 0, 256, 3);
          g.fillRect(0, 0, 3, 256);
        }),
      });
      const woodTex = canvasTex(256, 128, (g) => {
        const r = rng(205);
        for (let i = 0; i < 8; i++) {
          const v = r() * 16;
          g.fillStyle = `rgb(${52 + v}, ${40 + v * 0.8}, ${30 + v * 0.6})`;
          g.fillRect(i * 32, 0, 32, 128);
          g.fillStyle = "rgba(0, 0, 0, 0.55)";
          g.fillRect(i * 32, 0, 2, 128);
        }
      });
      const fenceMat = new THREE.MeshLambertMaterial({ map: woodTex });
      const chainMat = new THREE.MeshLambertMaterial({
        map: canvasTex(64, 64, (g) => {
          g.strokeStyle = "#8a9096";
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

      // Sky: hazy and dim, with a pale moon behind the haze. Travels with you.
      const yardSky = new THREE.Group();
      {
        const dir = new THREE.Vector3(0.7, 0.5, -0.5).normalize();
        yardSky.add(skyDome({ top: 0x06080e, mid: 0x0e121b, low: 0x1b1f27, sunDir: dir, glow: [0.45, 0.5, 0.7], tight: 60, spread: 8, glowAmt: [0.4, 0.07] }));
        const veil = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x2a3040, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
        veil.position.copy(dir).multiplyScalar(1300);
        veil.scale.setScalar(520);
        const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: 0x6e6e6e, opacity: 0.55, depthWrite: false, fog: false, transparent: true }));
        disc.position.copy(dir).multiplyScalar(1290);
        disc.scale.setScalar(65);
        veil.renderOrder = disc.renderOrder = -1;
        yardSky.add(veil, disc);
      }
      yard.add(yardSky);
      yard.add(new THREE.HemisphereLight(0x26304a, 0x0a0908, 0.18));
      const yardMoon = new THREE.DirectionalLight(0x8d9bb8, 0.18);
      yardMoon.position.set(40, 30, -20);
      yard.add(yardMoon);

      // Dark ground running off to the horizon beyond the fences.
      // Dark ground running off to the horizon, with the yard cut out of it
      // (the deck covers the yard, and the pool must stay open).
      {
        const v = (x, z) => new THREE.Vector2(x, -z);
        const outer = new THREE.Shape([v(-500, 500), v(800, 500), v(800, -500), v(-500, -500)].reverse());
        outer.holes.push(new THREE.Path([v(YARD.x0 - 0.5, YARD.z0 - 0.5), v(YARD.x1 + 0.5, YARD.z0 - 0.5), v(YARD.x1 + 0.5, YARD.z1 + 0.5), v(YARD.x0 - 0.5, YARD.z1 + 0.5)]));
        const geo = new THREE.ShapeGeometry(outer);
        geo.rotateX(-Math.PI / 2);
        const field = new THREE.Mesh(geo, lam(0x0b0e0c));
        field.position.y = -0.03;
        yard.add(field);
      }

      // The deck: concrete slabs all over the yard, with the pool cut out.
      {
        const v = (x, z) => new THREE.Vector2(x, -z);
        const shape = new THREE.Shape([v(YARD.x0, YARD.z1), v(YARD.x1, YARD.z1), v(YARD.x1, YARD.z0), v(YARD.x0, YARD.z0)].reverse());
        shape.holes.push(new THREE.Path([v(PWX0, PWZ0), v(PWX1, PWZ0), v(PWX1, PWZ1), v(PWX0, PWZ1)]));
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(-Math.PI / 2);
        scaleUV(geo, 1 / 3, 1 / 3);
        yard.add(new THREE.Mesh(geo, concrete));
      }

      // Everything to do with the pool lives in this group, in the pool's frame.
      const poolRig = new THREE.Group();
      poolRig.position.set(POOL.cx, 0, POOL.cz);
      poolRig.rotation.y = -Math.PI / 2;
      yard.add(poolRig);

      // The pool's shell: tiled walls whose bottoms follow the floor, the floor
      // itself (shallow, slope, deep), three steps, and the coping.
      {
        const wallShape = (sign) => new THREE.Shape([
          [-HL, 0], [HL, 0], [HL, POOL.deep], [POOL.slope1, POOL.deep], [POOL.slope0, POOL.shallow], [-HL, POOL.shallow],
        ].map(([x, y]) => new THREE.Vector2(x * sign, y)));
        const near = new THREE.ShapeGeometry(wallShape(1));
        near.translate(0, 0, -HW);
        const far = new THREE.ShapeGeometry(wallShape(-1));
        far.rotateY(Math.PI);
        far.translate(0, 0, HW);
        for (const g of [near, far]) poolRig.add(new THREE.Mesh(scaleUV(g, 1 / TILE, 1 / TILE), tileMat));

        const deepWall = new THREE.PlaneGeometry(POOL.W, -POOL.deep);
        deepWall.rotateY(-Math.PI / 2);
        deepWall.translate(HL, POOL.deep / 2, 0);
        poolRig.add(new THREE.Mesh(scaleUV(deepWall, POOL.W / TILE, -POOL.deep / TILE), tileMat));

        const floorPiece = (x0, x1, y0, y1) => {
          const run = x1 - x0;
          const len = Math.hypot(run, y1 - y0);
          const geo = new THREE.PlaneGeometry(len, POOL.W);
          geo.rotateX(-Math.PI / 2);
          geo.rotateZ(Math.atan2(y1 - y0, run));
          geo.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
          poolRig.add(new THREE.Mesh(scaleUV(geo, len / TILE, POOL.W / TILE), tileMat));
        };
        floorPiece(-HL + 1.5, POOL.slope0, POOL.shallow, POOL.shallow);
        floorPiece(POOL.slope0, POOL.slope1, POOL.shallow, POOL.deep);
        floorPiece(POOL.slope1, HL, POOL.deep, POOL.deep);

        // The steps, with a dark tile edge on each.
        for (let i = 0; i < 3; i++) {
          const x0 = -HL + i * 0.5;
          const top = -0.25 * (i + 1);
          poolRig.add(
            block(-HL + 1.5 - x0, top - POOL.shallow, POOL.W, 0x8fc6d8, (x0 - HL + 1.5) / 2, (top + POOL.shallow) / 2, 0),
            block(0.06, 0.012, POOL.W, 0x1b3a5c, x0 + 0.03, top + 0.006, 0),
          );
        }

        // The dark band of waterline tile round the top of the walls.
        const band = (w, rotY, x, z) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.18), bandMat);
          m.rotation.y = rotY;
          m.position.set(x, -0.13, z);
          poolRig.add(m);
        };
        band(POOL.L, 0, 0, -HW + 0.004);
        band(POOL.L, Math.PI, 0, HW - 0.004);
        band(POOL.W, -Math.PI / 2, HL - 0.004, 0);
        band(POOL.W, Math.PI / 2, -HL + 0.004, 0);

        // Coping round the edge, overhanging slightly.
        const C = 0x9d9a92;
        poolRig.add(
          block(POOL.L + 0.8, 0.07, 0.4, C, 0, 0.02, -HW - 0.15),
          block(POOL.L + 0.8, 0.07, 0.4, C, 0, 0.02, HW + 0.15),
          block(0.4, 0.07, POOL.W, C, -HL - 0.15, 0.02, 0),
          block(0.4, 0.07, POOL.W, C, HL + 0.15, 0.02, 0),
        );

        // The main drain, skimmer mouths, and their lids on the deck.
        poolRig.add(block(0.44, 0.02, 0.44, 0x172026, 7.5, POOL.deep + 0.011, 0));
        for (let i = -1.5; i <= 1.5; i++) poolRig.add(block(0.4, 0.024, 0.03, 0x46535b, 7.5, POOL.deep + 0.013, i * 0.09));
        for (const x of [-6, 2]) {
          poolRig.add(block(0.34, 0.17, 0.05, 0x07090b, x, -0.13, HW - 0.02));
          poolRig.add(block(0.32, 0.02, 0.32, 0x8a8984, x, 0.01, HW + 0.55));
        }
      }

      // Ladders: chrome rails curving over the coping and down the wall, with
      // treads between them; and a handrail down the shallow-end steps.
      const chrome = new THREE.MeshPhongMaterial({ color: 0xb9c3ca, specular: 0xffffff, shininess: 90 });
      const rail = (pts) => poolRig.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 24, 0.025, 6), chrome));
      for (const side of [1, -1]) {
        const zEdge = side * HW;
        const x = 3.2;
        for (const dx of [-0.25, 0.25]) {
          rail([[0.5, 0], [0.42, 0.8], [0.05, 0.92], [-0.13, 0.6], [-0.13, -1.6]].map(([out, y]) => [x + dx, y, zEdge + side * out]));
        }
        for (const y of [-0.35, -0.75, -1.15, -1.55]) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.08), chrome);
          t.position.set(x, y, zEdge - side * 0.13);
          poolRig.add(t);
        }
      }
      rail([[-HL - 0.55, 0, -HW + 0.6], [-HL - 0.45, 0.9, -HW + 0.6], [-HL, 0.95, -HW + 0.6], [-HL + 1.45, 0.1, -HW + 0.6], [-HL + 1.75, -1, -HW + 0.6]]);

      // The diving board, out over the deep end.
      poolRig.add(block(0.6, 0.45, 0.55, 0x2a2e33, HL + 2.1, 0.225, 0), block(3.2, 0.06, 0.5, 0x7fa3b5, HL + 0.9, 0.5, 0));

      // The pool light, set in the deep-end wall: the only real light here,
      // cold and dim with a quick falloff, and a little lamp to wash the wall
      // round it.
      const LAMP = new THREE.Vector3(HL - 0.02, -2.2, 0);
      {
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshBasicMaterial({ color: 0xc8e6f7 }));
        lens.rotation.y = -Math.PI / 2;
        lens.position.copy(LAMP).add(new THREE.Vector3(-0.006, 0, 0));
        const rim = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.22, 20), chrome);
        rim.rotation.y = -Math.PI / 2;
        rim.position.copy(LAMP).add(new THREE.Vector3(-0.004, 0, 0));
        const shine = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x5d9fc8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        shine.position.copy(LAMP).add(new THREE.Vector3(-0.25, 0, 0));
        shine.scale.setScalar(1.3);
        const beam = new THREE.SpotLight(0xd4ecff, 22, 22, 1.1, 0.85, 2);
        beam.position.copy(LAMP).add(new THREE.Vector3(-0.25, 0.05, 0));
        beam.target.position.set(-HL, -1.2, 0);
        const wash = new THREE.PointLight(0xbfe4ff, 2, 4.5, 2);
        wash.position.copy(LAMP).add(new THREE.Vector3(-0.5, 0.1, 0));
        poolRig.add(lens, rim, shine, beam, beam.target, wash);
      }

      // Photos set into the tile like murals, mostly down in the deep end where
      // the light reaches them: [photo, wall, along, centre height, longer edge].
      const POOL_PHOTOS = [];
      for (const [stem, wall, along, y, long] of POOL_PHOTOS) {
        const mural = R.photo(stem, { long, frame: 0x1b3a5c, border: 0.06, depth: 0.012, label: "tile", labelSide: long < 0.8 ? 0 : 1, labelWidth: 0.3 });
        if (wall === "deep") { mural.position.set(HL - 0.006, y, along); mural.rotation.y = -Math.PI / 2; }
        if (wall === "far") { mural.position.set(along, y, HW - 0.006); mural.rotation.y = Math.PI; }
        if (wall === "near") { mural.position.set(along, y, -HW + 0.006); }
        poolRig.add(mural);
      }

      // Puddles left on the floor: dark and glossy, catching the light.
      const puddleMat = new THREE.MeshPhongMaterial({ color: 0x1e4652, specular: 0xbfe6ff, shininess: 140, transparent: true, opacity: 0.55, depthWrite: false });
      const puddles = [[-6, -2.5, 0.35], [-4, 2.8, 0.28], [6, -1.5, 0.5], [8.5, 2, 0.42], [7, 0.8, 0.3], [10, -3, 0.35]].map(([x, z, r], i) => {
        const geo = new THREE.CircleGeometry(r, 18);
        const jag = rng(300 + i);
        const pos = geo.attributes.position;
        for (let k = 1; k < pos.count; k++) {
          const f = 0.88 + jag() * 0.22;
          pos.setXY(k, pos.getX(k) * f * 1.3, pos.getY(k) * f);
        }
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, puddleMat);
        m.position.set(x, poolFloor(x) + 0.004, z);
        poolRig.add(m);
        return { m, x, z, r };
      });

      // The water that comes with the rain: a gently moving surface, softly
      // lit from the lamp beneath it.
      const waterGeo = new THREE.PlaneGeometry(POOL.L, POOL.W, 44, 20);
      waterGeo.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(waterGeo, new THREE.MeshPhongMaterial({ color: 0x0f4a5c, emissive: 0x05202a, specular: 0x9fd8ff, shininess: 90, transparent: true, opacity: 0.62, depthWrite: false }));
      water.position.y = POOL.deep;
      water.visible = false;
      const underGlow = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x2f7598, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
      underGlow.rotation.x = -Math.PI / 2;
      poolRig.add(water, underGlow);
      let waterY = POOL.deep;

      // Fences: weathered boards along the sides and the gate, and chain-link
      // across the back, so you can see out across the dark to the house.
      {
        const run = (x0, z0, x1, z1, mat) => {
          const len = Math.hypot(x1 - x0, z1 - z0);
          const chain = mat === chainMat;
          const geo = chain ? new THREE.PlaneGeometry(len, 1.9) : new THREE.BoxGeometry(len, 1.9, 0.06);
          const boards = new THREE.Mesh(scaleUV(geo, len / (chain ? 0.12 : TILE), chain ? 1.9 / 0.12 : 1), mat);
          boards.position.set((x0 + x1) / 2, 0.95, (z0 + z1) / 2);
          boards.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
          yard.add(boards);
          for (let d = 0; d <= len; d += chain ? 3 : 2.4) {
            const k = d / len;
            yard.add(block(0.08, 2.05, 0.08, chain ? 0x5b6066 : 0x2a2018, x0 + (x1 - x0) * k, 1.02, z0 + (z1 - z0) * k));
          }
          if (chain) yard.add(block(len, 0.04, 0.04, 0x5b6066, (x0 + x1) / 2, 1.92, (z0 + z1) / 2)).children.at(-1).rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        };
        const fx = YARD.x0 + 0.15;
        run(YARD.x0, YARD.z0, YARD.x1, YARD.z0, fenceMat);
        run(YARD.x0, YARD.z1, YARD.x1, YARD.z1, fenceMat);
        run(YARD.x1, YARD.z0, YARD.x1, YARD.z1, chainMat);
        run(fx, YARD.z0, fx, GATE.z - GATE.half - 0.05, fenceMat);
        run(fx, GATE.z + GATE.half + 0.05, fx, YARD.z1, fenceMat);
        // The gate: two tall posts and a beam over the top, and the gate itself
        // standing open against the fence.
        yard.add(
          block(0.14, GATE.h + 0.1, 0.14, 0x2a2018, fx, (GATE.h + 0.1) / 2, GATE.z - GATE.half - 0.07),
          block(0.14, GATE.h + 0.1, 0.14, 0x2a2018, fx, (GATE.h + 0.1) / 2, GATE.z + GATE.half + 0.07),
          block(0.14, 0.14, GATE.half * 2 + 0.5, 0x2a2018, fx, GATE.h + 0.1, GATE.z),
        );
        const leaf = new THREE.Mesh(scaleUV(new THREE.BoxGeometry(1.5, 1.8, 0.05), 1.5 / TILE, 1), fenceMat);
        leaf.position.set(0.78, 0.95, 0);
        const hinge = new THREE.Group();
        hinge.position.set(fx + 0.06, 0, GATE.z + GATE.half + 0.12);
        hinge.rotation.y = -0.12;
        hinge.add(leaf);
        yard.add(hinge);
      }

      // The house, a long way off across the dark: a black shape barely
      // separate from the haze, and one warm window.
      {
        const far = (color) => new THREE.MeshLambertMaterial({ color, fog: false });
        const house = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 16), far(0x11141b));
        body.position.set(0, 4, 0);
        const gable = new THREE.Shape([new THREE.Vector2(-5.4, 0), new THREE.Vector2(5.4, 0), new THREE.Vector2(0, 3.4)]);
        const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 16.6, bevelEnabled: false }), far(0x0c0e13));
        roof.position.set(0, 8, -8.3);
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 1), far(0x0c0e13));
        chimney.position.set(-2, 10.6, 4);
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: 0xffc46b, fog: false }));
        pane.rotation.y = -Math.PI / 2;
        pane.position.set(-5.02, 5.4, -2.5);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x5a3812, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
        glow.position.set(-5.5, 5.4, -2.5);
        glow.scale.setScalar(6);
        house.add(body, roof, chimney, pane, glow);
        house.position.set(165, 0, POOL.cz - 4);
        yard.add(house);
      }

      // The pump shed in the corner, humming.
      {
        const shed = new THREE.Group();
        shed.add(block(2.2, 2.0, 1.8, 0x23252a, 0, 1, 0));
        const roof = block(2.5, 0.08, 2.1, 0x15161a, 0, 2.1, 0);
        roof.rotation.x = 0.12;
        shed.add(roof, block(0.8, 1.7, 0.04, 0x17181c, -0.4, 0.85, -0.92), block(0.6, 0.5, 0.45, 0x30343a, -1.45, 0.25, -0.3));
        shed.position.copy(SHED);
        yard.add(shed);
        blockers.push({ x: SHED.x, z: SHED.z, r: 1.4 }, { x: SHED.x - 1.45, z: SHED.z - 0.3, r: 0.4 });
      }

      // A few trees, swaying.
      const yardTrees = [[11.6, -12, 1], [42, -12, 1.2], [12.2, 24.4, 1.1], [36, 24.6, 0.9], [11.4, -2, 0.85]].map(([x, z, sc], i) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 3, 6), lam(0x1d1712));
        trunk.position.y = 1.5;
        tree.add(trunk);
        const leafy = new THREE.MeshLambertMaterial({ color: 0x16211a, flatShading: true });
        const r = rng(400 + i);
        for (let k = 0; k < 4; k++) {
          const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + r() * 0.6, 0), leafy);
          blob.position.set((r() - 0.5) * 1.6, 3.3 + r() * 1.3, (r() - 0.5) * 1.6);
          tree.add(blob);
        }
        tree.scale.setScalar(sc);
        tree.position.set(x, 0, z);
        yard.add(tree);
        blockers.push({ x, z, r: 0.3 });
        return { tree, phase: i * 1.9 };
      });

      // Dead leaves, mostly down in the pool, skittering in the gusts and
      // floating once there's water. They live in the pool's frame.
      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, -0.07);
      leafShape.quadraticCurveTo(0.05, -0.01, 0, 0.07);
      leafShape.quadraticCurveTo(-0.05, -0.01, 0, -0.07);
      const leafGeo = new THREE.ShapeGeometry(leafShape, 3);
      leafGeo.rotateX(-Math.PI / 2);
      const leafMats = [0x6b4a2a, 0x7a5a2c, 0x4f3a22, 0x8a5f2e].map((color) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
      const floorLocal = (lx, lz) => (inPoolLocal(lx, lz) ? poolFloor(lx) : 0);
      const leaves = Array.from({ length: 34 }, (_, i) => {
        const r = rng(500 + i);
        let x;
        let z;
        if (i >= 24) {
          const at = toPool(YARD.x0 + 2 + r() * (YARD.x1 - YARD.x0 - 4), YARD.z0 + 2 + r() * (YARD.z1 - YARD.z0 - 4));
          x = at.lx;
          z = at.lz;
        } else {
          x = -HL + 1.7 + r() * (POOL.L - 2);
          z = -HW + 0.3 + r() * (POOL.W - 0.6);
        }
        const m = new THREE.Mesh(leafGeo, leafMats[i % leafMats.length]);
        m.scale.setScalar(0.8 + r() * 0.6);
        poolRig.add(m);
        return { m, x, z, y: floorLocal(x, z) + 0.004, vx: 0, vz: 0, spin: (r() - 0.5) * 8, k: 0.6 + r() * 0.8, phase: r() * 10 };
      });
      const gust = { next: 5, start: -10, len: 2, dir: 0, strength: 0 };

      // Moths round the lamp.
      const mothWing = new THREE.PlaneGeometry(0.035, 0.028);
      mothWing.translate(0.018, 0, 0);
      const mothMat = new THREE.MeshBasicMaterial({ color: 0xa9a294, side: THREE.DoubleSide });
      const moths = Array.from({ length: 6 }, (_, i) => {
        const moth = new THREE.Group();
        const l = new THREE.Mesh(mothWing, mothMat);
        const r = new THREE.Mesh(mothWing, mothMat);
        r.scale.x = -1;
        moth.add(l, r);
        poolRig.add(moth);
        return { moth, l, r, a: 1.3 + i * 0.37, b: 2.1 + i * 0.23, c: 1.7 + i * 0.31, phase: i * 1.1 };
      });

      // Rain: streaks falling round you, and rings spreading where drops land.
      const DROPS = 450;
      const dropPos = new Float32Array(DROPS * 6);
      const dropGeo = new THREE.BufferGeometry();
      dropGeo.setAttribute("position", new THREE.BufferAttribute(dropPos, 3));
      const rain = new THREE.LineSegments(dropGeo, new THREE.LineBasicMaterial({ color: 0x8fa3b8, transparent: true, opacity: 0, depthWrite: false }));
      rain.frustumCulled = false;
      rain.visible = false;
      yard.add(rain);
      const dropState = Array.from({ length: DROPS }, () => ({ x: 0, y: -99, z: 0 }));
      const ringGeo = new THREE.RingGeometry(0.8, 1, 20);
      ringGeo.rotateX(-Math.PI / 2);
      const ripples = Array.from({ length: 40 }, () => {
        const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        mesh.visible = false;
        poolRig.add(mesh);
        return { mesh, age: 1, life: 0.8 };
      });
      let nextRipple = 0;

      const storm = { outHere: 0, raining: false, fill: 0, rain: 0 };
      function drainPool() {
        storm.outHere = 0;
        storm.raining = false;
        storm.fill = 0;
        storm.rain = 0;
        for (const r of ripples) r.mesh.visible = false;
      }

      const gusts = [];
      function backyard(t, dt, here) {
        const you = R.player;
        yardSky.position.copy(R.camLocal);

        // The storm: a minute out here, or the deep end, brings the rain, and
        // the rain slowly fills the pool to about waist deep.
        if (here) storm.outHere += dt;
        const atDeepEnd = here && inPool(you.x, you.z) && toPool(you.x, you.z).lx > POOL.slope1;
        if (!storm.raining && here && (storm.outHere > 60 || atDeepEnd)) storm.raining = true;
        storm.rain += ((storm.raining ? 1 : 0) - storm.rain) * Math.min(1, dt * 0.4);
        if (storm.raining) storm.fill = Math.min(1, storm.fill + dt / 150);
        waterY = POOL.deep + 0.02 + storm.fill * (WATER_TOP - POOL.deep - 0.02);
        water.visible = storm.fill > 0.002;
        underGlow.material.opacity = Math.min(1, storm.fill * 3) * 0.45;
        underGlow.position.set(LAMP.x - 2.4, waterY + 0.01, LAMP.z);
        for (const p of puddles) p.m.visible = waterY < poolFloor(p.x) + 0.01;
        if (!here) return;

        if (water.visible) {
          water.position.y = waterY;
          const pos = waterGeo.attributes.position;
          const choppy = 1 + storm.rain * 1.5;
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            pos.setY(i, (Math.sin(x * 3 + t * 1.7) * 0.008 + Math.sin(z * 4.1 - t * 1.3) * 0.006) * choppy);
          }
          pos.needsUpdate = true;
          waterGeo.computeVertexNormals();
        }

        // Gusts: a few seconds of wind every so often.
        if (t > gust.next) {
          gust.start = t;
          gust.len = 1.8 + Math.random() * 1.6;
          gust.dir = Math.random() * Math.PI * 2;
          gust.next = t + 6 + Math.random() * 8;
          if (here) gusts.forEach((f) => f(gust.len));
        }
        const g = t - gust.start;
        gust.strength = g < gust.len ? Math.sin((g / gust.len) * Math.PI) : 0;

        for (const { tree, phase } of yardTrees) {
          tree.rotation.z = Math.sin(t * 0.9 + phase) * 0.012 + gust.strength * 0.035 * Math.sin(t * 3 + phase);
          tree.rotation.x = Math.sin(t * 0.7 + phase * 1.3) * 0.01;
        }

        for (const L of leaves) {
          const floor = floorLocal(L.x, L.z);
          const floating = water.visible && waterY > floor + 0.01 && inPoolLocal(L.x, L.z);
          const push = gust.strength * 3 * L.k;
          L.vx += (Math.cos(gust.dir) * push + Math.sin(t * 2 + L.phase) * 0.15 * gust.strength) * dt;
          L.vz += (Math.sin(gust.dir) * push + Math.cos(t * 1.7 + L.phase) * 0.15 * gust.strength) * dt;
          if (floating) {
            L.vx += Math.sin(t * 0.3 + L.phase) * 0.02 * dt;
            L.vz += Math.cos(t * 0.25 + L.phase) * 0.02 * dt;
          }
          const drag = Math.exp(-dt * (floating ? 0.6 : 1.8));
          L.vx *= drag;
          L.vz *= drag;
          let nx = L.x + L.vx * dt;
          let nz = L.z + L.vz * dt;
          if (inPoolLocal(L.x, L.z) && L.y < -0.05) {
            // Down in the pool, the walls keep them in.
            if (Math.abs(nx) > HL - 0.05) { L.vx = -L.vx * 0.4; nx = L.x; }
            if (Math.abs(nz) > HW - 0.05) { L.vz = -L.vz * 0.4; nz = L.z; }
          } else {
            // Up on the deck, the fences do.
            const w = fromPool(nx, nz);
            if (w.x < YARD.x0 + 0.3 || w.x > YARD.x1 - 0.2 || w.z < YARD.z0 + 0.2 || w.z > YARD.z1 - 0.2) {
              L.vx = -L.vx * 0.4;
              L.vz = -L.vz * 0.4;
              nx = L.x;
              nz = L.z;
            }
          }
          L.x = nx;
          L.z = nz;
          const target = floating ? waterY + 0.004 : floorLocal(L.x, L.z) + 0.004;
          L.y = target < L.y ? Math.max(target, L.y - 3 * dt) : target; // drop in, don't jump out
          const speed = Math.hypot(L.vx, L.vz);
          L.m.position.set(L.x, L.y, L.z);
          L.m.rotation.y += L.spin * speed * dt;
          L.m.rotation.x = Math.sin(t * 20 + L.phase) * Math.min(0.5, speed * 0.3);
        }

        for (const m of moths) {
          const x = LAMP.x - 0.5 - (1 + Math.sin(t * m.a + m.phase)) * 0.35;
          const y = Math.max(waterY + 0.15, LAMP.y + 0.3 + Math.sin(t * m.b + m.phase) * 0.35);
          const z = LAMP.z + Math.sin(t * m.c + m.phase * 2) * 0.6;
          m.moth.position.set(x, y, z);
          m.moth.rotation.y = t * m.a + m.phase;
          const flap = Math.sin(t * 38 + m.phase) * 0.9;
          m.l.rotation.y = flap;
          m.r.rotation.y = -flap;
        }

        // Rain round you, and rings on the water and the puddles.
        rain.visible = storm.rain > 0.01;
        if (rain.visible) {
          rain.material.opacity = storm.rain * 0.35;
          for (let i = 0; i < DROPS; i++) {
            const d = dropState[i];
            d.y -= 11 * dt;
            if (d.y < yardFloor(d.x, d.z)) {
              d.x = you.x + (Math.random() - 0.5) * 20;
              d.z = you.z + (Math.random() - 0.5) * 20;
              d.y = 4 + Math.random() * 7;
            }
            dropPos.set([d.x, d.y, d.z, d.x - 0.03, d.y + 0.35, d.z], i * 6);
          }
          dropGeo.attributes.position.needsUpdate = true;
          nextRipple -= dt * 32 * storm.rain;
          while (nextRipple < 0) {
            nextRipple += 1;
            const r = ripples.find((q) => q.age >= q.life);
            if (!r) break;
            let x;
            let y;
            let z;
            if (water.visible && storm.fill > 0.02) {
              x = -HL + Math.random() * POOL.L;
              z = -HW + Math.random() * POOL.W;
              if (poolFloor(x) > waterY - 0.02) continue;
              y = waterY + 0.012;
            } else {
              const p = puddles[Math.floor(Math.random() * puddles.length)];
              const a = Math.random() * Math.PI * 2;
              const d = Math.random() * p.r * 0.7;
              x = p.x + Math.cos(a) * d * 1.3;
              z = p.z + Math.sin(a) * d;
              y = poolFloor(p.x) + 0.008;
            }
            r.mesh.position.set(x, y, z);
            r.age = 0;
            r.life = 0.6 + Math.random() * 0.5;
            r.mesh.visible = true;
          }
        }
        for (const r of ripples) {
          if (!r.mesh.visible) continue;
          r.age += dt;
          if (r.age >= r.life) { r.mesh.visible = false; continue; }
          const k = r.age / r.life;
          r.mesh.scale.setScalar(0.02 + k * 0.22);
          r.mesh.material.opacity = (1 - k) * 0.5;
        }
      }

      // Small things left out: a lounge chair, a skimmer net against the fence,
      // a deflated ring down in the deep end, a coiled hose by the shed.
      {
        const chair = new THREE.Group();
        const frameC = 0xb8b4ab;
        const slat = 0x2f5d7c;
        chair.add(block(0.62, 0.05, 1.3, slat, 0, 0.32, 0));
        const back = block(0.62, 0.05, 0.75, slat, 0, 0.62, -0.88);
        back.rotation.x = 0.85;
        chair.add(back);
        for (const x of [-0.29, 0.29]) for (const z of [-0.55, 0.55]) chair.add(block(0.04, 0.32, 0.04, frameC, x, 0.16, z));
        chair.position.set(PWX0 - 2.6, 0, POOL.cz + 3);
        chair.rotation.y = 0.4;
        yard.add(chair);
        blockers.push({ x: PWX0 - 2.6, z: POOL.cz + 3, r: 0.6 });

        const net = new THREE.Group();
        net.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.2, 5), chrome), {}));
        net.children[0].position.y = 1.6;
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 4, 12), chrome);
        hoop.position.y = 3.3;
        net.add(hoop);
        net.position.set(YARD.x1 - 0.3, 0, -9);
        net.rotation.z = 0.18;
        yard.add(net);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 6, 14), new THREE.MeshLambertMaterial({ color: 0xd8634a }));
        ring.rotation.x = -Math.PI / 2;
        ring.scale.set(1, 1, 0.35);
        ring.position.set(9.2, POOL.deep + 0.05, -2.6);
        ring.rotation.z = 0.3;
        poolRig.add(ring);

        const hose = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 4, 18), lam(0x2f6b3a));
        hose.rotation.x = -Math.PI / 2;
        hose.position.set(SHED.x - 1.8, 0.03, SHED.z + 0.4);
        const hose2 = hose.clone();
        hose2.scale.setScalar(0.8);
        hose2.position.y = 0.08;
        yard.add(hose, hose2);
      }

      // A dim lamp on the gate post, so arriving isn't pitch black.
      {
        const lampAt = new THREE.Vector3(YARD.x0 + 0.35, 2.2, GATE.z - GATE.half - 0.3);
        const lamp = new THREE.PointLight(0xffc98a, 2.2, 9, 1.6);
        lamp.position.copy(lampAt);
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
        bulb.position.copy(lampAt);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6b4a22, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        halo.position.copy(lampAt);
        halo.scale.setScalar(1.4);
        yard.add(lamp, bulb, halo, block(0.05, 0.05, 0.25, 0x2a2018, lampAt.x, lampAt.y + 0.1, lampAt.z + 0.12));
      }

      const api = {
        floor: yardFloor,
    ground: (x, z) => (inPool(x, z) ? "tile" : "concrete"),
        walls: [
          [YARD.x0, YARD.z0, YARD.x0, GATE.z - GATE.half],
          [YARD.x0, GATE.z + GATE.half, YARD.x0, YARD.z1],
          [YARD.x0, YARD.z0, YARD.x1, YARD.z0],
          [YARD.x0, YARD.z1, YARD.x1, YARD.z1],
          [YARD.x1, YARD.z0, YARD.x1, YARD.z1],
          [YARD.x0 + 0.2, GATE.z + GATE.half + 0.12, YARD.x0 + 1.7, GATE.z + GATE.half + 0.3],
          [PWX0, PWZ0, PWX0, PWZ1],
          [PWX1, PWZ0, PWX1, PWZ1],
          [PWX0, PWZ1, PWX1, PWZ1],
          [POOL.cx, PWZ1 + 0.1, POOL.cx, PWZ1 + 2.4],
        ],
        blockers,
        pace: (p) => (waterY - yardFloor(p.x, p.z) > 0.35 ? 0.6 : 1),
        action: { label: "Drain the pool", run: drainPool },
        onKey: (code) => { if (code === "KeyR") drainPool(); },
        storm,
        gusts,
        SHED,
        update: (t, dt, info) => backyard(t, dt, info.here),
      };
      return api;
    },
    sound(A, R, api) {
      // Crickets along the fence, a dog somewhere down the street, the pump
      // humming in its shed, rain, and leaves rattling in the gusts.
      for (const [x, z] of [[11, -12], [42, 24], [42, -12], [12, 24]]) {
        const chirp = A.osc("sine", 3800 + A.chance() * 700);
        const amp = A.gain(0);
        chirp.connect(amp).connect(A.placed(x, 0.3, z, 2, 1.2));
        let t = A.ctx.currentTime + A.chance();
        A.extras.push((until) => {
          t = Math.max(t, A.ctx.currentTime);
          while (t < until) {
            for (let i = 0; i < 2; i++) {
              amp.gain.setValueAtTime(0.04, t);
              amp.gain.setValueAtTime(0, t + 0.02);
              t += 0.04;
            }
            t += A.chance() < 0.1 ? 2 + A.chance() * 3 : 0.6 + A.chance() * 0.7;
          }
        });
      }
      const humTone = A.filter("lowpass", 280);
      A.osc("sawtooth", 59.5).connect(humTone);
      A.osc("sine", 120.3).connect(humTone);
      humTone.connect(A.gain(0.14)).connect(A.placed(api.SHED.x, 0.8, api.SHED.z, 1.2, 1.2));

      const dog = A.osc("triangle", 400);
      const dogAmp = A.gain(0);
      const dogBreath = A.gain(0);
      const distant = A.filter("lowpass", 1300);
      dog.connect(dogAmp).connect(distant);
      A.hiss().connect(A.filter("bandpass", 700, 2)).connect(dogBreath).connect(distant);
      distant.connect(A.placed(60, 1, 45, 8, 1.2));
      let woof = A.ctx.currentTime + 9;
      A.extras.push((until) => {
        woof = Math.max(woof, A.ctx.currentTime);
        while (woof < until) {
          let t = woof;
          for (let i = 0, n = 2 + Math.floor(A.chance() * 3); i < n; i++) {
            dog.frequency.setValueAtTime(420 + A.chance() * 60, t);
            dog.frequency.exponentialRampToValueAtTime(230, t + 0.16);
            dogAmp.gain.setTargetAtTime(0.5, t, 0.01);
            dogAmp.gain.setTargetAtTime(0, t + 0.12, 0.03);
            dogBreath.gain.setTargetAtTime(0.25, t, 0.01);
            dogBreath.gain.setTargetAtTime(0, t + 0.1, 0.03);
            t += 0.32 + A.chance() * 0.25;
          }
          woof += 18 + A.chance() * 24;
        }
      });

      const rainAmp = A.gain(0);
      A.hiss().connect(A.filter("highpass", 1200)).connect(rainAmp);
      A.hiss().connect(A.filter("bandpass", 450)).connect(rainAmp);
      rainAmp.connect(A.bus);

      const gustAmp = A.gain(0.012);
      A.hiss().connect(A.filter("lowpass", 500)).connect(gustAmp).connect(A.bus);
      const crackle = A.gain(0);
      A.hiss().connect(A.filter("highpass", 3000)).connect(crackle).connect(A.bus);
      api.gusts.push((len) => {
        const now = A.ctx.currentTime;
        gustAmp.gain.setTargetAtTime(0.09, now, len * 0.3);
        gustAmp.gain.setTargetAtTime(0.012, now + len * 0.7, 0.6);
        for (let k = 0; k < len; k += 0.03 + A.chance() * 0.05) {
          crackle.gain.setValueAtTime(A.chance() < 0.5 ? 0 : (0.02 + A.chance() * 0.05) * Math.sin((k / len) * Math.PI), now + k);
        }
        crackle.gain.setValueAtTime(0, now + len);
      });
      return {
        update() { rainAmp.gain.setTargetAtTime(api.storm.rain * 0.025, A.ctx.currentTime, 0.5); },
      };
    },
  };
