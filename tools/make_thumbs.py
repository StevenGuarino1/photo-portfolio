"""Make the smaller copies of each photo that the gallery grid loads.

The grid shows photos a few hundred pixels wide, so it loads these instead of
the full-size files (the enlarged view still uses the full-size ones).

Run this after adding photos to photos/ and js/photos.js:

    python tools/make_thumbs.py

It only writes thumbnails that are missing or older than their source photo,
so it's safe to run any time. Needs Pillow (pip install pillow).
"""

import glob
import os

from PIL import Image

WIDTHS = (480, 800, 1200)  # keep in sync with THUMB_WIDTHS in index.html
QUALITY = 82

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "photos")
THUMBS = os.path.join(PHOTOS, "thumbs")


def main():
    os.makedirs(THUMBS, exist_ok=True)
    written = 0

    for path in sorted(glob.glob(os.path.join(PHOTOS, "*.jpg"))):
        stem = os.path.splitext(os.path.basename(path))[0]
        if stem.endswith("@2x"):
            continue

        # Downscale from the 2x file when there is one, for the sharpest result.
        two_x = os.path.join(PHOTOS, f"{stem}@2x.jpg")
        source = two_x if os.path.exists(two_x) else path

        for width in WIDTHS:
            out = os.path.join(THUMBS, f"{stem}-{width}.jpg")
            if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(source):
                continue

            with Image.open(source) as im:
                im = im.convert("RGB")
                # Never upscale: a source narrower than the target is saved as-is,
                # so every size still exists for the page to request.
                if im.width > width:
                    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
                im.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
            written += 1

    total = sum(os.path.getsize(p) for p in glob.glob(os.path.join(THUMBS, "*.jpg")))
    print(f"Wrote {written} thumbnails; thumbs/ is {total / 1_048_576:.1f} MB")


if __name__ == "__main__":
    main()
