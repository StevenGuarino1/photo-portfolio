"""Walk every room twice and report, per room: frame rate, GPU and CPU time
per frame, draw calls, and what is held in GPU memory. The second lap shows
leaks: after taking rooms down and building them again the counts should
come back to where they were.

  python tour_test.py [url] [--dpr 2] [--shots DIR] [--laps 2]
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Page

args = sys.argv[1:]
opt = lambda name, default: args[args.index(name) + 1] if name in args else default
URL = next((a for a in args if a.startswith("http")), os.environ.get("GALLERY_URL", "http://localhost:8000/crowd-lab/v2/"))
DPR = float(opt("--dpr", "1"))
SHOTS = opt("--shots", "")
LAPS = int(opt("--laps", "2"))
ROOMS = opt("--rooms", "lobby,gallery,gathering,lighthouse,overlook,nature,subway,pool,apartments,moor,drivein,range").split(",")

# Replaces the page's animation loop with one that times each frame on the
# CPU and, where the browser allows it, on the GPU.
TIMER = """
window.__timer = (() => {
  const gl = __app.renderer.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const pending = [], gpu = [], cpu = [];
  __app.renderer.setAnimationLoop(() => {
    if (ext) {
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
        const q = pending.shift();
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(q);
      }
    }
    let q = null;
    if (ext) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
    const t0 = performance.now();
    __app.frame();
    cpu.push(performance.now() - t0);
    if (ext) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q); }
  });
  const stat = (d) => { d = d.splice(0).sort((a, b) => a - b); return d.length ? { med: +d[d.length >> 1].toFixed(2), p90: +d[Math.floor(d.length * 0.9)].toFixed(2) } : null; };
  return { gpu: !!ext, take: () => ({ gpu: stat(gpu), cpu: stat(cpu) }) };
})();
window.__timer.gpu
"""

page = Page(1400, 800)
page.call("Emulation.setDeviceMetricsOverride", width=1400, height=800, deviceScaleFactor=DPR, mobile=False)
page.goto(URL, wait=5)
page.eval("document.getElementById('enter').click()")
time.sleep(1.5)
print("tier", page.eval("window.__app.tier"), "dpr", page.eval("window.__app.renderer.getPixelRatio()"), "gpu timer", page.eval(TIMER), flush=True)
if SHOTS:
    os.makedirs(SHOTS, exist_ok=True)
rows = []
for lap in range(LAPS):
    for room in ROOMS:
        page.eval(f"window.__app.goTo('{room}')")
        time.sleep(3)
        page.eval("window.__timer.take()")
        fps = page.eval("window.__fps(2)")
        t = page.eval("window.__timer.take()")
        info = page.eval("""(() => { const r = window.__app.renderer.info; return {
          calls: r.render.calls, tris: r.render.triangles, geos: r.memory.geometries, texs: r.memory.textures,
          progs: r.programs.length, heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576),
          loaded: Object.values(window.__app.regions).filter((g) => g.loaded).map((g) => g.id).join(' ') }; })()""")
        row = {"lap": lap + 1, "room": room, **fps, "gpu": t["gpu"], "cpu": t["cpu"], **info}
        rows.append(row)
        print(json.dumps(row), flush=True)
        if SHOTS and lap == 0:
            page.shot(os.path.join(SHOTS, f"{room}.png"))
errs = page.eval("window.__errors") + page.console_errors()
print("errors", errs[:20])
page.close()
