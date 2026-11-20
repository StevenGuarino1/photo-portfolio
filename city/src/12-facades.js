// ---------- Facades: one of a kind ----------
// Instead of a handful of wall textures shared by every building, a few
// hundred different ones are drawn into one big atlas, each with its own
// colours, windows, frames, shutters, balconies or glazing. Every building
// takes its own tile, and a small change to the wall material repeats just
// that tile across the wall. One material for all of them, so the walls of
// a whole town still draw in one go.
const ATLAS = 2048;
const TW = 128; // one tile: a 4 m bay, one storey (3.5 m) tall
const TH = 112;
const atlasCanvas = document.createElement("canvas");
atlasCanvas.width = atlasCanvas.height = ATLAS;
const ag = atlasCanvas.getContext("2d");
const tilePool = { glass: [], concrete: [], brick: [], stucco: [], house: [], shop: [] };
{
  const R = rng(777);
  const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
  const speck = (x0, y0, w, h, n, alpha) => {
    for (let k = 0; k < n; k++) {
      ag.fillStyle = R() < 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ag.fillRect(x0 + R() * w, y0 + R() * h, 2, 2);
    }
  };
  const glassFill = (x, y, w, h, hue, light) => {
    const grad = ag.createLinearGradient(x, y, x + w * 0.6, y + h);
    grad.addColorStop(0, hsl(hue, 30, light + 22));
    grad.addColorStop(0.5, hsl(hue, 35, light));
    grad.addColorStop(1, hsl(hue, 40, light - 10));
    ag.fillStyle = grad;
    ag.fillRect(x, y, w, h);
  };
  const order = [["glass", 44], ["concrete", 36], ["brick", 36], ["stucco", 56], ["house", 64], ["shop", 48]];
  let n = 0;
  for (const [style, count] of order) for (let k = 0; k < count; k++) {
    const X = (n % (ATLAS / TW)) * TW;
    const Y = Math.floor(n / (ATLAS / TW)) * TH;
    n++;
    ag.save();
    ag.beginPath();
    ag.rect(X, Y, TW, TH);
    ag.clip();
    const wallHue = style === "brick" ? 5 + R() * 25 : style === "concrete" ? 30 + R() * 30 : R() * 360;
    const wallSat = style === "brick" ? 35 + R() * 25 : style === "concrete" ? 5 + R() * 12 : style === "stucco" ? 25 + R() * 40 : 10 + R() * 35;
    const wallLight = style === "brick" ? 32 + R() * 18 : style === "concrete" ? 62 + R() * 22 : 72 + R() * 18;
    ag.fillStyle = hsl(wallHue, wallSat, wallLight);
    ag.fillRect(X, Y, TW, TH);
    const glassHue = [200, 205, 190, 170, 215, 30, 160][Math.floor(R() * 7)];
    if (style === "glass") {
      glassFill(X, Y, TW, TH, glassHue, 38 + R() * 20);
      // Reflections, mullions, maybe a solid band between floors.
      ag.fillStyle = "rgba(255,255,255,0.16)";
      const o = R() * 80;
      ag.beginPath(); ag.moveTo(X + o, Y); ag.lineTo(X + o + 30, Y); ag.lineTo(X + o - 10, Y + TH); ag.lineTo(X + o - 40, Y + TH); ag.fill();
      const frame = R() < 0.5 ? hsl(210, 10, 20 + R() * 15) : hsl(40, 10, 70 + R() * 20);
      ag.fillStyle = frame;
      const cols = 1 + Math.floor(R() * 4);
      for (let c = 0; c <= cols; c++) ag.fillRect(X + (c * TW) / cols - 2, Y, 4, TH);
      const band = R() < 0.55 ? 10 + R() * 26 : 4;
      ag.fillRect(X, Y + TH - band, TW, band);
      if (R() < 0.3) ag.fillRect(X, Y + TH * 0.45, TW, 3);
    } else if (style === "shop") {
      const sign = hsl(R() * 360, 50 + R() * 40, 30 + R() * 30);
      ag.fillStyle = hsl(wallHue, 10, 80);
      ag.fillRect(X, Y, TW, TH);
      glassFill(X + 8, Y + 34, TW - 16, TH - 36, glassHue, 50);
      ag.fillStyle = sign;
      ag.fillRect(X, Y + 4, TW, 24);
      // Lettering, roughly.
      ag.fillStyle = R() < 0.5 ? "#ffffff" : "#1a1a1a";
      let lx = X + 14 + R() * 10;
      while (lx < X + TW - 20) { const w = 4 + R() * 6; ag.fillRect(lx, Y + 10, w, 11); lx += w + 3 + (R() < 0.2 ? 8 : 0); }
      ag.fillStyle = hsl(wallHue, 10, 25);
      ag.fillRect(X + 8, Y + 32, TW - 16, 4);
      ag.fillRect(X + 60, Y + 34, 4, TH - 34);
      if (R() < 0.5) { ag.fillStyle = "rgba(0,0,0,0.25)"; ag.fillRect(X + 70, Y + 50, 40, 60); }
    } else {
      speck(X, Y, TW, TH, 220, 0.06);
      if (style === "brick") {
        ag.fillStyle = `rgba(40,20,15,0.22)`;
        for (let y = 0; y < TH; y += 6) ag.fillRect(X, Y + y, TW, 1);
        for (let y = 0; y < TH; y += 6) for (let x = (y / 6) % 2 ? 0 : 8; x < TW; x += 16) ag.fillRect(X + x, Y + y, 1, 6);
      }
      if (style === "house" && R() < 0.6) {
        ag.fillStyle = "rgba(0,0,0,0.08)";
        for (let y = 0; y < TH; y += 7) ag.fillRect(X, Y + y, TW, 1);
      }
      if (style === "concrete" && R() < 0.5) {
        ag.fillStyle = "rgba(0,0,0,0.1)";
        ag.fillRect(X, Y + TH - 22, TW, 22);
      }
      const count = style === "concrete" && R() < 0.4 ? 1 : R() < 0.4 ? 2 : 1;
      const wide = style === "concrete" && count === 1 && R() < 0.5;
      const ww = wide ? TW - 16 : (TW / count) * (0.38 + R() * 0.25);
      const wh = TH * (0.42 + R() * 0.22);
      const wy = Y + TH * 0.16 + R() * 8;
      const frame = R() < 0.6 ? "#f4f1ea" : hsl(R() * 360, 20 + R() * 30, 20 + R() * 40);
      const arched = (style === "brick" || style === "stucco") && R() < 0.25;
      const shutters = (style === "stucco" || style === "house") && R() < 0.45;
      const shutter = hsl(R() * 360, 30 + R() * 30, 30 + R() * 25);
      const balcony = (style === "stucco" || style === "concrete") && R() < 0.25;
      const mull = Math.floor(R() * 3);
      for (let k2 = 0; k2 < count; k2++) {
        const cx = X + (TW / count) * (k2 + 0.5);
        const wx = cx - ww / 2;
        ag.fillStyle = frame;
        ag.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
        if (arched) { ag.beginPath(); ag.arc(cx, wy, ww / 2 + 4, Math.PI, 0); ag.fill(); }
        glassFill(wx, wy, ww, wh, glassHue, 34 + R() * 14);
        if (arched) {
          const grad = ag.createLinearGradient(wx, wy - ww / 2, wx, wy);
          grad.addColorStop(0, hsl(glassHue, 30, 60));
          grad.addColorStop(1, hsl(glassHue, 35, 45));
          ag.fillStyle = grad;
          ag.beginPath(); ag.arc(cx, wy, ww / 2, Math.PI, 0); ag.fill();
        }
        ag.fillStyle = frame;
        if (mull >= 1) ag.fillRect(cx - 1.5, wy, 3, wh);
        if (mull >= 2) ag.fillRect(wx, wy + wh * 0.4, ww, 3);
        ag.fillStyle = "rgba(255,255,255,0.3)";
        ag.fillRect(wx + 3, wy + 3, ww * 0.3, 3);
        if (shutters) {
          ag.fillStyle = shutter;
          ag.fillRect(wx - 4 - ww * 0.42, wy - 2, ww * 0.38, wh + 4);
          ag.fillRect(wx + ww + 4 + ww * 0.04, wy - 2, ww * 0.38, wh + 4);
          ag.fillStyle = "rgba(0,0,0,0.18)";
          for (let y = wy; y < wy + wh; y += 5) { ag.fillRect(wx - 4 - ww * 0.42, y, ww * 0.38, 1); ag.fillRect(wx + ww + 4 + ww * 0.04, y, ww * 0.38, 1); }
        }
        ag.fillStyle = "rgba(0,0,0,0.25)";
        ag.fillRect(wx - 6, wy + wh + 4, ww + 12, 4);
        if (balcony) {
          ag.fillStyle = hsl(0, 0, 25);
          ag.fillRect(wx - 10, wy + wh - 18, ww + 20, 2);
          for (let x = wx - 10; x <= wx + ww + 10; x += 5) ag.fillRect(x, wy + wh - 18, 1.5, 22);
          ag.fillRect(wx - 12, wy + wh + 4, ww + 24, 5);
        }
      }
      if (R() < 0.3) { ag.fillStyle = "rgba(0,0,0,0.12)"; ag.fillRect(X, Y + TH - 6, TW, 6); }
      if (R() < 0.15) { ag.fillStyle = "rgba(255,255,255,0.25)"; ag.fillRect(X, Y, 6, TH); }
    }
    ag.restore();
    const pad = 2;
    tilePool[style].push([(X + pad) / ATLAS, 1 - (Y + TH - pad) / ATLAS, (TW - 2 * pad) / ATLAS, (TH - 2 * pad) / ATLAS]);
  }
}
const atlasTex = new THREE.CanvasTexture(atlasCanvas);
atlasTex.colorSpace = THREE.SRGBColorSpace;
atlasTex.anisotropy = Math.min(8, maxAniso);
// The wall material: repeat one tile of the atlas across each wall.
const wallMat = new THREE.MeshLambertMaterial({ map: atlasTex });
wallMat.userData.atlas = true;
wallMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 tile;\nvarying vec4 vTile;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvTile = tile;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec4 vTile;").replace(
    "#include <map_fragment>",
    `vec2 tuv = vTile.xy + fract(vMapUv) * vTile.zw;
    vec4 sampledDiffuseColor = textureGrad(map, tuv, dFdx(vMapUv) * vTile.zw, dFdy(vMapUv) * vTile.zw);
    diffuseColor *= sampledDiffuseColor;`,
  );
};
// Each style's tiles dealt out in a shuffled order, so neighbours differ.
const tileDeal = {};
function nextTile(style, R) {
  const pool = tilePool[style];
  if (!tileDeal[style] || !tileDeal[style].length) {
    tileDeal[style] = pool.map((_, i) => i).sort(() => R() - 0.5);
  }
  return pool[tileDeal[style].pop()];
}
// A wall plane carrying its tile.
function tiledPlane(w, h, tw, th, u0, v0, tile) {
  const g = plane(w, h, tw, th, u0, v0);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) a.set(tile, i * 4);
  g.setAttribute("tile", new THREE.BufferAttribute(a, 4));
  return g;
}
cloudShadows(wallMat);
for (const k of ["asphalt", "sidewalk", "grass", "plaza", "roof", "hedge", "path"]) cloudShadows(M[k]);
