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
  // An octagonal hall. Each side but the entrance has a doorway with the
  // room's name over it and a short vestibule beyond, whose walls take on
  // the room's colour as you go and whose floor catches its light. In the
  // middle of the floor, an inlaid map of where everything is.

  ROOMS.lobby = {
    name: "The Lobby",
    tagline: "Every room starts here",
    color: 0xe7c27d,
    fogColor: 0x15130f,
    loudness: 1.75,
    ground: "wood",
    spawn: { x: 0, z: -4.6, yaw: Math.PI, pitch: -0.05 },
    build(R) {
      const A = LOBBY.apothem;
      const H = LOBBY.height;
      const side = 2 * A * Math.tan(Math.PI / 8);
      const RV = A / Math.cos(Math.PI / 8);
      R.scene.fog = new THREE.FogExp2(0x15130f, 0.012);
      const fogBase = new THREE.Color(0x15130f);

      R.add(new THREE.HemisphereLight(0xfff1dc, 0x2a2118, 0.9));
      const lamp = new THREE.PointLight(0xffd9a6, 26, 26, 1.6);
      lamp.position.set(0, H - 0.8, 0);
      R.add(lamp);

      // Floor and ceiling: wide boards, a dark coffered ceiling.
      const boards = boardsTexture(11, [58, 44, 32]);
      boards.repeat.set(2, 2);
      const floorGeo = new THREE.CircleGeometry(RV, 8, Math.PI / 8);
      floorGeo.rotateX(-Math.PI / 2);
      scaleUV(floorGeo, RV / 4, RV / 4);
      const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: boards, roughness: 0.7 }));
      floor.receiveShadow = true;
      const ceilGeo = new THREE.CircleGeometry(RV, 8, Math.PI / 8);
      ceilGeo.rotateX(Math.PI / 2);
      const ceiling = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0x221d18, roughness: 1 }));
      ceiling.position.y = H;
      R.add(floor, ceiling);

      // A ring light hanging in the middle.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = H - 0.9;
      R.add(ring);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        R.add(part(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 4), 0x2a2420, Math.cos(a) * 1.6, H - 0.45, Math.sin(a) * 1.6));
      }

      // The inlaid map: a brass compass rose with a line out to each room.
      const inlay = canvasTex(1024, 1024, (g) => {
        g.translate(512, 512);
        g.fillStyle = "rgba(20, 16, 12, 0.85)";
        g.beginPath();
        g.arc(0, 0, 500, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#b8955a";
        g.lineWidth = 6;
        g.beginPath();
        g.arc(0, 0, 492, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(0, 0, 120, 0, Math.PI * 2);
        g.stroke();
        for (const slot of SLOTS) {
          const a = THREE.MathUtils.degToRad(slot.angle);
          // The floor is seen from above with +z up the canvas page... drawn
          // so that each line points at its doorway when you stand on it.
          const x = Math.sin(a);
          const y = -Math.cos(a);
          const def = slot.room ? ROOMS[slot.room] : null;
          g.strokeStyle = def ? `#${new THREE.Color(def.color).getHexString()}` : "#5c5040";
          g.lineWidth = def ? 10 : 4;
          g.beginPath();
          g.moveTo(x * 130, y * 130);
          g.lineTo(x * 330, y * 330);
          g.stroke();
          g.save();
          g.translate(x * 410, y * 410);
          g.rotate(Math.atan2(y, x) + Math.PI / 2);
          g.fillStyle = def ? "#ead9b0" : "#7a6c58";
          g.font = "500 40px Poppins, system-ui, sans-serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(def ? def.short ?? def.name : slot.entrance ? "Entrance" : "Soon", 0, 0);
          g.restore();
        }
        g.fillStyle = "#b8955a";
        g.beginPath();
        g.moveTo(0, -95); g.lineTo(18, 0); g.lineTo(0, 95); g.lineTo(-18, 0); g.closePath();
        g.fill();
      }, { repeat: false });
      fontsReady.then(() => inlay.needsUpdate = true);
      const inlayGeo = new THREE.CircleGeometry(2.8, 48);
      inlayGeo.rotateX(-Math.PI / 2);
      const inlayMesh = new THREE.Mesh(inlayGeo, new THREE.MeshStandardMaterial({ map: inlay, roughness: 0.5, metalness: 0.2, transparent: true }));
      inlayMesh.position.y = 0.004;
      inlayMesh.rotation.y = Math.PI;
      R.add(inlayMesh);

      const walls = [];
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a423a, roughness: 0.95 });
      const leaks = [];
      for (const slot of SLOTS) {
        const a = THREE.MathUtils.degToRad(slot.angle);
        const d = slot.dir;
        const t = new THREE.Vector3(d.z, 0, -d.x); // across the doorway
        const def = (slot.room && ROOMS[slot.room]) || null;
        const open = !!def;
        // The wall of the octagon, facing in.
        const wall = wallFaces(side, H, wallMat, !slot.entrance ? { x: 0, half: DOOR_HALF, h: DOOR_H } : null, 0x1d1915);
        wall.position.copy(d).multiplyScalar(A);
        wall.rotation.y = a + Math.PI;
        R.add(wall);
        const v0 = new THREE.Vector3().copy(d).multiplyScalar(A).addScaledVector(t, -side / 2);
        const v1 = new THREE.Vector3().copy(d).multiplyScalar(A).addScaledVector(t, side / 2);
        const gap0 = new THREE.Vector3().copy(d).multiplyScalar(A).addScaledVector(t, -DOOR_HALF);
        const gap1 = new THREE.Vector3().copy(d).multiplyScalar(A).addScaledVector(t, DOOR_HALF);
        if (open) walls.push([v0.x, v0.z, gap0.x, gap0.z], [gap1.x, gap1.z, v1.x, v1.z]);
        else walls.push([v0.x, v0.z, v1.x, v1.z]);

        if (slot.entrance) {
          // The way in: tall double doors, closed, under the gallery's name.
          const doorsGroup = new THREE.Group();
          doorsGroup.add(doorFrame(0x2b2119, 1.3, 3.0, 0.25, 0.14));
          for (const s of [-1, 1]) {
            const leaf = part(new THREE.BoxGeometry(1.28, 2.98, 0.08), 0x3a2b1f, s * 0.65, 1.49, 0);
            leaf.add(part(new THREE.BoxGeometry(0.05, 0.4, 0.05), 0xb8955a, -s * 0.5, 0, 0.07));
            doorsGroup.add(leaf);
          }
          const sign = labelMesh(["Steven Guarino", "Photographs", ""], "brass", 2.4);
          sign.position.set(0, 3.75, 0.02);
          doorsGroup.add(sign);
          doorsGroup.position.copy(d).multiplyScalar(A - 0.05);
          doorsGroup.rotation.y = a + Math.PI;
          R.add(doorsGroup);
          // Two featured photos either side of the doors.
          for (const [stem, s] of [["DSC06067", -1], ["Cruise-5", 1]]) {
            const pic = R.photo(stem, { long: 1.15, label: "card", labelSide: 0 });
            const along = s * 2.25;
            pic.position.copy(d).multiplyScalar(A - 0.03).addScaledVector(t, -along).setY(1.72);
            pic.rotation.y = a + Math.PI;
            R.add(pic);
          }
          continue;
        }

        const frame = doorFrame(0x2b2119);
        frame.position.copy(d).multiplyScalar(A);
        frame.rotation.y = a + Math.PI;
        R.add(frame);

        // The room's name over the door.
        const plate = labelMesh([def ? def.name : "Coming soon", def ? def.tagline : "A new room is on its way", ""], "brass", 1.5);
        plate.position.copy(d).multiplyScalar(A - 0.02).setY(DOOR_H + 0.62);
        plate.rotation.y = a + Math.PI;
        R.add(plate);
        if (def) {
          const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.05), new THREE.MeshBasicMaterial({ color: def.color }));
          stripe.position.copy(d).multiplyScalar(A - 0.021).setY(DOOR_H + 0.62 - 0.4);
          stripe.rotation.y = a + Math.PI;
          R.add(stripe);
        }

        if (!def) {
          // A closed door for the room still to come.
          const leaf = part(new THREE.BoxGeometry(DOOR_HALF * 2, DOOR_H, 0.06), 0x2e241c, 0, DOOR_H / 2, 0.03);
          leaf.position.copy(d).multiplyScalar(A + 0.03).setY(DOOR_H / 2);
          leaf.rotation.y = a + Math.PI;
          R.add(leaf);
          continue;
        }

        // The vestibule: walls that shade from the lobby's colour into the
        // room's, a low ceiling, the floor running on, and light from the
        // room spilling across it.
        const L = LOBBY.corridor;
        const CH = LOBBY.corridorH;
        const CW = LOBBY.corridorHalf;
        const room = new THREE.Color(def.leak ?? def.color);
        const lobbyTone = new THREE.Color(0x4a423a);
        // Shade a side wall from the lobby's tone at the lobby end to the
        // room's at the room end; `sign` says which way the plane's x runs.
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
          m.position.set(s * CW, CH / 2, A + L / 2);
          m.rotation.y = -s * Math.PI / 2;
          vestibule.add(m);
        }
        const vfloorGeo = new THREE.PlaneGeometry(CW * 2, L);
        vfloorGeo.rotateX(-Math.PI / 2);
        scaleUV(vfloorGeo, (CW * 2) / 4, L / 4);
        const vfloor = new THREE.Mesh(vfloorGeo, floor.material);
        vfloor.position.set(0, 0.001, A + L / 2);
        const vceilGeo = new THREE.PlaneGeometry(CW * 2, L);
        vceilGeo.rotateX(Math.PI / 2);
        const vceil = new THREE.Mesh(vceilGeo, ceiling.material);
        vceil.position.set(0, CH, A + L / 2);
        vestibule.add(vfloor, vceil);
        // The wall above the lobby door (the vestibule is lower than the
        // lobby) and the end wall round the room's doorway.
        const endWall = wallFaces(CW * 2, CH, new THREE.MeshStandardMaterial({ color: room.clone().multiplyScalar(0.3).lerp(lobbyTone, 0.3), roughness: 0.95 }), { x: 0, half: DOOR_HALF, h: DOOR_H }, null);
        endWall.position.set(0, 0, A + L);
        endWall.rotation.y = Math.PI;
        vestibule.add(endWall);
        const endFrame = doorFrame(def.frame ?? 0x2b2119);
        endFrame.position.set(0, 0, A + L - 0.05);
        endFrame.rotation.y = Math.PI;
        vestibule.add(endFrame);
        // A little lamp halfway along, and the light from the room pooled on
        // the floor by its door.
        vestibule.add(part(new THREE.BoxGeometry(0.5, 0.04, 0.5), 0x2a2420, 0, CH - 0.02, A + 1.6));
        const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xfff0d8 }));
        bulb.rotation.x = Math.PI / 2;
        bulb.position.set(0, CH - 0.045, A + 1.6);
        vestibule.add(bulb);
        const spill = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, color: room.clone().multiplyScalar(0.55), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        spill.rotation.x = -Math.PI / 2;
        spill.position.set(0, 0.006, A + L - 0.9);
        vestibule.add(spill);
        // What shows in the doorway until the room is built, and from inside
        // another room: a glow in the room's colour.
        const card = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_HALF * 4, DOOR_H * 1.6), new THREE.MeshBasicMaterial({ map: glowTex, color: room.clone().multiplyScalar(0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        card.position.set(0, DOOR_H / 2, A + L + 0.25);
        card.rotation.y = Math.PI;
        vestibule.add(card);
        vestibule.rotation.y = a;
        R.add(vestibule);
        leaks.push({ slot, spill, card, base: spill.material.color.clone(), style: def.leakStyle });

        // Bumping: the vestibule's sides, and the stubs either side of the
        // room's door.
        const at = (along, across) => new THREE.Vector3().copy(d).multiplyScalar(along).addScaledVector(t, across);
        for (const s of [-1, 1]) {
          const p0 = at(A, s * CW);
          const p1 = at(A + L, s * CW);
          const q = at(A + L, s * DOOR_HALF);
          walls.push([p0.x, p0.z, p1.x, p1.z], [p1.x, p1.z, q.x, q.z]);
        }
        // The lobby wall stubs between the lobby door and the vestibule.
        for (const s of [-1, 1]) {
          const p0 = at(A, s * DOOR_HALF);
          const p1 = at(A, s * CW);
          walls.push([p0.x, p0.z, p1.x, p1.z]);
        }
      }

      // Benches along the entrance side.
      for (const s of [-1, 1]) {
        const bench = new THREE.Group();
        bench.add(part(new THREE.BoxGeometry(1.8, 0.08, 0.45), 0x6b4f36, 0, 0.44, 0));
        for (const x of [-0.75, 0.75]) bench.add(part(new THREE.BoxGeometry(0.07, 0.4, 0.38), 0x1d1915, x, 0.2, 0));
        const a = THREE.MathUtils.degToRad(180 + s * 45);
        const d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
        bench.position.copy(d).multiplyScalar(A - 1.1);
        bench.rotation.y = a;
        R.add(bench);
      }
      const blockers = [-1, 1].flatMap((s) => {
        const a = THREE.MathUtils.degToRad(180 + s * 45);
        const c = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(A - 1.1);
        const t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
        return [-0.6, 0, 0.6].map((k) => ({ x: c.x + t.x * k, z: c.z + t.z * k, r: 0.3 }));
      });

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
        update(t, dt, { cor }) {
          // Walking down a vestibule, the air takes on the room's colour.
          const target = cor?.room ? fogBase.clone().lerp(new THREE.Color(ROOMS[cor.room].fogColor ?? 0x15130f), smooth(cor.progress, 0, 1) * 0.8) : fogBase;
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
    sound(A) {
      // The lobby's hush: a soft room tone.
      const tone = A.filter("lowpass", 220, 0.5);
      const g = A.gain(0.05);
      A.hiss().connect(tone).connect(g).connect(A.bus);
      return {};
    },
  };
