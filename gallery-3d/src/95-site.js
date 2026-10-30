  // ---------- The site's window ----------
  // When the flat portfolio site opens the gallery (it loads this page in
  // a frame with ?from=site after you hold S), the site becomes a window on
  // the lobby's entrance wall. The camera starts pressed right up against
  // it, so the window fills the screen exactly as the site did; then it
  // eases back into the hall and you can walk about. Walk back up to the
  // window and press E (or the "Back to the site" button) and the camera
  // glides in until the window fills the screen again, and the site takes
  // over.
  //
  // The site sends a snapshot of what was on screen: where each visible
  // photo was and its image URL, and each bit of header text with its font
  // and colour. The window's picture is drawn from that.

  // Opened from the site: marked in the address (some hosts drop the
  // query, so the hash too), or the page around us is the site itself.
  const EMBED = /from=site/.test(location.search + location.hash) || (() => {
    try { return parent !== window && !!parent.__gallery; } catch { return false; }
  })();
  const SITE = (() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 800;
    const g = canvas.getContext("2d");
    g.fillStyle = "#121212";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "#e8e8e8";
    g.font = "500 48px Poppins, system-ui, sans-serif";
    g.fillText("Steven Guarino", 80, 110);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    let plane = null;
    let bars = null;
    let Z0 = -1;
    let W = 2.6;
    let H = 1.625;
    let CY = 1.7;

    // The window: a dark frame on the wall and the picture of the site in
    // it, drawn as it is (unlit, untouched by fog or tone mapping).
    function attach(R, z0) {
      Z0 = z0;
      plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }));
      plane.userData.keep = true; // resized as the screen changes shape
      R.add(plane);
      bars = [0, 1, 2, 3].map(() => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 }));
        b.userData.keep = true;
        R.add(b);
        return b;
      });
      layout(innerWidth / innerHeight);
    }
    function layout(aspect) {
      W = Math.min(2.6, 3.1 * aspect);
      H = W / aspect;
      CY = Math.max(1.7, H / 2 + 0.35);
      if (!plane) return;
      plane.scale.set(W, H, 1);
      plane.position.set(0, CY, Z0 + 0.06);
      const t = 0.09;
      const set = (b, w, h, x, y) => { b.scale.set(w, h, 0.12); b.position.set(x, y, Z0 + 0.05); };
      set(bars[0], W + 2 * t, t, 0, CY + H / 2 + t / 2);
      set(bars[1], W + 2 * t, t, 0, CY - H / 2 - t / 2);
      set(bars[2], t, H, -W / 2 - t / 2, CY);
      set(bars[3], t, H, W / 2 + t / 2, CY);
    }
    const load = (src) => new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
    async function paint(snap) {
      // Sharp enough to fill a Retina screen when the camera is right up
      // against it.
      const most = Math.min(renderer.capabilities.maxTextureSize, 4096);
      const k = Math.min(most / snap.w, most / snap.h, Math.min(snap.dpr || 1, 2));
      // The page's own fonts, loaded before any text is drawn with them.
      const fonts = [...new Set(snap.texts.map((t) => t.font))];
      const [imgs] = await Promise.all([
        Promise.race([
          Promise.all(snap.items.map((it) => load(it.src))),
          new Promise((r) => setTimeout(() => r(null), 2500)),
        ]),
        Promise.race([
          Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => {}))),
          new Promise((r) => setTimeout(r, 1500)),
        ]),
      ]);
      canvas.width = Math.round(snap.w * k);
      canvas.height = Math.round(snap.h * k);
      // A new size needs a new texture on the GPU.
      tex.dispose();
      g.setTransform(k, 0, 0, k, 0, 0);
      g.imageSmoothingQuality = "high";
      g.globalAlpha = 1;
      g.fillStyle = snap.bg;
      g.fillRect(0, 0, snap.w, snap.h);
      snap.items.forEach((it, i) => {
        g.globalAlpha = it.card ?? 1;
        g.fillStyle = "#1c1c1c";
        g.fillRect(it.x, it.y, it.w, it.h);
        const im = imgs?.[i];
        if (!im) return;
        g.globalAlpha = it.alpha ?? 1;
        // Cropped to fill, as the page does.
        const s = Math.max(it.w / im.width, it.h / im.height);
        const sw = it.w / s;
        const sh = it.h / s;
        g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, it.x, it.y, it.w, it.h);
      });
      // Borders: the active category's underline, the S key's outline.
      for (const b of snap.boxes ?? []) {
        g.globalAlpha = b.alpha;
        const [top, right, bottom, left] = b.sides;
        if (b.radius && top && right && bottom && left) {
          g.strokeStyle = top.c;
          g.lineWidth = top.w;
          g.beginPath();
          g.roundRect?.(b.x + top.w / 2, b.y + top.w / 2, b.w - top.w, b.h - top.w, b.radius);
          g.stroke();
          continue;
        }
        const side = (s, x, y, w, h) => { if (s) { g.fillStyle = s.c; g.fillRect(x, y, w, h); } };
        side(top, b.x, b.y, b.w, top?.w);
        side(bottom, b.x, b.y + b.h - (bottom?.w ?? 0), b.w, bottom?.w);
        side(left, b.x, b.y, left?.w, b.h);
        side(right, b.x + b.w - (right?.w ?? 0), b.y, right?.w, b.h);
      }
      for (const tx of snap.texts) {
        g.globalAlpha = tx.alpha ?? 1;
        g.font = tx.font;
        if ("letterSpacing" in g) g.letterSpacing = tx.ls && tx.ls !== "normal" ? tx.ls : "0px";
        g.fillStyle = tx.color;
        g.textBaseline = "alphabetic";
        // The baseline sits where the font's own ascent puts it in the box
        // the page measured, so the words land on the same pixels.
        const m = g.measureText(tx.text);
        const asc = m.fontBoundingBoxAscent;
        const desc = m.fontBoundingBoxDescent;
        const base = tx.h && asc + desc > 0 ? tx.top + (tx.h * asc) / (asc + desc) : tx.base;
        g.fillText(tx.text, tx.x, base);
        if (tx.under) g.fillRect(tx.x, base + tx.under.offset, tx.w, tx.under.thick);
      }
      g.globalAlpha = 1;
      if ("letterSpacing" in g) g.letterSpacing = "0px";
      tex.needsUpdate = true;
      layout(snap.w / snap.h);
    }
    // Where the camera has to be for the window to fill the screen.
    function fillPose() {
      const d = H / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      return { x: 0, z: Z0 + 0.06 + d, y: CY - EYE, yaw: 0, pitch: 0 };
    }
    return { attach, paint, fillPose, get Z0() { return Z0; } };
  })();

  if (EMBED) {
    const post = (msg) => parent.postMessage(msg, "*");
    const back = document.createElement("button");
    back.textContent = "← Back to the site";
    back.style.cssText = "position:fixed;left:64px;top:16px;z-index:30;padding:9px 14px;border-radius:999px;border:0;background:rgba(20,18,16,.72);color:#eee;font:500 13px Poppins,system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(6px)";
    back.hidden = true;
    document.body.appendChild(back);
    const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    let anim = null;
    function tween(to, ms) {
      const from = { x: me.x, z: me.z, y: me.y, yaw: me.yaw, pitch: me.pitch };
      const dyaw = Math.atan2(Math.sin(to.yaw - from.yaw), Math.cos(to.yaw - from.yaw));
      return new Promise((done) => {
        const t0 = performance.now();
        anim = (now) => {
          const u = Math.min(1, (now - t0) / ms);
          const e = ease(u);
          me.x = from.x + (to.x - from.x) * e;
          me.z = from.z + (to.z - from.z) * e;
          me.y = from.y + (to.y - from.y) * e;
          me.yaw = from.yaw + dyaw * e;
          me.pitch = from.pitch + (to.pitch - from.pitch) * e;
          me.stride = 0;
          if (u >= 1) { anim = null; done(); }
        };
      });
    }
    (function tick(now) {
      anim?.(now);
      requestAnimationFrame(tick);
    })(performance.now());
    let state = "out"; // out, shown, walking, leaving
    function placeAtFill() {
      if (here !== regions.lobby) enter(regions.lobby, { quiet: true });
      const p = SITE.fillPose();
      Object.assign(me, { x: p.x, z: p.z, y: p.y, yaw: p.yaw, pitch: p.pitch, stride: 0 });
    }
    async function stepBack() {
      state = "moving";
      // Back to the resolution the device can keep up with (see enter).
      renderer.setPixelRatio(pixelRatio());
      hush(2400);
      await tween({ x: 0, z: SITE.Z0 + 5.2, y: 0, yaw: 0, pitch: -0.02 }, 1900);
      roomsOnHold = false;
      state = "walking";
      running = true;
      hudTop.hidden = false;
      back.hidden = false;
      if (TOUCH) stick.hidden = false;
      else {
        hint.hidden = false;
        hint.textContent = "W A S D to walk · drag to look · turn round for the rooms · walk up to the window and press E to go back";
      }
    }
    async function goBack() {
      if (state !== "walking") return;
      state = "moving";
      release();
      running = false;
      hint.hidden = true;
      back.hidden = true;
      stick.hidden = true;
      if (here !== regions.lobby) {
        await goTo("lobby");
        await new Promise((r) => setTimeout(r, 400));
      }
      await tween(SITE.fillPose(), 1300);
      state = "out";
      post({ type: "gallery:return" });
    }
    back.addEventListener("click", goBack);
    addEventListener("keydown", (e) => {
      if (!audio) startAudio();
      if (e.code === "KeyE" && state === "walking" && here === regions.lobby) {
        // Near the window and looking at it.
        const dx = 0 - me.x;
        const dz = SITE.Z0 - me.z;
        const d = Math.hypot(dx, dz);
        const facing = (-Math.sin(me.yaw) * dx - Math.cos(me.yaw) * dz) / d;
        if (d < 7 && facing > 0.6) goBack();
      }
    });
    addEventListener("pointerdown", () => { if (!audio) startAudio(); });
    addEventListener("message", async (e) => {
      const m = e.data || {};
      if (m.type === "gallery:enter") {
        await SITE.paint(m.snap);
        // The moment of handing over is a still picture of the page, so draw
        // it at the screen's full sharpness, whatever the frame rate needs
        // once things start moving.
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        hush(4000);
        // Rooms wait till the camera has pulled back: they're behind you
        // then, and building one mid-glide would make it stutter.
        roomsOnHold = true;
        placeAtFill();
        renderer.setAnimationLoop(frame);
        audio?.ctx.resume();
        state = "shown";
        // Two frames so the window is drawn before the site steps aside.
        requestAnimationFrame(() => requestAnimationFrame(() => post({ type: "gallery:shown" })));
      } else if (m.type === "gallery:go" && state === "shown") {
        stepBack();
      } else if (m.type === "gallery:pause") {
        renderer.setAnimationLoop(null);
        audio?.ctx.suspend();
      }
    });
  }
