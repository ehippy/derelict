#!/usr/bin/env python3
"""
Slice loosely-packed pixel-art spritesheets into pixel-tight crops.

Most itch.io-style asset packs (see packages/frontend/asset_zips/) do NOT
lay sprites out on a clean fixed grid -- padding varies, some frames are
wider than others (weapons, effects), and guessing a grid size produces
sprites that are chopped in half or include half of the neighboring frame.

This instead finds connected components of non-transparent pixels (4-way
flood fill over the alpha channel) and crops each one tightly. Works on
any spritesheet regardless of grid irregularity.

Usage:
    python3 extract_sprites.py <image.png> [<image2.png> ...] --out ./out [--min-area 15]

Requires Pillow. If not installed:
    python3 -m venv /tmp/spritevenv && /tmp/spritevenv/bin/pip install pillow
    /tmp/spritevenv/bin/python3 extract_sprites.py ...
"""
import argparse
import os
from collections import deque

from PIL import Image


def find_components(im, min_area):
    w, h = im.size
    px = im.load()
    visited = [[False] * w for _ in range(h)]
    boxes = []
    for y in range(h):
        for x in range(w):
            if visited[y][x] or px[x, y][3] == 0:
                continue
            q = deque([(x, y)])
            visited[y][x] = True
            minx = maxx = x
            miny = maxy = y
            area = 0
            while q:
                cx, cy = q.popleft()
                area += 1
                minx, maxx = min(minx, cx), max(maxx, cx)
                miny, maxy = min(miny, cy), max(maxy, cy)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if (
                        0 <= nx < w
                        and 0 <= ny < h
                        and not visited[ny][nx]
                        and px[nx, ny][3] != 0
                    ):
                        visited[ny][nx] = True
                        q.append((nx, ny))
            if area >= min_area:
                boxes.append((minx, miny, maxx + 1, maxy + 1))
    # roughly reading order: row band (8px buckets), then left-to-right
    boxes.sort(key=lambda b: (b[1] // 8, b[0]))
    return boxes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--out", default="./sprites_out")
    ap.add_argument(
        "--min-area",
        type=int,
        default=15,
        help="drop components smaller than this many pixels (anti-aliasing specks, stray pixels)",
    )
    args = ap.parse_args()

    for path in args.images:
        im = Image.open(path).convert("RGBA")
        boxes = find_components(im, args.min_area)
        stem = os.path.splitext(os.path.basename(path))[0].replace(" ", "_")
        outdir = os.path.join(args.out, stem)
        os.makedirs(outdir, exist_ok=True)
        for i, (x0, y0, x1, y1) in enumerate(boxes):
            crop = im.crop((x0, y0, x1, y1))
            crop.save(os.path.join(outdir, f"{stem}_{i:02d}_{x1-x0}x{y1-y0}.png"))
        print(f"{path}: {len(boxes)} sprites -> {outdir}")


if __name__ == "__main__":
    main()
