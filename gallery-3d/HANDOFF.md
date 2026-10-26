# Handoff: picking this up on another machine

Steven's 3D walk-through photo gallery: a three.js page built from
`gallery-3d/src/*`, served from his live site and also published as a private
claude.ai artifact. Read this and `CONTEXT.md` before doing anything. Where the
two disagree, this file is newer.

Last updated at the end of the 2026-10-26 Mac session.

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
  Nature Train, Night Train, Apartments, Drive-in. The Moor and Pool code is
  still in `src/50-moor.js` and `src/60-pool.js`.
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

## Changed this session

- Lobby door plates show **only the room name** — no tagline under it — and the
  sign that hung over the window onto the site is gone entirely.
- Those plates have **no panel behind them**. The `minimal` label style now has
  `bg: null`, which leaves the canvas transparent, and `labelMesh` turns that
  into a blended plane. Only the glyphs show.
- The Gathering's kneelers bow from the hips (see above).

## Open, in rough priority order

1. **Framerate.** Steven's M1 Air lags badly and gets worse the longer he
   walks. `autoQuality()` guesses from `hardwareConcurrency` and
   `deviceMemory` before drawing a frame, so an M1 Air gets **High**: `dpr 2`
   (full Retina, ~4× the pixels), 2048px shadows, and `keep: 9` rooms resident
   at once on 8 GB of shared memory. Workaround is Esc → Quality → Medium.
   The real fix is to measure rather than guess: start at Medium, judge on a
   rolling median of frame times, climb or drop with hysteresis, ignore frames
   just after a room builds, and drop `dpr` first since it is quadratic. `keep`
   should be bounded by memory separately — it is a footprint problem, not a
   per-frame one, and it is what makes things degrade over time.
2. **The toast still shows taglines.** Entering a room pops the room name with
   its tagline underneath (`toast()`, `10-core.js`) — the same name-plus-flavour
   -text pattern he just had stripped off the door plates. He has not decided
   whether to trim it to names, drop it, or leave it.
3. **Step-back pass 2:** an ~8 px offset at the hand-off, phone long-press, and
   loading feedback.
4. Night Train: the city layers travel in a straight line while the train bends.
5. Nature Train extras: trestle bridges, tunnels, light shafts through trees.
6. Photo captions (each card already has an empty caption field), a nightclub
   room with dancing characters, a "Walk the gallery" link on the real site,
   real CC0 ambient recordings instead of synthesized sound, and bringing the
   characters closer to the newer, more realistic train interiors.

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
