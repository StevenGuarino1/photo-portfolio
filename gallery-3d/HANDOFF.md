# Handoff: picking this up on another machine

This is Steven's 3D walk-through photo gallery, a three.js page published as a private claude.ai artifact. This note carries over the context from the Windows sessions.

## Links
- Live artifact: https://claude.ai/artifact/HLzbGKaaYYVUqrkcbBJtKT. Republish it by passing this URL as `url` and `out/index.html` as the file, with `root` = `out` and every `img/` and `full/` file listed in `files`.
- Snapshot from before the big refinement pass: https://claude.ai/artifact/NzPe4oP1HSK8MyMibw4tCu

## Build
```
cd gallery-3d
python3 build.py          # writes out/index.html, plus out/img (1200 px) and out/full photos
python3 build.py --test   # also writes ../crowd-lab/v2/ with test hooks (window.__app)
```
Serve the repo root (`python3 -m http.server 8000`) and open `/crowd-lab/v2/` to test locally. The tests (`ui_test.py`, `collide_test.py`, `perf_after.py`, `sound_test.py`) drive headless Chrome through `cdp.py`.

## Layout
- **Lobby:** an octagonal lobby with a signed vestibule out to each room:
  - Gallery, with the Globe Room behind it
  - Moor
  - Pool
  - Hawk Watch
  - Night Train (subway)
  - Nature Train (north-west)
  - Drive-in
- **How rooms draw:** each room is its own scene, seen only through its doorway (stencil plus per-material clipping planes). Rooms load when you come near.
- **Night Train:** five cars on a curving track whose bends are fixed in the track and stream past (`bendAt` in `src/80-subway.js`), at a calculated 10.95 m/s, with a grimy, realistic interior and an elevated night city with traffic outside, built in layers for distance.
- **Nature Train:** five wooden coaches entered from the back (`src/85-naturetrain.js`), plants everywhere, a golden-hour valley outside that stays lined up through the bends.

## How Steven likes to work
- He usually views things remotely (on his phone or another PC), so publish the artifact and send screenshots rather than pointing him at localhost.
- Effects go around photos, never over them, and photos stay true to colour.
- To settle a subjective look, show options side by side in plain language.
- The `main` branch is the live GitHub Pages site. Don't push to `main` unless he says "push it".
- Mid-task changes of direction are normal. Fold them in and keep going.

## Open ideas
- Nature Train extras: trestle bridges, tunnels, light shafts through the trees.
- Swap the synthesized sound for real CC0 ambient recordings.
- Add photo captions, a nightclub room with dancing characters, and a "Walk the gallery" link on the real site.
- Bring the characters' look closer to the newer, more realistic train interior.
