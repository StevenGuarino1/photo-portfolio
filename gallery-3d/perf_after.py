"""Frame rates per room in the new version: desktop GPU, and the phone
stand-in (390x844 at 3x, CPU slowed 6x, touch, so Auto picks Low)."""
import json
import sys
import time

sys.path.insert(0, ".")
from cdp import Page

URL = "http://localhost:8000/crowd-lab/v2/"
SPOTS = [("lobby", "spawn"), ("gallery", "spawn"), ("gallery", "osprey"), ("gallery", "globes"), ("apartments", "spawn"), ("lighthouse", "spawn"), ("lighthouse", "gallery"), ("overlook", "spawn"), ("subway", "car"), ("drivein", "front")]
out = {}
for mode in ("desktop", "phone"):
    page = Page(1400, 800)
    if mode == "phone":
        page.phone(throttle=6)
    page.goto(URL, wait=6 if mode == "phone" else 4)
    page.eval("document.getElementById('enter').click()")
    time.sleep(1.5)
    tier = page.eval("window.__app.tier")
    for room, spot in SPOTS:
        page.eval(f"window.__app.goTo('{room}', '{spot}')")
        time.sleep(5 if mode == "phone" else 3)
        fps = page.eval("window.__fps(5)")
        info = page.eval("({ calls: window.__app.renderer.info.render.calls, tris: window.__app.renderer.info.render.triangles, built: Object.values(window.__app.regions).filter((r) => r.loaded).map((r) => r.id + ':' + r.builtMs + 'ms').join(' ') })")
        out[f"{room}/{spot}/{mode}"] = {"tier": tier, **fps, **info}
        print(mode, tier, room, spot, fps, info, flush=True)
        if mode == "phone":
            page.shot(f"shots/after-{room}-{spot}-phone.png")
    page.close()
json.dump(out, open("perf-after.json", "w"), indent=1)
