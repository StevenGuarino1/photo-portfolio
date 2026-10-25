"""Walk blind in every room: hold W, turn to a random heading every so
often, and record where you go. Check you stay inside each room, don't
end up in a wall, and don't get stuck; then walk through every doorway."""
import json
import random
import sys
import time

sys.path.insert(0, ".")
from cdp import Page

URL = "http://localhost:8000/crowd-lab/v2/"
BOUNDS = {
    "gallery": (-9, 9, 0, 28),
    "apartments": (-33.2, 39.2, -0.3, 36.2),
    "lighthouse": (-5.1, 5.1, -0.3, 9.1),
    "overlook": (-11, 11, -0.3, 21),
    "subway": (-23.2, 23.2, -0.3, 2.95),
    "drivein": (-30, 30, -0.3, 70),
}
page = Page(1000, 640)
page.goto(URL, wait=4)
page.eval("document.getElementById('enter').click()")
time.sleep(1)
page.eval("""window.__trace = []; setInterval(() => { const a = window.__app; const l = a.here.toLocal(a.me.x, a.me.z); window.__trace.push([a.here.id, +l.x.toFixed(2), +l.z.toFixed(2), +a.me.y.toFixed(2)]); }, 100);""")
random.seed(4)
results = {}
for room in BOUNDS:
    page.eval(f"window.__app.goTo('{room}')")
    time.sleep(3)
    page.eval("window.__trace.length = 0")
    page.key("KeyW", "w", True)
    page.key("ShiftLeft", "Shift", True)
    for i in range(14):
        page.eval(f"window.__app.me.yaw = {random.uniform(-3.14, 3.14)}")
        time.sleep(1.3)
    page.key("KeyW", "w", False)
    page.key("ShiftLeft", "Shift", False)
    trace = page.eval("window.__trace")
    x0, x1, z0, z1 = BOUNDS[room]
    pts = [p for p in trace if p[0] == room]
    outside = [p for p in pts if not (x0 - 0.05 <= p[1] <= x1 + 0.05 and z0 - 0.05 <= p[2] <= z1 + 0.05)]
    left = [p for p in trace if p[0] != room]
    dist = sum(((b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2) ** 0.5 for a, b in zip(pts, pts[1:]))
    # Stuck: a 3-second window where you barely moved while walking.
    stuck = 0
    for i in range(0, max(0, len(pts) - 30), 10):
        a, b = pts[i], pts[i + 30]
        if ((b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2) ** 0.5 < 0.25:
            stuck += 1
    results[room] = {"samples": len(pts), "metres walked": round(dist, 1), "outside bounds": len(outside), "left the room": len(left), "stuck windows": stuck, "max floor y": max(p[3] for p in pts), "min floor y": min(p[3] for p in pts)}
    print(room, results[room], outside[:3], flush=True)

# Walk through each doorway from the lobby and back out.
doors = {}
for room in BOUNDS:
    page.eval("window.__app.goTo('lobby')")
    time.sleep(1.5)
    page.eval(f"""(() => {{ const a = window.__app; const d = a.doors.find((d) => d.room === '{room}'); const p = d.center.clone().addScaledVector(d.normal, -3.2); a.me.x = p.x; a.me.z = p.z; a.me.yaw = Math.atan2(-d.normal.x, -d.normal.z); a.me.pitch = 0; }})()""")
    time.sleep(2.5)  # let the room build if it hasn't
    page.key("KeyW", "w", True)
    time.sleep(3.6)
    page.key("KeyW", "w", False)
    inside = page.eval("window.__app.here.id")
    page.eval("window.__app.me.yaw += Math.PI")
    time.sleep(0.2)
    page.key("KeyW", "w", True)
    time.sleep(3.6)
    page.key("KeyW", "w", False)
    back = page.eval("window.__app.here.id")
    doors[room] = (inside, back)
    print("door", room, "->", inside, "-> back to", back, flush=True)
print("errors:", page.eval("window.__errors") + [e for e in page.console_errors() if "404" not in e])
page.close()
json.dump({"walk": results, "doors": doors}, open("collide-results.json", "w"), indent=1)
