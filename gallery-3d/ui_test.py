"""Exercise the interface: title, menu, photo viewer on desktop; joystick,
drag-look and tapping the photo card on an emulated phone with touch."""
import sys
import time

sys.path.insert(0, ".")
from cdp import Page

URL = "http://localhost:8000/crowd-lab/v2/"
out = {}

# ---------- Desktop ----------
page = Page(1400, 800)
page.goto(URL, wait=4)
page.shot("shots/ui-title.png")
page.click(700, 400 + 0)  # somewhere on the title (not the button) does nothing
page.eval("document.getElementById('enter').click()")
time.sleep(1.2)
# Walk forward with the keyboard for a second.
before = page.eval("[window.__app.me.x, window.__app.me.z]")
page.key("KeyW", "w", True)
time.sleep(1.0)
page.key("KeyW", "w", False)
after = page.eval("[window.__app.me.x, window.__app.me.z]")
out["keyboard walk (m)"] = round(((after[0] - before[0]) ** 2 + (after[1] - before[1]) ** 2) ** 0.5, 2)
# The menu.
page.key("Escape", "Escape", True)
page.key("Escape", "Escape", False)
time.sleep(0.4)
out["menu open"] = page.eval("!document.getElementById('menu').hidden")
page.shot("shots/ui-menu.png")
page.key("Escape", "Escape", True)
page.key("Escape", "Escape", False)
time.sleep(0.3)
out["menu closed"] = page.eval("document.getElementById('menu').hidden")
# A photo: stand in front of the Osprey, check the card, press F.
page.eval("window.__app.goTo('gallery', 'osprey')")
time.sleep(3)
page.eval("(() => { const a = window.__app; const l = a.here.toLocal(a.me.x, a.me.z); const w = a.here.toWorld(0, 3.2); a.me.x = w.x; a.me.z = w.z; a.me.pitch = 0.02; })()")
time.sleep(1.2)
out["card shows"] = page.eval("!document.getElementById('photoCard').hidden && document.querySelector('#photoCard h2').textContent")
page.shot("shots/ui-card.png")
page.key("KeyF", "f", True)
page.key("KeyF", "f", False)
time.sleep(1.5)
out["viewer open"] = page.eval("!document.getElementById('viewer').hidden && document.getElementById('viewerImg').naturalWidth")
page.shot("shots/ui-viewer.png")
page.key("Escape", "Escape", True)
page.key("Escape", "Escape", False)
time.sleep(0.3)
out["viewer closed"] = page.eval("document.getElementById('viewer').hidden")
# Back to the lobby with H.
page.key("KeyH", "h", True)
page.key("KeyH", "h", False)
time.sleep(1)
out["H goes home"] = page.eval("window.__app.here.id")
# Settings persist.
page.eval("(() => { document.getElementById('motionToggle').click(); })()")
out["saved settings"] = page.eval("localStorage.getItem('steven-guarino-gallery')")
out["desktop errors"] = page.eval("window.__errors") + [e for e in page.console_errors() if "404" not in e]
page.close()

# ---------- Phone, with touch ----------
page = Page(1400, 800)
page.phone(throttle=0)
page.goto(URL, wait=4)
page.shot("shots/ui-title-phone.png")
# Tap Enter.
r = page.eval("(() => { const b = document.getElementById('enter').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()")
page.touch("touchStart", [r])
page.touch("touchEnd", [])
time.sleep(1.2)
out["phone entered"] = page.eval("document.getElementById('title').hidden || document.getElementById('title').classList.contains('is-leaving')")
out["joystick shown"] = page.eval("!document.getElementById('stick').hidden")
# Push the joystick up for a second.
s = page.eval("(() => { const b = document.getElementById('stick').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()")
before = page.eval("[window.__app.me.x, window.__app.me.z]")
page.touch("touchStart", [s])
for i in range(1, 6):
    page.touch("touchMove", [[s[0], s[1] - i * 10]])
    time.sleep(0.05)
time.sleep(1.0)
page.shot("shots/ui-phone-walking.png")
page.touch("touchEnd", [])
after = page.eval("[window.__app.me.x, window.__app.me.z]")
out["joystick walk (m)"] = round(((after[0] - before[0]) ** 2 + (after[1] - before[1]) ** 2) ** 0.5, 2)
# Drag on the right half to look around.
yaw0 = page.eval("window.__app.me.yaw")
page.touch("touchStart", [[300, 400]])
for i in range(1, 8):
    page.touch("touchMove", [[300 - i * 15, 400]])
    time.sleep(0.02)
page.touch("touchEnd", [])
out["drag look (rad)"] = round(page.eval("window.__app.me.yaw") - yaw0, 2)
# Stand at a photo and tap its card.
page.eval("window.__app.goTo('gallery', 'osprey')")
time.sleep(3)
page.eval("(() => { const a = window.__app; const w = a.here.toWorld(0, 3.6); a.me.x = w.x; a.me.z = w.z; a.me.pitch = 0.04; })()")
time.sleep(1.2)
page.shot("shots/ui-phone-card.png")
c = page.eval("(() => { const el = document.getElementById('photoCard'); if (el.hidden) return null; const b = el.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()")
out["phone card"] = bool(c)
if c:
    page.touch("touchStart", [c])
    page.touch("touchEnd", [])
    time.sleep(1.5)
    out["phone viewer"] = page.eval("!document.getElementById('viewer').hidden")
    page.shot("shots/ui-phone-viewer.png")
out["phone errors"] = page.eval("window.__errors") + [e for e in page.console_errors() if "404" not in e]
page.close()
for k, v in out.items():
    print(f"{k}: {v}")
