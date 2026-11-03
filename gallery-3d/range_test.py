"""Pick up the launcher in the Range, put three missiles into the tall
tower, and photograph the blast, the collapse and the dust afterwards; then
check the photo hidden in it came out: aim at it through the sight, see its
card, open it full screen, and rebuild the town for a fresh set.

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


def look_at(tx, ty, tz):
    yaw = math.atan2(-(tx - x), -(tz - z))
    pitch = math.atan2(ty - eye, math.hypot(tx - x, tz - z))
    page.eval(f"(() => {{ const r = window.__app.regions.range; Object.assign(window.__app.me, {{ yaw: {yaw} + r.rot, pitch: {pitch} }}); }})()")


look_at(10.0, 9.0, 236.0)
time.sleep(0.5)
print("armed toast:", page.eval("document.querySelector('#toast b').textContent"), flush=True)
hidden = "window.__app.here.photos.filter((p) => p.reach)"
print("photos hidden in the town:", page.eval(f"{hidden}.length"), "out:", page.eval(f"{hidden}.filter((p) => !p.hidden).length"))
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
out = page.eval(f"{hidden}.filter((p) => !p.hidden).map((p) => p.photo.title)")
print("photos out:", out)
# Look through the sight at the one that came out, and open it.
pos = page.eval(f"(() => {{ const p = {hidden}.find((q) => !q.hidden); if (!p) return null; const v = p.mesh.getWorldPosition(new p.mesh.position.constructor()); const r = window.__app.regions.range; const l = r.toLocal(v.x, v.z); return {{ x: l.x, y: v.y, z: l.z }}; }})()")
if pos:
    look_at(pos["x"], pos["y"], pos["z"])
    page.eval("window.__app.here.api.onAim(true)")
    time.sleep(1.2)
    page.shot(os.path.join(SHOTS, "range-6-aim.png"))
    print("zoom:", page.eval("window.__app.camera.fov.toFixed(1)"), "card:", page.eval("document.getElementById('photoCard').hidden ? null : document.querySelector('#photoCard h2').textContent"))
    page.key("KeyF", "f")
    time.sleep(1.0)
    print("viewer:", page.eval("!document.getElementById('viewer').hidden"), page.eval("document.getElementById('viewerImg').src.split('/').pop()"))
    page.key("Escape", "Escape")
    time.sleep(0.5)
    page.eval("window.__app.here.api.onAim(false)")
before = page.eval(f"{hidden}.map((p) => p.photo.stem).join(',')")
page.eval("window.__app.here.api.action.run()")
time.sleep(1)
after = page.eval(f"{hidden}.map((p) => p.photo.stem).join(',')")
print("rebuilt: fresh set", before != after, "all hidden again", page.eval(f"{hidden}.every((p) => p.hidden)"), "count", page.eval(f"{hidden}.length"), "listed", page.eval("window.__app.here.photos.length"))
print("errors:", page.eval("window.__errors"), page.console_errors()[:6])
page.close()
