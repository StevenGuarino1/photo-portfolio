  // ---------- Building parts ----------
  // Flat-shaded, low-poly, one colour per part: the old-school RuneScape look.

  // Every room keeps its own materials (a doorway draws a room through a
  // stencil, which is set per material), so `mat` reads whichever room is
  // being built.
  let MATS = new Map();
  const mat = (color) => {
    if (!MATS.has(color)) {
      MATS.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 }));
    }
    return MATS.get(color);
  };

  function part(geometry, color, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, mat(color));
    m.position.set(x, y, z);
    return m;
  }

  // A tapered limb or trunk piece running from the joint along +y or -y,
  // squashed front-to-back by `depth` so it reads as a body, not a pipe.
  function taper(length, rStart, rEnd, color, dir = -1, sides = 8, depth = 1) {
    const top = dir > 0 ? rEnd : rStart;
    const bottom = dir > 0 ? rStart : rEnd;
    const m = part(new THREE.CylinderGeometry(top, bottom, length, sides, 2), color, 0, (dir * length) / 2, 0);
    m.scale.z = depth;
    return m;
  }

  const ball = (r, color, detail = 0) => part(new THREE.IcosahedronGeometry(r, detail), color);

  // ---------- People ----------
  // Each is the same skeleton dressed differently. Facing +z, in metres.
  // Joints rotate in ZXY order: twist along the bone, then forward/back (x),
  // then out to the side (z). Arms and legs hang along -y, so negative x
  // swings them forward; the spine and head point up, so positive x bows
  // them forward. A knee bends with positive x, an elbow with negative x.

  const SKIN = [0xf1c9a5, 0xd9a07a, 0xb5774f, 0x8d5534, 0x5e3a24];

  const PEOPLE = [
    { height: 1.0, build: 1.15, skin: 0, hair: ["short", 0x3b2a1e], top: 0x2f5d8c, sleeves: "long", legs: 0x2b2b33, shoes: 0x1c1c1c },
    { height: 0.95, build: 0.95, skin: 3, hair: ["long", 0x1a1412], top: 0xb8443a, sleeves: "short", legs: 0x3a3f6b, shoes: 0xe9e4da, skirt: true },
    { height: 1.04, build: 1.2, skin: 2, hair: ["bald", 0], beard: 0x2a1d14, top: 0x4f7d4c, sleeves: "short", legs: 0x6b5a45, shoes: 0x3a2a1e },
    { height: 0.98, build: 1.0, skin: 1, hair: ["beanie", 0xd9a441], top: 0x6b4a8a, sleeves: "long", legs: 0x22303f, shoes: 0xc94f3d },
    { height: 0.93, build: 0.9, skin: 4, hair: ["ponytail", 0x0f0c0b], top: 0xe0d6c3, sleeves: "short", legs: 0x2b2b33, shoes: 0x1c1c1c },
    { height: 1.02, build: 1.1, skin: 0, hair: ["short", 0xc9a35a], top: 0x8a3b52, sleeves: "long", legs: 0x4a4a4a, shoes: 0x7a5b3c },
    { height: 0.97, build: 1.05, skin: 2, hair: ["long", 0x6e3b1f], top: 0x2f8a86, sleeves: "short", legs: 0x1f1f26, shoes: 0xe9e4da, skirt: true },
    { height: 1.01, build: 1.25, skin: 3, hair: ["short", 0x111111], top: 0xd2873a, sleeves: "long", legs: 0x33475b, shoes: 0x2a2a2a },
  ];

  function person(look) {
    const J = {};
    const skin = SKIN[look.skin];
    const b = look.build;
    const root = new THREE.Group();
    root.scale.setScalar(look.height);

    const joint = (name, parent, x, y, z) => {
      const j = new THREE.Group();
      j.position.set(x, y, z);
      j.rotation.order = "ZXY";
      parent.add(j);
      J[name] = j;
      return j;
    };

    // Hips and belly: trousers (or a skirt) with a belt.
    const pelvis = joint("pelvis", root, 0, 0.96, 0);
    pelvis.add(part(new THREE.CylinderGeometry(0.15 * b, 0.165 * b, 0.17, 8), look.legs, 0, -0.02, 0));
    pelvis.children[0].scale.z = 0.68;
    const belt = part(new THREE.CylinderGeometry(0.153 * b, 0.153 * b, 0.035, 8), 0x2a2018, 0, 0.065, 0);
    belt.scale.z = 0.7;
    pelvis.add(belt);
    if (look.skirt) {
      const skirt = part(new THREE.CylinderGeometry(0.16 * b, 0.26 * b, 0.42, 9, 1, true), look.legs, 0, -0.2, 0.01);
      skirt.material = skirt.material.clone();
      skirt.material.side = THREE.DoubleSide;
      skirt.scale.z = 0.8;
      pelvis.add(skirt);
    }

    // Trunk: a narrow waist widening to a big chest and shoulders.
    const spine = joint("spine", pelvis, 0, 0.07, 0);
    spine.add(taper(0.16, 0.135 * b, 0.165 * b, look.top, 1, 8, 0.68));
    const chest = joint("chest", spine, 0, 0.15, 0);
    chest.add(taper(0.27, 0.17 * b, 0.235 * b, look.top, 1, 8, 0.62));
    const collar = part(new THREE.CylinderGeometry(0.11, 0.2 * b, 0.07, 8), look.top, 0, 0.3, 0);
    collar.scale.z = 0.62;
    chest.add(collar);

    const neck = joint("neck", chest, 0, 0.31, 0);
    neck.add(taper(0.08, 0.052, 0.048, skin, 1, 6));
    const head = joint("head", neck, 0, 0.07, 0);
    dressHead(head, look, skin);

    for (const [s, side] of [["l", 1], ["r", -1]]) {
      // Arms: a shoulder cap, upper arm, elbow, forearm, a chunky mitten hand.
      const shoulder = joint(`${s}Shoulder`, chest, side * 0.235 * b, 0.25, 0);
      shoulder.add(ball(0.062 * b, look.top, 1));
      const sleeveColor = look.top;
      const upper = taper(0.27, 0.068 * b, 0.055, look.sleeves === "short" ? skin : sleeveColor);
      shoulder.add(upper);
      if (look.sleeves === "short") shoulder.add(taper(0.13, 0.078 * b, 0.07 * b, sleeveColor));
      const elbow = joint(`${s}Elbow`, shoulder, 0, -0.27, 0);
      const forearmColor = look.sleeves === "long" ? sleeveColor : skin;
      elbow.add(ball(0.053, forearmColor, 0));
      elbow.add(taper(0.24, 0.056, 0.042, forearmColor));
      if (look.sleeves === "long") elbow.add(part(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 8), skin, 0, -0.245, 0));
      const wrist = joint(`${s}Wrist`, elbow, 0, -0.245, 0);
      wrist.add(part(new THREE.BoxGeometry(0.085, 0.1, 0.045), skin, 0, -0.055, 0));
      wrist.add(part(new THREE.BoxGeometry(0.03, 0.055, 0.03), skin, side * -0.045, -0.04, 0.012));

      // Legs: thigh, a real knee, shin, ankle, a big shoe.
      const hip = joint(`${s}Hip`, pelvis, side * 0.085 * b, -0.07, 0);
      hip.add(taper(0.42, 0.088 * b, 0.066, look.legs, -1, 8, 0.9));
      const knee = joint(`${s}Knee`, hip, 0, -0.42, 0);
      knee.add(ball(0.066, look.legs, 0));
      knee.add(taper(0.41, 0.064, 0.047, look.legs, -1, 8, 0.92));
      const ankle = joint(`${s}Ankle`, knee, 0, -0.41, 0);
      const shoe = part(new THREE.BoxGeometry(0.11, 0.08, 0.25), look.shoes, 0, -0.04, 0.055);
      ankle.add(shoe);
      ankle.add(part(new THREE.BoxGeometry(0.11, 0.035, 0.26), 0x111111, 0, -0.08, 0.055));
    }
    return { root, J };
  }

  function dressHead(head, look, skin) {
    const h = part(new THREE.SphereGeometry(0.118, 9, 7), skin, 0, 0.12, 0);
    h.scale.set(0.9, 1.08, 0.98);
    head.add(h);
    // Face: a nose, eyes, a mouth, ears.
    head.add(part(new THREE.BoxGeometry(0.03, 0.045, 0.04), skin, 0, 0.11, 0.11));
    for (const side of [1, -1]) {
      head.add(part(new THREE.BoxGeometry(0.028, 0.02, 0.01), 0x1a1412, side * 0.04, 0.142, 0.104));
      head.add(part(new THREE.BoxGeometry(0.025, 0.045, 0.035), skin, side * 0.108, 0.12, 0.012));
    }
    head.add(part(new THREE.BoxGeometry(0.045, 0.009, 0.01), 0x5a2e2a, 0, 0.068, 0.106));
    if (look.beard) {
      const beard = part(new THREE.SphereGeometry(0.11, 8, 4, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), look.beard, 0, 0.12, 0.012);
      beard.scale.set(0.95, 1.05, 1);
      head.add(beard);
    }

    const [style, color] = look.hair;
    if (style === "bald") return;
    // Hair: a cap over the crown that stops at the brow, longer at the back,
    // and a pair of eyebrows.
    const cap = part(new THREE.SphereGeometry(0.128, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), color, 0, 0.125, -0.004);
    cap.scale.set(0.93, 1.1, 1.02);
    const back = part(new THREE.SphereGeometry(0.128, 9, 6, Math.PI, Math.PI, 0, Math.PI * 0.62), color, 0, 0.125, -0.006);
    back.scale.set(0.93, 1.1, 1.02);
    head.add(cap, back);
    for (const side of [1, -1]) {
      head.add(part(new THREE.BoxGeometry(0.036, 0.011, 0.012), color, side * 0.04, 0.163, 0.106));
    }
    if (style === "long") {
      head.add(part(new THREE.BoxGeometry(0.22, 0.26, 0.07), color, 0, 0.02, -0.075));
    }
    if (style === "ponytail") {
      const tail = part(new THREE.CylinderGeometry(0.035, 0.02, 0.2, 6), color, 0, 0.08, -0.14);
      tail.rotation.x = 0.35;
      head.add(tail);
    }
    if (style === "beanie") {
      cap.scale.multiplyScalar(1.06);
      const brim = part(new THREE.TorusGeometry(0.113, 0.022, 4, 12), color, 0, 0.165, -0.004);
      brim.rotation.x = Math.PI / 2;
      const bobble = ball(0.035, 0xf0e6d2, 0);
      bobble.position.set(0, 0.27, -0.01);
      head.add(brim, bobble);
    }
  }

  // ---------- Poses ----------
  // [x, y, z] per joint in radians; anything left out stays at rest.
  // lHand / rHand place a wrist on a spot instead, and the arm works out its
  // own shoulder and elbow: `at` is in the space of joint `on`, `up` lifts it
  // straight up, and `pole` is the way the elbow points (body space; +x is the
  // character's left, +z their front).

  const POSES = [
    {
      name: "Leaning in",
      spine: [0.3, 0, 0], chest: [0.16, 0, 0], neck: [-0.14, 0, 0], head: [-0.16, 0, 0],
      // hands clasped behind the back
      lHand: { on: "pelvis", at: [-0.03, 0.1, -0.2], pole: [1, -0.4, -0.6] },
      rHand: { on: "pelvis", at: [0.03, 0.12, -0.23], pole: [-1, -0.4, -0.6] },
      lHip: [0.03, 0, 0.03], rHip: [-0.05, 0, -0.03], rKnee: [0.08, 0, 0],
    },
    {
      name: "On tiptoe, peeking",
      spine: [-0.04, 0, 0], neck: [-0.1, 0, 0], head: [-0.16, 0.12, 0],
      // right hand flat over the brow, shading the eyes
      rHand: { on: "head", at: [-0.15, 0.2, 0.13], pole: [-1, -0.3, 0] },
      rWrist: [0, -1.4, 0],
      lShoulder: [0.05, 0, 0.18], lElbow: [-0.35, 0, 0],
      lAnkle: [0.7, 0, 0], rAnkle: [0.7, 0, 0], lKnee: [0.04, 0, 0], rKnee: [0.04, 0, 0],
    },
    {
      name: "Pointing",
      spine: [0.1, 0.18, 0], chest: [0, 0.12, 0], head: [-0.06, 0.22, 0.05],
      rShoulder: [-1.62, 0, -0.06], rElbow: [-0.06, 0, 0], rWrist: [-0.25, 0, 0],
      lShoulder: [0.1, 0, 0.14], lElbow: [-0.35, 0, 0],
      rHip: [-0.2, 0, -0.04], rKnee: [0.24, 0, 0], lHip: [0.12, 0, 0.03],
    },
    {
      name: "Arms crossed",
      pelvis: [0, 0, 0.05], spine: [-0.05, 0, -0.04], head: [0.06, 0.25, 0.12],
      // forearms folded across the chest, right over left
      lHand: { on: "chest", at: [-0.05, 0.09, 0.22], pole: [0.3, -1, 0] },
      rHand: { on: "chest", at: [0.05, 0.13, 0.28], pole: [-0.3, -1, 0] },
      lHip: [0, 0, 0.12], rKnee: [0.18, 0, 0], rHip: [0.02, 0, -0.02],
    },
    {
      name: "Hand on chin",
      spine: [0.1, 0, 0], neck: [0.06, 0, 0], head: [0.1, -0.12, 0.04],
      // a fist under the chin; the other arm across, propping up that elbow
      rHand: { on: "head", at: [0, -0.07, 0.13], pole: [-0.3, -1, 0] },
      lHand: { on: "chest", at: [-0.06, 0.0, 0.22], pole: [0.4, -1, 0] },
      lHip: [0, 0, 0.03], lKnee: [0.1, 0, 0], rHip: [-0.05, 0, -0.03],
    },
    {
      name: "Crouching to look",
      spine: [0.55, 0, 0], chest: [0.15, 0, 0], neck: [-0.28, 0, 0], head: [-0.38, 0, 0],
      lHip: [-1.45, 0, 0.14], lKnee: [2.0, 0, 0], lAnkle: [-0.5, 0, 0],
      rHip: [-1.25, 0, -0.12], rKnee: [2.2, 0, 0], rAnkle: [-0.6, 0, 0],
      // hands resting on the knees
      lHand: { on: "lKnee", at: [0, 0, 0.03], up: 0.12, pole: [1, 0.3, 0] },
      rHand: { on: "rKnee", at: [0, 0, 0.03], up: 0.12, pole: [-1, 0.3, 0] },
    },
    {
      name: "Hands on hips",
      chest: [-0.05, 0, 0], head: [-0.05, -0.15, 0],
      lShoulder: [0.18, -1.57, 0.6], lElbow: [-1.55, 0, 0],
      rShoulder: [0.18, 1.57, -0.6], rElbow: [-1.55, 0, 0],
      lHip: [0, 0, 0.12], rHip: [0, 0, -0.12],
    },
    {
      name: "Taking a photo",
      spine: [0.04, 0, 0], neck: [0.1, 0, 0], head: [0.12, 0, 0],
      // a phone held sideways at arm's length, a hand on each end
      lHand: { on: "head", at: [0.15, 0.06, 0.4], pole: [1, -1, 0] },
      rHand: { on: "head", at: [-0.15, 0.06, 0.4], pole: [-1, -1, 0] },
      rHip: [-0.1, 0, -0.03], rKnee: [0.12, 0, 0],
      phone: true,
    },
  ];

  const IDLE = ["chest", "neck", "head"];
  const UPPER_ARM = 0.27;
  const FOREARM = 0.245;

  // Two-bone reach: point the upper arm and bend the elbow so the wrist lands
  // on the target, with the elbow swung toward the pole.
  function reach(fig, s, { on, at, up = 0, pole }) {
    const { J, root } = fig;
    const shoulder = J[`${s}Shoulder`];
    const chest = J.chest;
    root.updateMatrixWorld(true);
    const target = J[on].localToWorld(new THREE.Vector3(...at));
    target.y += up * root.scale.y;
    chest.worldToLocal(target);
    const toChest = chest.getWorldQuaternion(new THREE.Quaternion()).invert();
    const bend = new THREE.Vector3(...pole).applyQuaternion(root.quaternion).applyQuaternion(toChest);

    const S = shoulder.position;
    const dir = target.clone().sub(S);
    const dist = Math.min(dir.length(), (UPPER_ARM + FOREARM) * 0.999);
    dir.normalize();
    const side = bend.addScaledVector(dir, -bend.dot(dir)).normalize();
    const cosA = (UPPER_ARM ** 2 + dist ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * dist);
    const a = Math.acos(THREE.MathUtils.clamp(cosA, -1, 1));
    const elbow = S.clone().addScaledVector(dir, UPPER_ARM * Math.cos(a)).addScaledVector(side, UPPER_ARM * Math.sin(a));
    const wrist = S.clone().addScaledVector(dir, dist);

    // The bone runs down its -y; the elbow folds the forearm toward its +z.
    const y = S.clone().sub(elbow).normalize();
    const z = wrist.sub(elbow);
    z.addScaledVector(y, -z.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    shoulder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    shoulder.userData.base = [shoulder.rotation.x, shoulder.rotation.y, shoulder.rotation.z];

    const cosB = (UPPER_ARM ** 2 + FOREARM ** 2 - dist ** 2) / (2 * UPPER_ARM * FOREARM);
    const elbowBend = Math.PI - Math.acos(THREE.MathUtils.clamp(cosB, -1, 1));
    J[`${s}Elbow`].rotation.set(-elbowBend, 0, 0);
  }

  function pose(fig, p) {
    for (const [name, j] of Object.entries(fig.J)) {
      const a = p[name] || [0, 0, 0];
      j.rotation.set(a[0], a[1], a[2], "ZXY");
      j.userData.base = a;
    }
    if (p.lHand) reach(fig, "l", p.lHand);
    if (p.rHand) reach(fig, "r", p.rHand);
    if (p.phone) {
      // Landscape, screen toward the face.
      const phone = part(new THREE.BoxGeometry(0.15, 0.08, 0.014), 0x8a8f9c, 0, 0.08, 0.42);
      phone.add(part(new THREE.BoxGeometry(0.13, 0.065, 0.002), 0x7fb4ff, 0, 0, -0.007));
      phone.userData.keep = true;
      fig.J.head.add(phone);
    }
    if (p.book) {
      const book = part(new THREE.BoxGeometry(0.2, 0.025, 0.15), p.book, 0, -0.02, 0.34);
      book.rotation.x = 0.9;
      book.add(part(new THREE.BoxGeometry(0.19, 0.027, 0.14), 0xe8e2d0, 0, 0.002, 0.004));
      book.userData.keep = true;
      fig.J.chest.add(book);
    }
    // Stand it on the floor: whatever part is lowest touches y = 0.
    const base = fig.root.position.y;
    fig.root.position.y = 0;
    fig.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fig.root);
    fig.root.position.y = -box.min.y;
    // Or sit it on something `seat` metres up.
    if (p.seat !== undefined) {
      fig.root.updateMatrixWorld(true);
      const hip = new THREE.Vector3();
      fig.J.pelvis.getWorldPosition(hip);
      fig.root.position.y += p.seat - (hip.y - 0.1 * fig.root.scale.y);
    }
    fig.root.position.y += base;
  }

  // Merge each joint's pieces into one mesh coloured per vertex: about a
  // fifth of the draw calls, which matters with a crowd on a phone.
  function bake(fig) {
    if (!MATS.has("baked")) MATS.set("baked", new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
    const shared = MATS.get("baked");
    for (const j of Object.values(fig.J)) {
      const parts = j.children.filter((c) => c.isMesh && !c.userData.keep && c.children.length === 0 && c.material.side !== THREE.DoubleSide);
      if (parts.length < 2) continue;
      const geos = parts.map((m) => {
        m.updateMatrix();
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        g.applyMatrix4(m.matrix);
        for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
        const c = m.material.color;
        const col = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
        g.setAttribute("color", new THREE.BufferAttribute(col, 3));
        return g;
      });
      const merged = new THREE.Mesh(mergeGeometries(geos), shared);
      merged.castShadow = true;
      for (const m of parts) { j.remove(m); m.geometry.dispose(); }
      j.add(merged);
    }
    return fig;
  }

  // Sitting, sleeping, reading, holding on: poses for the newer rooms.
  const SEATED = { lHip: [-1.5, 0, 0.07], rHip: [-1.5, 0, -0.07], lKnee: [1.5, 0, 0], rKnee: [1.5, 0, 0] };
  POSES.push(
    {
      name: "Asleep", ...SEATED, seat: 0.46,
      spine: [0.12, 0, 0.22], chest: [0.05, 0, 0.1], neck: [0.25, 0, 0.3], head: [0.3, 0, 0.35],
      lHand: { on: "pelvis", at: [0.1, 0.06, 0.25], pole: [1, -1, 0] },
      rHand: { on: "pelvis", at: [-0.04, 0.07, 0.27], pole: [-1, -1, 0] },
    },
    {
      name: "Reading", ...SEATED, seat: 0.46, book: 0x7a2f2a,
      spine: [0.12, 0, 0], neck: [0.25, 0, 0], head: [0.35, 0, 0],
      lHand: { on: "chest", at: [0.1, -0.06, 0.3], pole: [1, -1, 0] },
      rHand: { on: "chest", at: [-0.1, -0.06, 0.3], pole: [-1, -1, 0] },
    },
    {
      name: "Holding a strap",
      head: [0.08, 0.2, 0], lHip: [0, 0, 0.1], rHip: [0, 0, -0.1],
      rHand: { on: "chest", at: [-0.1, 0.78, 0.05], pole: [-1, 0, -0.4] },
      lShoulder: [0.05, 0, 0.12], lElbow: [-0.3, 0, 0],
    },
    {
      name: "Looking up",
      neck: [-0.3, 0, 0], head: [-0.35, 0.1, 0],
      lHand: { on: "pelvis", at: [-0.03, 0.1, -0.2], pole: [1, -0.4, -0.6] },
      rHand: { on: "pelvis", at: [0.03, 0.12, -0.23], pole: [-1, -0.4, -0.6] },
    },
    {
      name: "On the hood",
      lHip: [-1.35, 0, 0.12], rHip: [-1.35, 0, -0.12], lKnee: [1.05, 0, 0], rKnee: [1.2, 0, 0],
      spine: [-0.18, 0, 0], neck: [0.05, 0, 0], head: [-0.05, 0.1, 0],
      lHand: { on: "pelvis", at: [0.24, 0.02, -0.28], pole: [1, 0.4, 0] },
      rHand: { on: "pelvis", at: [-0.24, 0.02, -0.28], pole: [-1, 0.4, 0] },
    },
    {
      name: "In the grass", seat: 0.02,
      lHip: [-1.45, 0, 0.14], rHip: [-1.45, 0, -0.14], lKnee: [1.9, 0, 0], rKnee: [1.9, 0, 0],
      spine: [-0.1, 0, 0], head: [-0.1, 0, 0],
      lHand: { on: "pelvis", at: [0.22, -0.02, -0.32], pole: [1, 0.4, 0] },
      rHand: { on: "pelvis", at: [-0.22, -0.02, -0.32], pole: [-1, 0.4, 0] },
    },
  );

