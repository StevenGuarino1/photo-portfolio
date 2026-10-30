"""Hold S on the site and check the hand-over: the gallery's window onto the
site should land on exactly the pixels the page had. Takes a screenshot of
the page, then of the gallery at the moment it has taken over (frozen
there), and finds the shift that best lines the two up.

  python stepback_test.py [site url] [--dpr 2] [--scroll 300] [--shots DIR]
"""
import os
import sys
import time

from PIL import Image, ImageChops, ImageStat

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Page

args = sys.argv[1:]
opt = lambda name, default: args[args.index(name) + 1] if name in args else default
URL = next((a for a in args if a.startswith("http")), os.environ.get("SITE_URL", "http://localhost:8000/"))
DPR = float(opt("--dpr", "1"))
SCROLL = int(opt("--scroll", "0"))
SHOTS = opt("--shots", os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots"))
os.makedirs(SHOTS, exist_ok=True)

page = Page(1400, 800, scrollbars=True)
page.call("Emulation.setDeviceMetricsOverride", width=1400, height=800, deviceScaleFactor=DPR, mobile=False)
page.goto(URL, wait=4)
page.eval(f"scrollTo(0, {SCROLL})")
time.sleep(2.5)
site = os.path.join(SHOTS, "handoff-site.png")
page.shot(site)
page.key("KeyS", "s")
t0 = time.time()
while time.time() - t0 < 30:
    if page.eval("!!window.__gallery.frame()?.classList.contains('is-on')"):
        # Freeze the gallery on the hand-over frame.
        page.eval("window.__gallery.frame().contentWindow.postMessage({ type: 'gallery:pause' }, '*')")
        break
    time.sleep(0.05)
took = time.time() - t0
page.key("KeyS", "s", down=False)
time.sleep(0.6)
gal = os.path.join(SHOTS, "handoff-gallery.png")
page.shot(gal)
print("took over after", round(took, 2), "s; pill:", page.eval("document.getElementById('stepback').hidden"))
print("errors:", page.console_errors()[:6], page.eval("window.__gallery.frame()?.contentWindow.__errors || []"))
page.close()

a = Image.open(site).convert("L")
b = Image.open(gal).convert("L")
W, H = a.size
m = 16
best = None
for dy in range(-m, m + 1):
    for dx in range(-m, m + 1):
        ca = a.crop((m + dx, m + dy, W - m + dx, H - m + dy))
        cb = b.crop((m, m, W - m, H - m))
        d = ImageStat.Stat(ImageChops.difference(ca, cb)).mean[0]
        if best is None or d < best[0]:
            best = (d, dx, dy)
same = ImageStat.Stat(ImageChops.difference(a.crop((m, m, W - m, H - m)), b.crop((m, m, W - m, H - m)))).mean[0]
print(f"mean difference as is: {same:.2f}; best shift ({best[1]}, {best[2]}) px gives {best[0]:.2f}")
