"""Pick up the launcher in the Range, put three missiles into the tall
tower, and photograph the blast, the collapse and the dust afterwards.

  python range_test.py [url] [--shots DIR]
"""
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Page

args = sys.argv[1:]
URL = next((a for a in args if a.startswith("http")), os.environ.get("GALLERY_URL", "http://localhost:8000/crowd-lab/v2/"))
SHOTS = args[args.index("--shots") + 1] if "--shots" in args else os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(SHOTS, exist_ok=True)

page = Page(1400, 800)
page.goto(URL, wait=5)
page.eval("document.getElementById('enter').click()")
time.sleep(1)
page.eval("window.__app.goTo('range', 'line')")
time.sleep(2.5)
# Aim at the foot of the tall tower (x 10, z ~237 in the room's own frame).
x, z, eye = 1.2, 6.6, 1.62
tx, ty, tz = 10.0, 9.0, 236.0
yaw = math.atan2(-(tx - x), -(tz - z))
pitch = math.atan2(ty - eye, math.hypot(tx - x, tz - z))
page.eval(f"(() => {{ const r = window.__app.regions.range; Object.assign(window.__app.me, {{ yaw: {yaw} + r.rot, pitch: {pitch} }}); }})()")
time.sleep(0.5)
print("armed toast:", page.eval("document.querySelector('#toast b').textContent"), flush=True)
t0 = time.time()
for shot in range(3):
    page.eval("window.__app.here.api.onFire()")
    time.sleep(1.0)
plan = [(2.0, "1-blast"), (4.5, "2-falling"), (7.0, "3-collapse"), (13.0, "4-dust"), (22.0, "5-after")]
for at, name in plan:
    while time.time() - t0 < at:
        time.sleep(0.05)
    page.shot(os.path.join(SHOTS, f"range-{name}.png"))
    info = page.eval("(() => { const r = window.__app.renderer.info.render; return { calls: r.calls, tris: r.triangles }; })()")
    print(name, info, page.eval("window.__fps(0.5)"), flush=True)
print("errors:", page.eval("window.__errors"), page.console_errors()[:6])
page.close()
