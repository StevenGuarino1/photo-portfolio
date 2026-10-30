# Handoff: picking this up on another machine

Steven's 3D walk-through photo gallery: a three.js page built from
`gallery-3d/src/*`, served from his live site and also published as a private
claude.ai artifact. Read this and `CONTEXT.md` before doing anything. Where the
two disagree, this file is newer.

Last updated at the end of the 2026-10-29 PC session (Windows, worktree
`photo-portfolio-3d` on branch `gallery-3d`).

## Start here

```
git clone https://github.com/StevenGuarino1/photo-portfolio.git
cd photo-portfolio
git checkout gallery-3d
python3 gallery-3d/build.py        # should print "built ... KB, 34 photos"
```

Steven can view things locally now, so serving the repo root is often quicker
than publishing:

```
python3 -m http.server 8000        # then /gallery-3d/out/ or /crowd-lab/v2/
```

## State as of this session

- **The site is live and public.** `main` is GitHub Pages at
  https://stevenguarino1.github.io/photo-portfolio/ — the dark grid homepage,
  with hold-S stepping into the 3D gallery. `gallery-3d` was fast-forwarded
  into `main` and pushed, on his say-so.
- **`gallery-3d/out/` is now committed** (it used to be gitignored). It has to
  be: the homepage's step-back iframe loads `gallery-3d/out/index.html` by
  path, so on Pages an ignored `out/` meant a 404 and a dead feature. Cost is
  one duplicate copy of the photos under `out/img` and `out/full`. **Rebuild
  and commit `out/` whenever the gallery source changes**, or the live site
  keeps serving the old build.
- The old marquee homepage is still at `/marquee.html`, unlinked.

## Links

- **3D gallery artifact:** https://claude.ai/artifact/HLzbGKaaYYVUqrkcbBJtKT
  Republish with that URL as `url` and `gallery-3d/out/index.html` as the file.
  The `img/` and `full/` photos are already published there and only need
  resending if the photos themselves change.
- **Step-back preview** (the site, with hold-S working):
  https://claude.ai/artifact/8XygPFzG71m9A7yMzVKcUA
  Publish the repo's `index.html` with `root` = the repo, and send
  `gallery-3d/out/index.html` as its own file **with this exact prefix added on
  top**, which is what is already published there:
  ```
  <!doctype html>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ```
  Update this artifact whenever the gallery changes, not just the other one.
- Snapshot from before the big refinement pass:
  https://claude.ai/artifact/NzPe4oP1HSK8MyMibw4tCu

Both artifacts are **private**. Only Steven can open them.

## Build and test

```
python3 gallery-3d/build.py          # out/index.html, out/img (1200 px), out/full
python3 gallery-3d/build.py --test   # also ../crowd-lab/v2/ with window.__app hooks
```

Delete `crowd-lab/` before committing. `ui_test.py`, `collide_test.py`,
`perf_after.py` and `sound_test.py` drive headless Chrome through `cdp.py`.

A note that cost time this session: in the test build, calling `__app.goTo()`
without entering properly leaves the room's `update()` uncalled, so every
instance matrix reads as identity and nothing looks animated. To inspect
animation, either enter the gallery for real first, or call
`reg.api.update(t, dt)` directly at a couple of timestamps and read the
matrices — that is precise and needs no frame loop.

## Layout

- **Lobby:** a long matte-black hall, a signed door and vestibule to each room
  down both sides (order in `SLOTS`, `10-core.js`):
  Gallery (Globe Room behind it), the Gathering, Lighthouse, Hawk Watch,
  Nature Train, Night Train, Pool, Apartments, Moor, Drive-in, Range.
- **How rooms draw:** each room is its own scene, seen only through its doorway
  (stencil plus per-material clipping planes). Rooms load when you come near.
- **Night Train:** five cars on a curving track whose bends are fixed in the
  track and stream past (`bendAt` in `src/80-subway.js`), at a calculated
  10.95 m/s, grimy interior, elevated night city outside in layers.
- **Lighthouse:** a stone tower in a storm (`src/65-lighthouse.js`): spiral
  stair, keeper's landing, lamp room with a turning lens, gallery outside. It
  tracks which level you are on itself, since floor height alone cannot tell
  turns of a spiral apart.
- **Nature Train:** five wooden coaches entered from the back
  (`src/85-naturetrain.js`), plants everywhere, a golden-hour valley outside
  that stays lined up through the bends.
- **The Gathering:** a cliff lookout over a basin of ~1,500 instanced figures.
  Kneelers are **two** instanced meshes: planted legs and hands placed once at
  build, and a torso-and-head piece modelled about the hip that pitches each
  frame, so the bow bends at the hips instead of tipping the whole figure like
  a board. Bow sweeps roughly 24° to 73°, one every 3.5–5 s, eased to hold a
  beat at the bottom.

## Changed in the 2026-10-29 PC session

All on `gallery-3d` (commits e57501b, 3aaaed6, c5c8bbd and the Range before
them), published to both artifacts. **Not on `main`**: the live site is behind
until he says "push it" (fast-forward `main` to `gallery-3d`, then push).

- **The Range** (`src/92-range.js`), new: a launcher on the bench, a town of
  block buildings 150–380 m out that blow apart, crumble and topple. Smoke,
  dust, fire and glass are one instanced particle system (two draw calls);
  collapses push out a rolling dust surge; windows burst into glints.
- **Frame rate, measured not guessed** (`10-core.js`):
  - `cull()` / `openingRect()`: a room seen through a doorway is drawn only
    inside the screen rectangle where it can show (its door, cut down to the
    hall doorway in front), with a scissor; skipped when that's empty. The
    lobby spawn went from 1,791 draw calls / 747k triangles to 98 / 2k.
  - Shadows: `renderer.shadowMap.autoUpdate = false`; the room you're in
    redraws them at ~30 Hz, rooms through doorways at ~7 Hz.
  - `govern()`: on Auto, frame times are judged every 50 frames (or 1.5 s);
    slow frames step the resolution down a notch (`SCALES`), a long smooth run
    tries one back up, a failed notch isn't retried for a minute; skipped when
    the CPU is the bottleneck. The notch is saved (`settings.autoLevel`,
    `autoTier`). `hush()` stops it judging hitches (builds, resizes, pauses).
  - `keep` on High is 6 rooms, not 9. Nothing draws while a photo is full screen.
  - `bakeLimbs()` (`20-people.js`): once posed, arms merge into the chest and
    legs into the pelvis: ~5 draws a person instead of ~17.
  - The lobby's static pieces are merged (`mergeStatic`).
- **Step-back** (`index.html`, `95-site.js`):
  - The 8 px offset was the gallery page's default body margin (it's served
    raw in the frame). `00-head.html` now sets `margin: 0`.
  - The snapshot covers the frame's area (`clientWidth`), waits for the page
    fonts, and carries opacity, borders (nav underline, the S key), underlines
    and the logo's CSS slash; `stepback_test.py` measures it at 0 px off.
  - Phone: press and hold the page (not a photo, link or text) to step back.
  - The gallery starts loading 0.2 s into a hold; a "Loading the gallery…"
    pill shows if it isn't ready, with a 25 s give-up. The frame draws nothing
    until it's shown; rooms wait to build until the camera has pulled back;
    the hand-over frame is drawn at full sharpness.
  - Standalone, the lobby window shows a sketch of the site (`siteSketch()`).
- Room toasts show **the name only**, plus a `hint` where a room needs one
  (only the Range has one).
- **Night Train**: the far city and the sky swing with the train's heading
  (`headingAt`); the blocks right below stay square to the viaduct.
- **Nature Train**: a tunnel through a wooded hill every minute or two (`TUN`
  in `85-naturetrain.js`), laid along the track; inside, the sun, sky light and
  reflections fade, tunnel lamps sweep through the coach, the sound closes in.
- Homepage: photos reachable and openable from the keyboard (focus ring clear
  of the photo), focus returns to the grid, description and theme-colour meta.
- Tests read `GALLERY_URL` (default `http://localhost:8000/crowd-lab/v2/`) and
  `SITE_URL` (default `http://localhost:8000/`). New: `tour_test.py` (every
  room, two laps: fps, GPU/CPU ms, draw calls, GPU memory, leaks),
  `range_test.py`, `stepback_test.py`.

## Open, in rough priority order

1. Check the frame rate on his M1 Air for real; Esc → Quality shows the
   resolution Auto settled on.
2. Nature Train: trestle bridges and light shafts through the trees (the
   tunnel is done).
3. A slow leak of about four geometries per full lap of every room; harmless
   so far, not yet traced.
4. Photo captions (each card already has an empty caption field), a nightclub
   room with dancing characters, real CC0 ambient recordings instead of
   synthesized sound, and bringing the characters closer to the newer, more
   realistic train interiors.

## How Steven likes to work

- **Keep replies short.** Say what you actually checked versus what you are
  assuming. He will call out padding and slowness, fairly.
- Don't make him wait while you verify something small. He has said outright
  there is no need to be too rigorous on small changes.
- He types fast with typos and changes direction mid-task. Fold it in and keep
  going.
- Effects go around photos, never over them, and photos stay true to colour.
- He dislikes rounded or blurred photo edges, generic layouts, sudden
  unrealistic motion, and things that look too clean or new.
- To settle a subjective look, show options side by side in plain language.
- **Never push to `main` unless he says "push it".** It is his live public site.
  Work on `gallery-3d`; committing and pushing there is fine.

## Not in git

`photos/originals/` — 283 MB, 35 full-res masters, gitignored. **A clone will
not carry them and they exist on one machine only.** They need a real backup
independently of any of this.
