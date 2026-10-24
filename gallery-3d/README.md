# Walk-through gallery

The 3D gallery published as a claude.ai artifact. It's kept out of git
(listed in `.git/info/exclude`).

- `src/`: the page, in pieces, joined in filename order.
  - `00-head.html`: page shell and interface.
  - `10-core.js`: renderer, doorways, room loading, walking, sound mix and interface logic.
  - `20-people.js`: the characters.
  - `30-lobby.js`, then one file per room.
- `python build.py`: writes `out/index.html`, and copies the photos into `out/img` (1200 px) and `out/full`. The photo list comes from `../js/photos.js`.
- `python build.py --test`: also writes a copy with test hooks to `../crowd-lab/v2/` for the local server.
- `cdp.py`: a small headless-Chrome driver used by the tests (`ui_test.py`, `collide_test.py`, `perf_after.py`, `sound_test.py`). Run each test from this folder.
- `AUDIT.md`: the audit done before the refinement pass.
