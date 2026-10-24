# Gallery audit (before the refinement pass)

Rooms today: **Gallery** (Osprey crowd), **Globe room**, **Moor** (side door), **Pool yard** (gate). The overlook, subway and drive-in you asked for don't exist yet. I'll build them inside the new structure rather than bolt them on.

## Frame rates (measured, 4 s each)

| Room | Desktop (RX 9070 XT, 1382×704) | Phone stand-in (390×844 @3×, CPU slowed 6×) |
|---|---|---|
| Gallery | 120 (capped) | **51**, worst frame 25 ms |
| Globe room | 120 | 65 |
| Moor | 120 | 120 |
| Pool | 120 | 117 |

Your desktop GPU caps everything at 120, so the phone stand-in is the useful number. The Gallery is the heaviest place by far. That's mostly CPU: 21 characters made of ~60 separate meshes each, plus 247 globe cards and per-frame JavaScript. The outdoor rooms are cheap only because the Gallery isn't drawn while you're out there.

No console errors or warnings in any room.

## What works
- The chunky character style and the posing (reach-based hands, pushing people around, the laugher).
- The moor's mood (moon, mist, bats, fireflies, lone door) and the pool's rain/fill event.
- "Doors as windows": each outdoor area is its own scene, seen only through its doorway, so lighting never leaks between rooms.
- The synthesized sound (murmur, crickets, wind, owl, dog, pump, rain), positioned in 3D.

## What's off

**Layout and world**
- There's no hub. The Gallery doubles as a junction, with a moor door and a pool gate in its side walls; that reads as accidental.
- No signs on doorways. Nothing tells you where a door goes.
- Transitions hard-cut: fog, light and sound switch the moment you cross a door.
- Looking back through one door from a second room shows nothing through the first room's other doors (no nested views).

**Photos**
- Inconsistent: Gallery, globe and moor photos are unlit but **fogged**, so far ones go grey. Pool murals are **lit** by the pool lamp, which shifts their colour.
- Labels exist only in the Gallery (and the text is too small to read). There are no labels on the globe, moor or pool photos.
- No way to look at a photo properly: no info overlay, no full-screen view.
- The Osprey crowd and the laugher stand in front of photos from the natural viewing spots.

**Scale and style**
- Mostly consistent: 2.4 m doors, 1.62 m eye height, characters ~1.8 m. Frame sizes vary at random (0.6 to 2.1 m) with no rule.
- The Gallery ceiling renders pure black, and the wall "light pools" are painted on with no real light behind them.
- Some style mismatches: the pool's fine tile texture next to flat untextured walls; the moor's spike-like grass.

**Controls**
- Drag-to-look only, with no mouse capture. "Click the room" isn't obvious.
- On phones: an arrow pad, not a joystick. It's never been tested with real touch events.
- No reduce-motion option, no way back to a start point, no settings, no title screen, nothing remembered between visits.
- The hint line is too long for a phone.

**Performance and loading**
- Everything (all rooms, ~5 MB of photos) builds at page load, with no loading feedback.
- Two shadow-casting lights; no quality levels.
- Characters aren't merged; globe cards are 247 separate meshes.

**Sound**
- Each room's bus was levelled by hand (Gallery murmur ≈ −32 dB, moor ≈ −29 dB, pool dry ≈ −38 dB, raining ≈ −27 dB); there's no master limiter.
- Sound on/off is the only control. Crossfades only happen near the side walls.

**Bugs**
- Testing hooks (`window.__lab`) are left exposed.
- People can be shoved through doorways and end up outdoors.
- In the pool, when the camera crosses the gate the yard can pop for one frame.

## Plan
1. A new **octagonal lobby** with signposted doors and short vestibules, where light, fog and sound blend.
2. A portal system for many rooms, with rooms that load on approach and unload when far away.
3. One true-colour photo system: per-room labels, an info overlay, and a full-screen viewer.
4. Quality tiers, a title screen, a settings menu, a touch joystick, and reduce motion.
5. Rooms: Gallery, Globe room, Moor and Pool ported and polished; Overlook, Subway and Drive-in built new.
