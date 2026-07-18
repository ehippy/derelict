#!/usr/bin/env node
/**
 * Build Pixi-format texture atlases from packages/frontend/asset_zips/.
 *
 * For each PNG spritesheet found:
 *   1. Look for a .aseprite file in the same directory, or failing that the
 *      nearest ancestor directory within the same pack (source folders often
 *      nest exported PNGs into "With Shadow/" / "Down/" / "Up/" subfolders
 *      one level below where the actual .aseprite source sits). Use it ONLY
 *      for metadata (canvas width/height, true frame count) -- never for
 *      pixel compositing, so indexed palettes / blend modes / hidden layers
 *      in the source file can't break this.
 *   2. If that metadata exists, describes an animation (numFrames > 1), and
 *      the PNG's dimensions divide evenly into that cell size -> grid-slice
 *      mode: frames are exact, uncropped cells (no jitter, no guessing).
 *   3. Otherwise -> flood-fill mode: connected-component analysis on the
 *      alpha channel finds each distinct sprite/tile/icon regardless of an
 *      irregular layout (tilesets, UI sheets, building sheets).
 *
 * The original PNG is copied as-is and used directly as the atlas texture --
 * nothing is re-composited or re-packed, so there's no room for the pipeline
 * itself to introduce visual bugs.
 *
 * Usage: node scripts/build-atlases.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const Aseprite = require("ase-parser");

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "asset_zips");
// public/ so Vite serves these as static files at /atlases/... and the
// runtime manifest loader can fetch them by URL without per-file imports.
const OUT_DIR = path.join(ROOT, "public", "atlases");
const MIN_COMPONENT_AREA = 8;

function slugify(s) {
  return s
    .replace(/\.(png|aseprite)$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function findFiles(dir, exts) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findFiles(full, exts)));
    } else if (exts.some((e) => entry.name.toLowerCase().endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

// Nearest .aseprite file for `dir`, checking `dir` itself then walking up
// parent directories, but never crossing above `packRoot`.
function findAseAncestor(dir, aseFilesByDir, packRoot) {
  let cur = dir;
  for (;;) {
    if (aseFilesByDir.has(cur)) return aseFilesByDir.get(cur);
    if (cur === packRoot) return null;
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

function readAseMeta(filePath) {
  const buff = fssync.readFileSync(filePath);
  const ase = new Aseprite(buff, path.basename(filePath));
  ase.parse();
  return { width: ase.width, height: ase.height, numFrames: ase.numFrames };
}

// 4-connectivity flood fill over the alpha channel of a raw RGBA buffer.
function findComponents(data, w, h, minArea) {
  const visited = new Uint8Array(w * h);
  const boxes = [];
  const alphaAt = (x, y) => data[(y * w + x) * 4 + 3];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx] || alphaAt(x, y) === 0) continue;

      let minx = x, maxx = x, miny = y, maxy = y, area = 0;
      const stack = [[x, y]];
      visited[idx] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        area++;
        if (cx < minx) minx = cx;
        if (cx > maxx) maxx = cx;
        if (cy < miny) miny = cy;
        if (cy > maxy) maxy = cy;
        const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nidx = ny * w + nx;
          if (visited[nidx] || alphaAt(nx, ny) === 0) continue;
          visited[nidx] = 1;
          stack.push([nx, ny]);
        }
      }
      if (area >= minArea) {
        boxes.push({ x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1 });
      }
    }
  }
  boxes.sort((a, b) => (a.y >> 3) - (b.y >> 3) || a.x - b.x);
  return boxes;
}

async function main() {
  const pngFiles = await findFiles(SRC_DIR, [".png"]);
  const aseFilesByDir = new Map();
  for (const f of await findFiles(SRC_DIR, [".aseprite"])) {
    const dir = path.dirname(f);
    if (!aseFilesByDir.has(dir)) aseFilesByDir.set(dir, f);
  }

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const manifest = [];
  let gridCount = 0, floodCount = 0, skipCount = 0;

  for (const pngPath of pngFiles) {
    const rel = path.relative(SRC_DIR, pngPath);
    const relParts = rel.split(path.sep);
    const packSlug = slugify(relParts[0]);
    // Slug from the FULL path within the pack, not just the basename --
    // sibling variant folders ("With Shadow" / "Without Shadow", "With
    // Sword" / "Without Sword") often share identical filenames, and a
    // basename-only slug collides and silently overwrites one variant.
    const fileSlug = slugify(relParts.slice(1).join("-")) || "sheet";
    const dir = path.dirname(pngPath);
    const packRoot = path.join(SRC_DIR, relParts[0]);

    const img = sharp(pngPath);
    const meta = await img.metadata();
    const { width: pngW, height: pngH } = meta;
    if (!pngW || !pngH) { skipCount++; continue; }

    let mode, frames;
    const asePath = findAseAncestor(dir, aseFilesByDir, packRoot);
    let aseMeta = null;
    if (asePath) {
      try {
        aseMeta = readAseMeta(asePath);
      } catch (e) {
        // unreadable source file (unsupported chunk, etc.) -- fall through to flood-fill
      }
    }

    if (
      aseMeta &&
      aseMeta.numFrames > 1 &&
      aseMeta.width > 0 &&
      aseMeta.height > 0 &&
      pngW % aseMeta.width === 0 &&
      pngH % aseMeta.height === 0 &&
      (pngW / aseMeta.width) * (pngH / aseMeta.height) >= aseMeta.numFrames
    ) {
      mode = "grid";
      const cols = pngW / aseMeta.width;
      frames = [];
      for (let i = 0; i < aseMeta.numFrames; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        frames.push({ x: col * aseMeta.width, y: row * aseMeta.height, w: aseMeta.width, h: aseMeta.height });
      }
      gridCount++;
    } else {
      const { data } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      frames = findComponents(data, pngW, pngH, MIN_COMPONENT_AREA);
      mode = "flood";
      floodCount++;
    }

    if (frames.length === 0) { skipCount++; continue; }

    const outSubdir = path.join(OUT_DIR, packSlug);
    await fs.mkdir(outSubdir, { recursive: true });
    const outPngName = `${fileSlug}.png`;
    await fs.copyFile(pngPath, path.join(outSubdir, outPngName));

    const frameEntries = {};
    frames.forEach((f, i) => {
      frameEntries[`${fileSlug}_${String(i).padStart(3, "0")}`] = {
        frame: { x: f.x, y: f.y, w: f.w, h: f.h },
        spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
        sourceSize: { w: f.w, h: f.h },
      };
    });
    const atlasJson = {
      frames: frameEntries,
      meta: { image: outPngName, size: { w: pngW, h: pngH }, scale: 1, mode, sourcePath: rel },
    };
    const outJsonPath = path.join(outSubdir, `${fileSlug}.json`);
    await fs.writeFile(outJsonPath, JSON.stringify(atlasJson, null, 2));

    manifest.push({
      pack: packSlug,
      name: fileSlug,
      atlas: `${packSlug}/${fileSlug}.json`,
      image: `${packSlug}/${outPngName}`,
      mode,
      frameCount: frames.length,
      sourcePath: rel,
    });
  }

  await fs.writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`Processed ${pngFiles.length} PNGs -> ${manifest.length} atlases (${gridCount} grid, ${floodCount} flood-fill, ${skipCount} skipped)`);
  console.log(`Output: ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
