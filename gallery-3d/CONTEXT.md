# Full context for continuing Steven's photo portfolio work

This is everything relevant from the long Windows session, which built this gallery between September and October 2026. Read this and `HANDOFF.md` before doing anything.

## Who and what
- Steven Guarino is a photographer. The repo `stevenguarino1/photo-portfolio` is his portfolio site.
- The site is static, served by GitHub Pages straight from `main`: https://stevenguarino1.github.io/photo-portfolio/
- **Pushing to `main` publishes the live site. Never do it unless he explicitly says "push it".** Work on the `gallery-3d` branch.
- He usually works remotely (phone, or a Mac viewing the session), so he can't open localhost. Always publish to the claude.ai artifact and send screenshots.

## The two projects
1. **The flat site** (`index.html`, `js/photos.js`, `photos/`):
   - Dark theme; a justified grid with a 2/3/2/4/3 row pattern; fade-in on scroll.
   - On hover, a photo lifts only: it scales up a little, rises 14 px and gets a soft shadow. No tilt, glow, shine or border.
   - The lightbox morphs smoothly from the grid (View Transitions). Clicking the image closes it, and the close button is subtle.
   - These index.html changes are committed on `gallery-3d` but **not live**.
   - Still waiting on him: a one-line bio and an Instagram handle or email for an About/contact footer.
   - An older side experiment, `flash-lab.html`: a 2×2 cross-fading photo wall, an uncropped grid, and a viewer with EXIF in a tinted Poppins caption and a thumbnail reel. It was never pushed.
2. **The 3D walk-through gallery** (`gallery-3d/`): the main focus now.
   - Live artifact: https://claude.ai/artifact/HLzbGKaaYYVUqrkcbBJtKT
   - The version from before the big refinement pass: https://claude.ai/artifact/NzPe4oP1HSK8MyMibw4tCu

## Photo data
- `js/photos.js` defines a global `PHOTOS` array of 34 photos. Each entry has file, file2x, title, alt, category (Landscape, Night Sky, Wildlife, Close-Up, Aviation), dateTaken, width, height, aperture, shutter and iso.
- Thumbnails live in `photos/thumbs/<stem>-{480,800,1200}.jpg`, made by `tools/make_thumbs.py`.
- `build.py` reads `photos.js` and copies the 1200 px thumbnails into `out/img/` and the 1600 px originals into `out/full/`.
- Photos he cares about:
  - **Osprey** (`4`): the star of the Gallery.
  - **Lunch on the Wing** (`Cruise-6`): a gull carrying a slice of pizza; the laughing man points at it.
  - **Falling Stars** (`DSC06067`).

## 3D gallery: how it's built
- **Source** is in `gallery-3d/src/*`, joined in filename order by `build.py` into `out/index.html`.
  - three.js 0.165.0 loads from jsDelivr via an importmap.
  - The artifact's security policy only allows scripts from approved CDNs; images must be published alongside as files.
- **Publishing:** pass the artifact URL as `url`, `gallery-3d/out/index.html` as the file, `root` = `gallery-3d/out`, and every `img/*.jpg` and `full/*.jpg` in `files`. The images only need re-sending if they change.
- **Core** (`10-core.js`):
  - Each room is its own scene, placed so its entrance meets the end of its lobby vestibule. You see into a room only through its doorway: a stencil mark plus per-material clipping planes. Mist materials set `userData.noClip`.
  - Rooms build when you come near and unload when you're far away. Quality tiers are Low, Medium, High and Auto: Auto picks Low on phones, High on desktops.
  - Player: eye height 1.62 m, walking speed 2.5 m/s (5 with Shift), body radius 0.25. Moves are split into small steps so you can't pass through walls.
  - Collisions use wall line segments plus round blockers, in each room's own coordinates.
- **Interface:**
  - Title screen with "Enter gallery"; a home button and H for the lobby; mute; a settings menu (Esc or the gear) with a room list, quality, reduce motion (also M), volume and mouse sensitivity.
  - Settings are saved in localStorage under `steven-guarino-gallery`.
  - Photo card when you stand in front of a photo; F or a tap opens it full screen. Touch joystick on phones.
- **Photos** are always drawn unlit, unfogged and not tone-mapped, so they show true colour. Each room labels them in its own style: card, wood, tile, ad, film or brass.
- **Characters** (`20-people.js`):
  - Chunky RuneScape-style low-poly people with a joint hierarchy (rotation order ZXY) and wide upper bodies.
  - Poses are joint angles plus `lHand`/`rHand` targets solved by two-bone reach.
  - `bake()` merges each character's parts for performance.
- **Voices and sound** (`35-voices.js` plus each room's `sound`): everything is synthesized with Web Audio (formant-filter babble, laughs, crickets, wind, owl, pump hum and so on). Each room has its own sound bus that crossfades through the corridors, behind a master limiter. No recordings are used.

## Rooms
- **Lobby:** a long, wide hall in matte black and minimal (thin ceiling light strip, white-on-black name plates; it used to be an octagon) with doors down both sides every 7 m, so any number of rooms fit; order is set by `SLOTS` in `10-core.js` (photo rooms first). Each door has its name plate, a short vestibule tinted toward the room's colour, and the room's light leaking out. The way in is at the near end between two featured photos.
- **Gallery** (with the Globe Room behind it):
  - The Osprey has a crowd of 13 around it in an arc that keeps the photo visible. A laughing man in a yellow shirt points at the gull photo.
  - There's a bench at the best view, track lights, and light pools painted on the walls.
  - The Globe Room has a big globe of photos in rings (14 round the middle, then 5 rings each side, never fewer than 4 to a ring) plus small bouncing globes.
- **Moor** (`50-moor.js`): a lone doorframe in a broken fence; moonlit and dark, with dead trees, mist, fireflies, bats, a shooting star, standing stones with a lantern, and seven night photos floating in the air.
- **Pool** (`60-pool.js`): a big drained pool (22 × 10 m) lying lengthways toward an eerily distant house with one lit window. A dim blue lamp in the deep end; photos set into the tile. Rain starts after about a minute (or at the deep end) and slowly fills the pool; R or the button drains it. Gate lamp, lounge chair, a pool ring in the deep end, and leaves blowing in gusts.
- **Hawk Watch:** a golden-hour ridge with layered valley ridges and a river. Raptors circle, with an occasional eye-level fly-by. Grass bends in gusts, there's a snapping flag, and bird photos stand on posts and a board.
- **Night Train** (`80-subway.js`):
  - Five cars on a smoothly curving track: `bendAt(t) = 0.1 sin(0.25t) + 0.03 sin(0.61t+1)`, about 25 seconds per left-right cycle.
    - The bends are fixed in the track (curvature at `s` ahead = `bendAt(t + s/SPEED)/L`), so curves stream past; the old version re-bent the whole track at once and the rails out the window slid sideways.
    - Speed is calculated, not guessed: tightest radius 120 m and a 1.0 m/s² sideways comfort limit (unbanked line) give √120 = 10.95 m/s. He asked for it to be calculated.
    - He disliked sudden snapping turns, and he disliked the earlier slow version that only got going after you walked in.
    - Cars, gangways, walls and riders update every frame, and you're carried with your car.
  - Interior: a realistic but grimy pass with molded bucket seats, brushed steel, scratched windows, a stained floor, litter, light panels with dead bugs, and an amber LED sign.
  - Outside: an elevated line at night ("Gotham"). Viaduct posts with lamps sweep past; city layers at near, mid, downtown and skyline distance for parallax, on an 80 m street grid. Cars (head and tail lights) run the avenues, cross streets and an elevated freeway. Floodlit crowns, spires, aircraft beacons, four searchlights, a horizon glow, an airliner.
  - Sound: rumble, wheel roar, soft motor hum, clacks timed from 39 ft rails and real truck/axle spacing. He hated a whine (an old 3.1 kHz squeal), so no steady high tones.
  - Possible issue: the city layers move in a straight line while the train bends.
  - Riders: asleep, reading, holding a strap, looking up.
- **Nature Train** (`85-naturetrain.js`; the most recent work): behind the north-west door. Five wooden coaches you enter from the back, so the doorway looks straight down the aisle.
  - Same curving-track model as the Night Train, but the coach you enter is the rear one. Speed calculated the same way: radius 141 m gives 11.87 m/s.
  - Inside: plank floor and jute runner, panelled wainscot, arched board roof with ribs, brass lamps, facing slatted or cane benches, brass luggage racks with trailing vines, ferns and big-leaved plants in terracotta, moss, windows dropped open, a dog. Landscape, Wildlife and Close-Up photos framed in wood in the vestibules.
  - Outside, golden hour. Near things (ballast, sleepers, rails, telegraph poles and sagging wires, trees, grass, deer) are placed along the track so they follow the bends. Further out the land is in world coordinates (forest band, a winding river, hills, snowy mountains, sky and sun) and the train's integrated heading and position carry you through it, so the view swings as it turns.
  - Sound: wind through the windows, leaves, birdsong phrases, a wood pigeon, creaks, clacks timed from the speed.
- **The Gathering** (`58-gathering.js`; his idea, the first "worship" room): a stone lookout high on a cliff above a basin at dusk. About 1,500 primitive figures (instanced, one merged shape per pose): kneelers bowing nearest the picture, standing worshippers with raised arms, dancers circling a dozen bonfires, a few pairs fighting with clubs. Across the basin a 46 m photo hangs from a timber frame with braziers; it changes every 45 s with a crossfade, and a wave of raised arms rolls back through the crowd with a roar. Drums, a low chant, a murmur that hushes on each change. He said keep it simple until he settles on a style; other worship ideas he liked the sound of: a cathedral, a queue for one photo, a pilgrimage, a monolith, a lantern lake, colossi.
- **Apartments** (`55-apartments.js`): an abandoned apartment block, basic box shapes so far. Five walkable floors with the same plan (two long corridors joined at the ends and the middle, 40 flats a floor, about a third of the doors open per floor, picked at random per floor) and a switchback stairwell east of the corridors, drawn 9 floors down and 13 up so the well seems endless; gates stop you below the ground floor and above the top. Couches, mattresses, tables, fallen chairs, rubbish, exit signs pointing every which way, dead corridor lights, thick dark fog, huge facades of the rest of the block outside the windows. Like the Lighthouse it tracks which floor you're on (`AP_STATE`).
- **Lighthouse** (`65-lighthouse.js`): a stone lighthouse on a headland in a storm at night.
  - Foot of the tower: whitewashed stone, an easel photo, barrels, an oilskin coat by the door. Stone steps spiral five turns up the wall (3.2 m a turn) round an open well, with an iron-and-brass railing, a rope along the wall, oil lamps, splayed rain-streaked windows, puddles and cobwebs. Photos all the way up: shore at the foot, sea and birds on the stair, night skies at the top (Falling Stars biggest).
  - At the top: a landing over the well with the keeper writing the log at his desk, a stove; a steep wooden stair up through a hatch to the lamp room: an eight-panel lens (two bullseyes) turning every 40 s on a fluted pedestal, diagonal glazing, a domed roof. A door leads out to the gallery.
  - Outside: storm swells with streaky foam (a shader on a bunched grid, ripples from a normal map), white water round the rocks, spray bursts, rain that never falls inside the tower, lightning with thunder delayed by distance, two light-shaft beams with spotlights, a ship's lights far out, the keeper's cottage.
  - Heights: the engine's floor height only depends on where you stand, so the room keeps a state (`LH_STATE`: ground, stair with an unwrapped angle, landing, top) and changes its walls with it. Teleport spots are getters that tell it where you land.
  - Sound: the storm through a filter that opens as you climb and go outside; wave booms, thunder, drips with a stone echo, the lens clockwork ticking, a distant ship's horn. No steady high tones.
- **Drive-in:** a giant weathered screen running a slideshow of landscape photos every 12 seconds with flicker and grain. Projector beam with dust and moths, booth and snack bar, a half-lit marquee, speaker poles, fog and fireflies. An old car with two people on the hood.

- **Step back from the site** (`95-site.js` plus a block at the end of the root `index.html`; pass 1 done): on the flat site, holding S for 0.65 s (or the "step inside" link in the footer) loads the gallery in an iframe with `?from=site`, sends it a snapshot of the screen (visible photo rects and URLs, header/footer text with fonts), and the gallery paints that onto a window on the lobby's entrance wall. The camera starts exactly where the window fills the screen, the page fades to the iframe, then the camera eases back into the hall. Walk up to the window and press E (or "Back to the site") to glide back in and hand back. Preview artifact with both sites: https://claude.ai/artifact/8XygPFzG71m9A7yMzVKcUA. Pass 2 (not done): fix an ~8 px offset at the hand-off, phone long-press, loading feedback.

- **Photos only where they're the point** (his call): photos stay in the Gallery (Osprey room and Globe Room), the Gathering, the Drive-in screen and the Moor's floating photos. Removed from the lobby, Lighthouse, Hawk Watch, Nature Train, Night Train (adverts only now), Pool and Apartments; their photo code is left in place with empty lists.

## His taste and how to work with him
- He's casual and types fast with typos. Change of direction mid-task is normal: fold it in and keep going.
- He wants things to look good and feel alive; "a sense of distance" and atmosphere matter to him.
- He dislikes:
  - effects over photos (shine, glare, refraction);
  - rounded or blurred photo edges;
  - generic layouts;
  - sudden, unrealistic motion;
  - things that look too clean or new.
- For subjective choices, show options side by side in plain language.
- Keep replies plain and short, and always tell him what you actually checked versus what you're assuming.
- He doesn't want much rigour on small changes ("no need to be too rigorous").

## Testing
- `python3 gallery-3d/build.py --test` writes `crowd-lab/v2/` with `window.__app` hooks. Serve the repo root with `python3 -m http.server 8000`.
- `cdp.py` is a small headless-Chrome driver with no dependencies. `ui_test.py` (desktop plus emulated phone touch), `collide_test.py`, `perf_after.py` and `sound_test.py` use it. The Chrome path is auto-detected.
- In a claude.ai cloud session: jsDelivr is blocked for the headless browser, so `npm pack three@0.165.0`, unpack it as `crowd-lab/three` and point the importmap in `crowd-lab/v2/index.html` at `/crowd-lab/three/` (test copy only). Point `cdp.CHROME` at `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` through a wrapper that adds `--no-sandbox`, use `Page(..., gpu=False)`, and set `NO_PROXY=127.0.0.1,localhost`. Delete `crowd-lab/` before committing.

## Ideas not done yet
- Nature Train: trestle bridges, tunnels, light shafts through the trees.
- Lighthouse: the Pool needs a new home if he wants it back (a second hall, or another door).
- Use real CC0 ambient recordings instead of synthesized sound.
- Captions for photos (each card already has an empty caption field, filled from photos.js).
- A nightclub room with dancing rigged characters.
- A "Walk the gallery" link on the real site.
- Make the characters match the more realistic train interior.
- Keep the city aligned with the train through bends.
