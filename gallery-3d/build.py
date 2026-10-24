"""Join the page's pieces into one file, with the photo data from the
site's photos.js baked in, and copy the photos it needs.

  python build.py            -> out/index.html (+ img/, full/)
  python build.py --test     -> also a copy with test hooks in crowd-lab/v2
"""
import glob
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)  # the portfolio repo this folder sits in
OUT = os.path.join(HERE, "out")


def photo_data():
    src = open(os.path.join(SITE, "js", "photos.js"), encoding="utf-8").read()
    out = []
    for block in re.findall(r"\{[^{}]*\}", src):
        f = re.search(r'file: "photos/([^"]+)\.jpg"', block)
        if not f:
            continue
        get = lambda k: (re.search(k + r': "?([^",\n]+)"?', block) or [None, ""])[1].strip()
        shutter = get("shutter")
        if shutter and not shutter.endswith("s"):
            shutter += " s"
        elif shutter.endswith("s") and not shutter.endswith(" s"):
            shutter = shutter[:-1] + " s"
        date = get("dateTaken")
        out.append({
            "stem": f.group(1),
            "title": get("title"),
            "category": get("category"),
            "w": int(get("width")),
            "h": int(get("height")),
            "settings": " · ".join(x for x in [get("aperture"), shutter, ("ISO " + get("iso")) if get("iso") else ""] if x),
            "year": date[:4] if date else "",
            "alt": get("alt"),
            "caption": "",
        })
    return out


def build(test=False):
    parts = sorted(glob.glob(os.path.join(HERE, "src", "*")))
    head = open(parts[0], encoding="utf-8").read()
    js = "\n".join(open(p, encoding="utf-8").read() for p in parts[1:])
    photos = photo_data()
    js = js.replace("/*PHOTOS*/[]", json.dumps(photos, ensure_ascii=False))
    importmap = """<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"
    }
  }
</script>
"""
    page = head + "\n" + importmap + '<script type="module">\n' + js + "\n</script>\n"
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8", newline="\n").write(page)
    for d, src in (("img", os.path.join(SITE, "photos", "thumbs", "{}-1200.jpg")), ("full", os.path.join(SITE, "photos", "{}.jpg"))):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
        for p in photos:
            dst = os.path.join(OUT, d, p["stem"] + ".jpg")
            if not os.path.exists(dst):
                shutil.copy(src.format(p["stem"]), dst)
    if test:
        lab = os.path.join(SITE, "crowd-lab", "v2")
        os.makedirs(lab, exist_ok=True)
        hook = open(os.path.join(HERE, "testhook.html"), encoding="utf-8").read()
        open(os.path.join(lab, "index.html"), "w", encoding="utf-8", newline="\n").write(hook + page.replace(
            "renderer.setAnimationLoop(frame);",
            "renderer.setAnimationLoop(frame);\n  window.__app = { regions, doors, me, camera, renderer, goTo, enter, buildRegion, settings, get here() { return here; }, setQuality, frame, TIERS, get tier() { return tierName; }, get audio() { return audio; } };"))
        for d in ("img", "full"):
            dd = os.path.join(lab, d)
            if not os.path.exists(dd):
                shutil.copytree(os.path.join(OUT, d), dd)
    print("built", len(page) // 1024, "KB,", len(photos), "photos")


if __name__ == "__main__":
    build("--test" in sys.argv)
