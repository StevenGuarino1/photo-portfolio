"""Bring the launcher from the Range into the lobby and fight the shades:
check the lobby builds none of it until the launcher comes in, blow a hole in
a wall, watch the eyes in the hollow and the first shade come out, shoot it,
let the next one reach you, and repair the hall.

The page's own loop is stopped once you're in the lobby and time is stepped
by hand, so a slow software renderer plays out the same as a fast GPU.

  python hall_test.py [url] [--shots DIR]
"""
import json
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
FIGHT = "window.__app.regions.lobby.api.fight"

page = Page(1400, 800)
page.goto(URL, wait=5)
page.eval("document.getElementById('enter').click()")
time.sleep(1)


def state():
    return page.eval(f"(() => {{ const f = {FIGHT}; return f ? {{ damaged: f.damaged, health: f.health, shades: f.shades.map((s) => s.state) }} : null; }})()")


def look(x, z, tx, ty, tz):
    yaw = math.atan2(-(tx - x), -(tz - z))
    pitch = math.atan2(ty - 1.62, math.hypot(tx - x, tz - z))
    page.eval(f"Object.assign(window.__app.me, {{ x: {x}, z: {z}, yaw: {yaw}, pitch: {pitch} }})")


def step(secs):
    # Advance the lobby and the launcher by hand, 30 steps a second.
    page.eval(f"""(() => {{
      const a = window.__app;
      window.__simT = window.__simT || 1000;
      for (let i = 0; i < {secs} * 30; i++) {{
        window.__simT += 1 / 30;
        a.ARMS.update(1 / 30);
        a.regions.lobby.api.update(window.__simT, 1 / 30, {{ cor: null, here: a.here === a.regions.lobby }});
      }}
    }})()""")


def render():
    page.eval("window.__app.frame(); window.__app.frame();")


def shot(name):
    render()
    page.shot(os.path.join(SHOTS, f"hall-{name}.png"))


def fire():
    # A frame first, so the camera faces where we just looked.
    render()
    return page.eval("(() => { const A = window.__app.ARMS; A.reload = 0; return A.fire(); })()")


# The lobby as everyone sees it: nothing extra built without the launcher.
page.eval("window.__app.goTo('lobby')")
time.sleep(3)
print("without the launcher, fight built:", page.eval(f"!!{FIGHT}"), flush=True)

page.eval("window.__app.goTo('range', 'line')")
time.sleep(3)
print("picked up at the bench:", page.eval("window.__app.ARMS.carrying"), flush=True)
page.eval("window.__app.goTo('lobby')")
time.sleep(4)  # the hint follows the room's name
print("with it, fight built:", page.eval(f"!!{FIGHT}"), "hint:", page.eval("document.querySelector('#toast').textContent.trim()"), flush=True)
page.eval("window.__app.renderer.setAnimationLoop(null)")

# A hole in the left wall between the doors at z 11 and 18.
look(1.5, 14.5, -4, 1.0, 14.5)
print("fired:", fire())
step(0.4)
shot("1-blast")
print("after the blast:", json.dumps(state()), flush=True)
look(0.5, 14.5, -4, 1.1, 14.5)
step(1.5)
shot("2-hole")

# Back off down the hall and shoot the first one out.
me = (2.8, 22.0)
for k in range(40):
    step(0.5)
    tgt = page.eval(f"(() => {{ const s = {FIGHT}.shades.find((q) => q.state === 'chase' && Math.hypot(q.x - {me[0]}, q.z - {me[1]}) > 3.5); return s ? [s.x, s.z] : null; }})()")
    if tgt:
        print(f"first one out after {(k + 1) * 0.5:.1f} s", flush=True)
        look(me[0], me[1], tgt[0], 1.0, tgt[1])
        shot("3-aim")
        print("fired:", fire())
        step(0.25)
        shot("4-hit")
        print("after the shot:", json.dumps(state()), flush=True)
        break

# Stand still and let the next one reach you.
for _ in range(60):
    step(0.5)
    if (state() or {}).get("health", 5) < 5:
        break
shot("5-hurt")
print("hurt:", json.dumps(state()), flush=True)

page.eval(f"window.__app.regions.lobby.api.action.run()")
shot("6-repaired")
print("repaired:", json.dumps(state()), "button hidden:", page.eval("document.getElementById('roomAction').hidden"))
print("errors:", page.eval("window.__errors"), page.console_errors()[:6])
page.close()
