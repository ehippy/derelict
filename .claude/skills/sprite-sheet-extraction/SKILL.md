---
name: sprite-sheet-extraction
description: Extract clean, pixel-tight sprites from the pixel-art asset packs in packages/frontend/asset_zips/ and build Pixi.js-ready texture atlases from them. Use when asked to inspect, slice, catalog, or prototype with a sprite/tileset pack, to (re)run the asset pipeline after adding a new pack, or to check whether an asset pack "works" before wiring it into real game code.
---

# Sprite sheet extraction

## The production pipeline (use this first)

`packages/frontend/scripts/build-atlases.mjs` already exists and has been
run against every pack in `asset_zips/`. Output lives in
`packages/frontend/public/atlases/<pack-slug>/` (one `.png` + `.json` per
source sheet, Pixi/TexturePacker-format atlas JSON) plus a top-level
`manifest.json` indexing all of them. Re-run it any time a pack is added
or changed:

```bash
cd packages/frontend
node scripts/build-atlases.mjs
```

**Browse the results live**: `/sprite-lab` route in the frontend app
(`app/sprite-lab/page.tsx`) fetches the manifest and renders any atlas as
a real Pixi `AnimatedSprite`, cycling through its frames -- the fastest
way to confirm a sheet composited cleanly without writing throwaway code.
`pnpm --filter frontend dev` (or `node_modules/.bin/vite` from
`packages/frontend` if `pnpm` isn't on PATH) and open
`http://localhost:3000/sprite-lab`.

### How it decides frame boundaries

For each PNG, it looks for a sibling `.aseprite` file in the same source
directory and uses `ase-parser` (pure JS, `npm i ase-parser`) to read
**metadata only** -- canvas width/height and true frame count. It never
touches `ase-parser`'s cel/layer pixel data, so indexed palettes, hidden
layers, and blend modes in the source file can't break it.

- **Grid-slice mode**: if the `.aseprite` says `numFrames > 1` and the
  PNG's dimensions divide evenly into that cell size with enough cells to
  hold every frame, slice it into exact, uncropped `cellW x cellH` cells,
  row-major, first `numFrames` of them. Every frame is anchored at the
  same origin as the artist's canvas, so multi-frame animations play back
  with zero jitter -- no need to touch cel-level compositing at all.
- **Flood-fill mode** (fallback: no `.aseprite`, single-frame source, or
  the grid math doesn't fit): 4-connectivity BFS over the alpha channel
  finds each distinct blob of pixels and crops to its tight bounding box.
  Right tool for tilesets, UI icon sheets, and building sheets where
  sprites are scattered, not animated.

The original PNG is always copied as-is and used directly as the atlas
texture -- nothing is ever re-composited, so the pipeline itself can't
introduce a visual bug in the pixels, only in the frame rects.

### Known pitfalls (already fixed, don't reintroduce)

- **Slug by full relative path, not basename.** Packs routinely ship
  sibling variant folders with identical filenames -- `With Shadow/` vs
  `Without Shadow/`, `With Sword/` vs `Without Sword (for gun)/`. Slugging
  by `path.basename()` alone collides and silently overwrites one
  variant's output on disk. Slug from every path segment under the pack
  root.
- **`@derelict/shared` must be built before the frontend dev server will
  run at all**: `cd packages/shared && npx tsc`. Its `package.json`
  `exports` point at `dist/`, which doesn't exist until you build it --
  Vite's import-analysis then fails on an unrelated component
  (`CharacterCreationWizard.tsx`) that imports it, and the error overlay
  blocks every route, not just the one you're working on. This is a
  pre-existing repo gap, not specific to the asset pipeline, but it'll
  block verifying anything in the frontend dev server until it's built
  once.
- Repo has no Python tooling of its own (pnpm/TS monorepo) -- the pipeline
  is pure Node (`ase-parser` + `sharp`) for exactly this reason. Don't add
  a Python dependency to the real pipeline.

## Quick one-off inspection (no pipeline run needed)

For eyeballing a single sheet without regenerating atlases, the
flood-fill-only extractor still works and needs no source `.aseprite`:
`extract_sprites.py` in this skill folder.

```bash
python3 -m venv /tmp/spritevenv && /tmp/spritevenv/bin/pip install -q pillow
/tmp/spritevenv/bin/python3 .claude/skills/sprite-sheet-extraction/extract_sprites.py \
  "packages/frontend/asset_zips/01 Stranded - Starter Pack v1.1/Hero/Hero/Hero spritesheet BLUE with shadow.png" \
  --out /tmp/sprites_out
```

Output: one subfolder per input sheet, every detected sprite as
`{name}_{index}_{w}x{h}.png`, sorted in roughly reading order. Read a
handful with the `Read` tool (renders PNGs inline) to pick frames by eye.
This is scratch-space tooling, not part of the real build -- use the
Node pipeline above for anything that needs to end up in the game.

## Asset inventory in this repo (`packages/frontend/asset_zips/`)

All "Stranded" survival series (artist: Penusbmic), all unzipped, all
processed by the pipeline (253 source PNGs -> 241 atlases; a handful of
near-empty UI icon sprites fall under the flood-fill minimum-area
threshold and are skipped -- harmless, not a bug):

- `01 Stranded - Starter Pack v1.1` -- top-down. Hero (4 color variants +
  gun sprite), Companion (near-transparent wisp/ghost, mostly just eyes --
  don't expect a solid sprite from this one), 3 enemy types
  (Archer/Warrior/Guard), rocky/ash ground tileset, campfire, poles,
  ring-eyed lantern creatures.
- `Stranded Pack 3` (unzipped to a bare top-level `Enemies/` folder, not
  its own pack dir -- watch for this if re-unzipping) -- Tribe
  Hunter/Warrior/Tamed Beast, top-down.
- `Stranded 04 - Hero sprite`, `06 Stranded -Dust Jumper`,
  `Blood ForestDesert`, `Stranded - Animal Pack 1` (includes a
  **Sci-fi Boar** and **Sci-fi Rabbit** -- notable, actual sci-fi content
  in an otherwise fantasy-coded pack), `Stranded - Merchants`,
  `STRANDED - Farm Crops 1`, `STRANDED UI PACK` -- all top-down, all
  processed.
- `STRANDED - Isometric Sci-fi buildings` -- **isometric**, not top-down.
  Whole-building exteriors (Gun Shop, Medic Shop, Restaurant, Shed,
  Lookout Tower) for a settlement/overworld map, not a room-interior
  tileset. Doesn't tile against the top-down ground tileset -- different
  projection entirely. Still processed by the pipeline (flood-fill mode,
  one sprite per building), just don't expect it to compose with the rest.

**License**: each pack ships its own `read me - license.txt` -- check it
per-pack rather than assuming. The starter pack's terms: commercial use
permitted, credit to Penusbmic optional, don't resell the assets
individually.

**Known gap, unchanged**: nothing in this collection reads as a sci-fi
ship/station *interior* (corridors, airlocks, control rooms) -- the
top-down packs are exterior/planet-surface, the isometric pack is
exterior settlement buildings. If the game direction needs generated ship
interiors, that tileset doesn't exist here yet.
