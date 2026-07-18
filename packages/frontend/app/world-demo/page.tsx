import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, extend } from "@pixi/react";
import {
  AnimatedSprite,
  Assets,
  Container,
  FederatedPointerEvent,
  Graphics,
  Sprite,
  Texture,
  TextureSource,
} from "pixi.js";

extend({ Container, Sprite, AnimatedSprite, Graphics });

// Pixel-art atlas frames sit edge-to-edge with no padding between them;
// the default 'linear' filtering bilinear-samples a sliver of the
// neighboring frame at every tile boundary, which reads as a faint grid
// of seams across the floor. Nearest-neighbor filtering samples exactly
// one texel and never crosses a frame boundary.
TextureSource.defaultOptions.scaleMode = "nearest";

const TILE = 16;
// 10x the original 120x80 (9600 tile) map area.
const COLS = 380;
const ROWS = 253;
const WORLD_SCALE = 2;
const STEP_MS = 120;
const CRITTER_STEP_MS = 380; // slower, more ambient than the player
const CRITTER_WANDER_RADIUS = 4; // tiles from spawn point
const FLOOR_POOL_MARGIN = 3; // extra tiles of floor pool beyond the viewport, for scroll slack

const WORLD_PX_W = COLS * TILE;
const WORLD_PX_H = ROWS * TILE;

const TILESET_ATLAS = "/atlases/01-stranded-starter-pack-v1-1/tileset-tileset.json";

const frame = (i: number) => `tileset-tileset_${String(i).padStart(3, "0")}`;
const FLOOR_FRAME = frame(0);
// Two rock groups (23x21 chunky, 23x13 flatter) from the base kit's tileset.
const BASE_ROCK_FRAMES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(frame);
// Pebbles + a ground scratch decal -- decorative, non-blocking.
const BASE_DECOR_FRAMES = [13, 14, 15, 16, 17].map(frame);
// Ring-eyed lantern hulks (4 color variants) + the tall pole.
const BASE_LANDMARK_FRAMES = [26, 27, 34, 35, 36].map(frame);
const SETTLEMENT_MARKER_FRAME = frame(36); // the tall pole, reused as a camp marker
const ALL_TILESET_FRAMES = [
  FLOOR_FRAME,
  ...BASE_ROCK_FRAMES,
  ...BASE_DECOR_FRAMES,
  ...BASE_LANDMARK_FRAMES,
  SETTLEMENT_MARKER_FRAME,
];

// No sprite for water in any processed pack (checked -- see sprite-sheet-
// extraction skill notes). Placeholder: Texture.WHITE tinted blue rather
// than an art asset.
const WATER_TINT = 0x2c5f74;

// "Stranded 04 - Hero sprite" (sword variant) -- real per-direction idle
// and move animations, unlike the starter pack's single mystery-direction
// hero. Each lives in its own atlas file. No true left/right split exists;
// "side" is shared and mirrored via scale.x for the opposite direction.
type HeroDir = "down" | "up" | "side";
type HeroMode = "idle" | "move" | "attack";
type HeroAnims = Record<HeroDir, Record<HeroMode, Texture[]>>;
const HERO_ANIM_ENTRIES: { dir: HeroDir; mode: HeroMode; atlas: string }[] = [
  { dir: "down", mode: "idle", atlas: "/atlases/stranded-04-hero-sprite/with-sword-down-04-stranded-pack-4-back-up-idle-down.json" },
  { dir: "down", mode: "move", atlas: "/atlases/stranded-04-hero-sprite/with-sword-down-04-stranded-pack-4-back-up-move-down.json" },
  { dir: "down", mode: "attack", atlas: "/atlases/stranded-04-hero-sprite/with-sword-down-04-stranded-pack-4-back-up-slash-down.json" },
  { dir: "up", mode: "idle", atlas: "/atlases/stranded-04-hero-sprite/with-sword-up-04-stranded-pack-4-back-up-idle-up.json" },
  { dir: "up", mode: "move", atlas: "/atlases/stranded-04-hero-sprite/with-sword-up-04-stranded-pack-4-back-up-move-up.json" },
  { dir: "up", mode: "attack", atlas: "/atlases/stranded-04-hero-sprite/with-sword-up-attack-slash-up.json" },
  { dir: "side", mode: "idle", atlas: "/atlases/stranded-04-hero-sprite/with-sword-right-left-idle-left-right.json" },
  { dir: "side", mode: "move", atlas: "/atlases/stranded-04-hero-sprite/with-sword-right-left-r-move.json" },
  { dir: "side", mode: "attack", atlas: "/atlases/stranded-04-hero-sprite/with-sword-right-left-r-slash.json" },
];
const ATTACK_DURATION_MS = 420;
const ATTACK_RANGE = 1; // Chebyshev distance (any of 8 neighbors counts as adjacent)
const ENEMY_AGGRO_RADIUS = 6;
const ENEMY_LEASH_RADIUS = 11;
const ENEMY_STEP_MS = 260;
const ENEMY_ATTACK_COOLDOWN_MS = 700;
const CRITTER_FLEE_RADIUS = 3;

// Branching out past the starter pack: Blood Forest/Desert (trees, statue,
// skull, rocks) and the loose "Enemies" pack (Tribe Warrior/Hunter) -- each
// lives in its own atlas file (one PNG per source sprite), unlike the
// tileset which packs everything into one sheet, so each needs its own
// Assets.load call. Single static frame each -- these are scenery, not
// animated.
type PropKind = "landmark" | "obstacle";
const EXTRA_PROPS: { id: string; atlas: string; frame: string; kind: PropKind }[] = [
  { id: "tree1", atlas: "/atlases/blood-forestdesert/separate-sprites-tree1.json", frame: "separate-sprites-tree1_000", kind: "landmark" },
  { id: "tree2", atlas: "/atlases/blood-forestdesert/separate-sprites-tree2.json", frame: "separate-sprites-tree2_000", kind: "landmark" },
  { id: "tree4", atlas: "/atlases/blood-forestdesert/separate-sprites-tree4.json", frame: "separate-sprites-tree4_000", kind: "landmark" },
  { id: "tree5", atlas: "/atlases/blood-forestdesert/separate-sprites-tree5.json", frame: "separate-sprites-tree5_000", kind: "landmark" },
  { id: "statue", atlas: "/atlases/blood-forestdesert/separate-sprites-statue.json", frame: "separate-sprites-statue_000", kind: "landmark" },
  { id: "skull", atlas: "/atlases/blood-forestdesert/separate-sprites-skull.json", frame: "separate-sprites-skull_000", kind: "landmark" },
  { id: "bigrock", atlas: "/atlases/blood-forestdesert/separate-sprites-big-rock.json", frame: "separate-sprites-big-rock_000", kind: "landmark" },

  { id: "smallrock0", atlas: "/atlases/blood-forestdesert/separate-sprites-small-rocks.json", frame: "separate-sprites-small-rocks_000", kind: "obstacle" },
  { id: "smallrock2", atlas: "/atlases/blood-forestdesert/separate-sprites-small-rocks.json", frame: "separate-sprites-small-rocks_002", kind: "obstacle" },
  { id: "forestpole", atlas: "/atlases/blood-forestdesert/separate-sprites-forest-pole-1.json", frame: "separate-sprites-forest-pole-1_000", kind: "obstacle" },
];

const LANDMARK_POOL = [...BASE_LANDMARK_FRAMES, ...EXTRA_PROPS.filter((p) => p.kind === "landmark").map((p) => p.id)];
const OBSTACLE_POOL = [...BASE_ROCK_FRAMES, ...EXTRA_PROPS.filter((p) => p.kind === "obstacle").map((p) => p.id)];
const DECOR_POOL = BASE_DECOR_FRAMES;

// Animal Pack -- each species gets its real idle AND move/walk frame
// sequences loaded (not just one static crop), swapped based on wander
// state. Rabbit has no dedicated idle sheet, so "eat" stands in for its
// stationary pose -- a grazing animation while idle is thematically fine.
const CRITTER_SPECIES: { id: string; idleAtlas: string; moveAtlas: string }[] = [
  { id: "sheep", idleAtlas: "/atlases/stranded-animal-pack-1/sheep-sheep-idle.json", moveAtlas: "/atlases/stranded-animal-pack-1/sheep-sheep-move.json" },
  { id: "chicken", idleAtlas: "/atlases/stranded-animal-pack-1/chicken-chicken-idle.json", moveAtlas: "/atlases/stranded-animal-pack-1/chicken-chicken-move.json" },
  { id: "boar", idleAtlas: "/atlases/stranded-animal-pack-1/sci-fi-boar-sci-fi-boar-idle.json", moveAtlas: "/atlases/stranded-animal-pack-1/sci-fi-boar-sci-fi-boar-walk.json" },
  { id: "rabbit", idleAtlas: "/atlases/stranded-animal-pack-1/sci-fi-rabbit-eat.json", moveAtlas: "/atlases/stranded-animal-pack-1/sci-fi-rabbit-sci-fi-rabbit-move.json" },
];
const CRITTER_POOL = CRITTER_SPECIES.map((s) => s.id);
const CRITTER_HP = 1; // one hit from anything (hero doesn't currently attack them, enemies do)
type CritterAnims = { idle: Texture[]; move: Texture[] };

// The loose "Enemies" pack (Tribe Warrior/Hunter) -- now real mobs instead
// of static landmarks: idle until something gets close, then chase (the
// hero, or the nearest critter -- whichever is closer), and can be fought.
// Tribe Hunter's "death" sheet turned out to be badly fragmented by the
// flood-fill pass (mostly noise specks, verified by eye) -- no death entry
// for it, so it just fades out on death instead of playing something
// broken. Tribe Warrior's death sheet is clean.
type EnemyAnimKind = "idle" | "walk" | "death";
const ENEMY_ANIM_ENTRIES: { species: string; kind: EnemyAnimKind; atlas: string }[] = [
  { species: "warrior", kind: "idle", atlas: "/atlases/enemies/tribe-warrior-tribe-warrior-idle.json" },
  { species: "warrior", kind: "walk", atlas: "/atlases/enemies/tribe-warrior-tribe-warrior-walk.json" },
  { species: "warrior", kind: "death", atlas: "/atlases/enemies/tribe-warrior-tribe-warrior-death.json" },
  { species: "hunter", kind: "idle", atlas: "/atlases/enemies/tribe-hunter-tribe-hunter-idle.json" },
  { species: "hunter", kind: "walk", atlas: "/atlases/enemies/tribe-hunter-tribe-hunter-walk.json" },
];
const ENEMY_HP: Record<string, number> = { warrior: 3, hunter: 2 };
const ENEMY_POOL = Array.from(new Set(ENEMY_ANIM_ENTRIES.map((e) => e.species)));
type EnemyAnims = { idle: Texture[]; walk: Texture[]; death: Texture[] | null };

// "Stranded - Merchants": vendors for settlements. Each of the 4 merchant
// types ships its own .aseprite one level ABOVE the "With Shadow"/"Without
// Shadow" PNG subfolders, which the pipeline's same-directory-only aseprite
// matching couldn't see -- fixed to search ancestor directories, but the
// "01 Traveler Merchant" sheet still doesn't grid-slice cleanly (its
// exported PNG is a tightly trimmed strip, not full-canvas cells) and its
// flood-fill result is a merged multi-pose blob (verified by eye). Skipped;
// the other three merchants are clean.
const VENDOR_SPECIES: { id: string; atlas: string }[] = [
  { id: "skull-blue", atlas: "/atlases/stranded-merchants/02-skull-merchant-with-shadow-02-skull-merchant-idle-blue.json" },
  { id: "skull-red", atlas: "/atlases/stranded-merchants/02-skull-merchant-with-shadow-02-skull-merchant-idle-red.json" },
  { id: "skull-green", atlas: "/atlases/stranded-merchants/02-skull-merchant-with-shadow-02-skull-merchant-idle-green.json" },
  { id: "fruit-blue", atlas: "/atlases/stranded-merchants/03-fruit-merchant-with-shadow-03-fruit-merchant-blue.json" },
  { id: "fruit-red", atlas: "/atlases/stranded-merchants/03-fruit-merchant-with-shadow-03-fruit-merchant-red.json" },
  { id: "fruit-green", atlas: "/atlases/stranded-merchants/03-fruit-merchant-with-shadow-03-fruit-merchant-green.json" },
  { id: "bread-blue", atlas: "/atlases/stranded-merchants/04-bread-merchant-with-shadow-04-bread-merchant-blue.json" },
  { id: "bread-red", atlas: "/atlases/stranded-merchants/04-bread-merchant-with-shadow-04-bread-merchant-red.json" },
  { id: "bread-green", atlas: "/atlases/stranded-merchants/04-bread-merchant-with-shadow-04-bread-merchant-green.json" },
];
const VENDOR_POOL = VENDOR_SPECIES.map((s) => s.id);

// World-gen tuning for lakes/settlements -- scaled to map area so a bigger
// world gets proportionally more of both.
const LAKE_COUNT = Math.max(5, Math.round((COLS * ROWS) / 12000));
const LAKE_MIN_SIZE = 50;
const LAKE_MAX_SIZE = 130;
const LAKE_MIN_SPACING = 35;
const LAKE_MIN_DIST_FROM_SPAWN = 18;
const SETTLEMENT_COUNT = Math.max(4, Math.round((COLS * ROWS) / 20000));
const SETTLEMENT_RADIUS = 5;
const SETTLEMENT_MIN_SPACING = 40;
const SETTLEMENT_MIN_DIST_FROM_SPAWN = 15;

type Tile = { x: number; y: number; frame: string };
type Grid = boolean[][]; // [row][col] -> walkable

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const chebyshev = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.max(Math.abs(Math.round(a.x) - Math.round(b.x)), Math.abs(Math.round(a.y) - Math.round(b.y)));
const tileKey = (x: number, y: number) => x + "," + y;

// Organic-ish blob via randomized frontier growth -- cheap, no dependencies.
function growBlob(rand: () => number, cx: number, cy: number, targetSize: number) {
  const tiles = new Set<string>([tileKey(cx, cy)]);
  const frontier = [{ x: cx, y: cy }];
  let guard = targetSize * 20;
  while (tiles.size < targetSize && frontier.length > 0 && guard-- > 0) {
    const idx = Math.floor(rand() * frontier.length);
    const cur = frontier[idx];
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rand() * 4)];
    const nx = cur.x + dx;
    const ny = cur.y + dy;
    if (nx < 2 || ny < 2 || nx >= COLS - 2 || ny >= ROWS - 2) continue;
    const k = tileKey(nx, ny);
    if (!tiles.has(k)) {
      tiles.add(k);
      frontier.push({ x: nx, y: ny });
    }
    if (rand() < 0.12) frontier.splice(idx, 1); // retire frontier points so it doesn't spike into a thin line
  }
  return Array.from(tiles).map((k) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  });
}

function generateWorld(seed: number) {
  const rand = mulberry32(seed);
  const grid: Grid = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
  const obstacles: Tile[] = [];
  const decor: Tile[] = [];
  const critters: { id: string; x: number; y: number; kind: string }[] = [];
  const enemies: { id: string; x: number; y: number; kind: string }[] = [];
  const vendors: { id: string; x: number; y: number; kind: string }[] = [];
  const spawnCol = Math.floor(COLS / 2);
  const spawnRow = Math.floor(ROWS / 2);
  const spawn = { x: spawnCol, y: spawnRow };

  // --- lakes ---
  const waterSet = new Set<string>();
  const lakeCenters: { x: number; y: number }[] = [];
  for (let i = 0; i < LAKE_COUNT; i++) {
    let center: { x: number; y: number } | null = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const cx = 6 + Math.floor(rand() * (COLS - 12));
      const cy = 6 + Math.floor(rand() * (ROWS - 12));
      if (chebyshev({ x: cx, y: cy }, spawn) < LAKE_MIN_DIST_FROM_SPAWN) continue;
      if (lakeCenters.some((c) => chebyshev({ x: cx, y: cy }, c) < LAKE_MIN_SPACING)) continue;
      center = { x: cx, y: cy };
      break;
    }
    if (!center) continue;
    lakeCenters.push(center);
    const size = LAKE_MIN_SIZE + Math.floor(rand() * (LAKE_MAX_SIZE - LAKE_MIN_SIZE));
    for (const t of growBlob(rand, center.x, center.y, size)) waterSet.add(tileKey(t.x, t.y));
  }

  // --- settlements (cleared zones with vendors, always land) ---
  const settlementCenters: { x: number; y: number }[] = [];
  const clearedSet = new Set<string>();
  for (let i = 0; i < SETTLEMENT_COUNT; i++) {
    let center: { x: number; y: number } | null = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const cx = 8 + Math.floor(rand() * (COLS - 16));
      const cy = 8 + Math.floor(rand() * (ROWS - 16));
      if (chebyshev({ x: cx, y: cy }, spawn) < SETTLEMENT_MIN_DIST_FROM_SPAWN) continue;
      if (settlementCenters.some((c) => chebyshev({ x: cx, y: cy }, c) < SETTLEMENT_MIN_SPACING)) continue;
      center = { x: cx, y: cy };
      break;
    }
    if (!center) continue;
    settlementCenters.push(center);
    for (let dy = -SETTLEMENT_RADIUS; dy <= SETTLEMENT_RADIUS; dy++) {
      for (let dx = -SETTLEMENT_RADIUS; dx <= SETTLEMENT_RADIUS; dx++) {
        const tx = center.x + dx;
        const ty = center.y + dy;
        if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
        const k = tileKey(tx, ty);
        clearedSet.add(k);
        waterSet.delete(k); // settlements are always dry, even if a lake blob reached here
      }
    }
  }

  // marker pole + vendors at each settlement
  for (const center of settlementCenters) {
    obstacles.push({ x: center.x, y: center.y, frame: SETTLEMENT_MARKER_FRAME });
    grid[center.y][center.x] = false;
    const vendorOffsets = [
      { x: -2, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ];
    for (const off of vendorOffsets) {
      const vx = center.x + off.x;
      const vy = center.y + off.y;
      if (vx < 0 || vy < 0 || vx >= COLS || vy >= ROWS) continue;
      vendors.push({ id: `v${vendors.length}`, x: vx, y: vy, kind: VENDOR_POOL[Math.floor(rand() * VENDOR_POOL.length)] });
      grid[vy][vx] = false;
    }
  }

  // --- scatter obstacles/decor/critters/enemies over everything else ---
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const nearSpawn = Math.abs(x - spawnCol) <= 2 && Math.abs(y - spawnRow) <= 2;
      if (nearSpawn) continue;
      const k = tileKey(x, y);
      if (waterSet.has(k)) {
        grid[y][x] = false;
        continue;
      }
      if (clearedSet.has(k)) continue; // settlement interior: floor only, no scatter

      const roll = rand();
      if (roll < 0.003) {
        // rare landmark -- blocks its own tile only, footprint is visual
        grid[y][x] = false;
        obstacles.push({ x, y, frame: LANDMARK_POOL[Math.floor(rand() * LANDMARK_POOL.length)] });
      } else if (roll < 0.03) {
        // sparse: open ground is the default, not obstacles.
        grid[y][x] = false;
        obstacles.push({ x, y, frame: OBSTACLE_POOL[Math.floor(rand() * OBSTACLE_POOL.length)] });
      } else if (roll < 0.033) {
        enemies.push({
          id: `e${enemies.length}`,
          x,
          y,
          kind: ENEMY_POOL[Math.floor(rand() * ENEMY_POOL.length)],
        });
      } else if (roll < 0.038) {
        critters.push({
          id: `c${critters.length}`,
          x,
          y,
          kind: CRITTER_POOL[Math.floor(rand() * CRITTER_POOL.length)],
        });
      } else if (roll < 0.063) {
        decor.push({ x, y, frame: DECOR_POOL[Math.floor(rand() * DECOR_POOL.length)] });
      }
    }
  }

  const water = Array.from(waterSet).map((k) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  });

  return { grid, obstacles, decor, critters, enemies, vendors, water, settlements: settlementCenters, spawn };
}

function bfsPath(grid: Grid, start: { x: number; y: number }, goal: { x: number; y: number }) {
  if (!grid[goal.y]?.[goal.x]) return null;
  if (start.x === goal.x && start.y === goal.y) return [];
  const key = (p: { x: number; y: number }) => p.y * COLS + p.x;
  const visited = new Set([key(start)]);
  const prev = new Map<number, { x: number; y: number }>();
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: { x: number; y: number }[] = [];
      let c = cur;
      while (key(c) !== key(start)) {
        path.unshift(c);
        c = prev.get(key(c))!;
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (!grid[ny][nx]) continue;
      const nk = ny * COLS + nx;
      if (visited.has(nk)) continue;
      visited.add(nk);
      prev.set(nk, cur);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

type CritterState = {
  kind: string;
  home: { x: number; y: number };
  pos: { x: number; y: number };
  target: { x: number; y: number } | null;
  stepElapsed: number;
  idleUntil: number;
  facing: number;
  mode: "idle" | "move";
  modeDirty: boolean;
  hp: number;
  hitFlashUntil: number;
  dead: boolean;
  deathElapsed: number;
};

type EnemyMode = "idle" | "chase" | "dead";
type EnemyState = {
  kind: string;
  home: { x: number; y: number };
  pos: { x: number; y: number };
  target: { x: number; y: number } | null;
  stepElapsed: number;
  facing: number;
  mode: EnemyMode;
  modeDirty: boolean;
  hp: number;
  hitFlashUntil: number;
  deathElapsed: number;
  chaseKind: "hero" | "critter" | null;
  chaseCritterId: string | null;
  attackCooldown: number;
};

type CompassInfo = { dx: number; dy: number; dist: number } | null;

function World({ seed, onCompassUpdate }: { seed: number; onCompassUpdate: (c: CompassInfo) => void }) {
  const [floorTex, setFloorTex] = useState<Texture | null>(null);
  const [propTex, setPropTex] = useState<Record<string, Texture> | null>(null);
  const [heroTex, setHeroTex] = useState<HeroAnims | null>(null);
  const heroTexRef = useRef<HeroAnims | null>(null);
  useEffect(() => {
    heroTexRef.current = heroTex;
  }, [heroTex]);
  const [critterTex, setCritterTex] = useState<Record<string, CritterAnims> | null>(null);
  const critterTexRef = useRef<Record<string, CritterAnims> | null>(null);
  useEffect(() => {
    critterTexRef.current = critterTex;
  }, [critterTex]);
  const [enemyTex, setEnemyTex] = useState<Record<string, EnemyAnims> | null>(null);
  const enemyTexRef = useRef<Record<string, EnemyAnims> | null>(null);
  useEffect(() => {
    enemyTexRef.current = enemyTex;
  }, [enemyTex]);
  const [vendorTex, setVendorTex] = useState<Record<string, Texture[]> | null>(null);

  const worldRef = useRef<Container | null>(null);
  const heroRef = useRef<AnimatedSprite | null>(null);
  const heroDirRef = useRef<HeroDir>("down");
  const heroModeRef = useRef<HeroMode>("idle");
  const heroAnimDirtyRef = useRef(false);
  const heroAttackRef = useRef<{ targetId: string; elapsed: number } | null>(null);
  const pendingAttackTargetRef = useRef<string | null>(null);
  const critterRefs = useRef<Record<string, AnimatedSprite | null>>({});
  const enemyRefs = useRef<Record<string, AnimatedSprite | null>>({});
  const vendorRefs = useRef<Record<string, AnimatedSprite | null>>({});
  const viewSizeRef = useRef({ w: window.innerWidth / WORLD_SCALE, h: window.innerHeight / WORLD_SCALE });
  const lastCompassUpdateRef = useRef(0);

  // Fixed-size pool of floor sprites covering the viewport + margin,
  // repositioned imperatively as the camera moves -- at 10x map area,
  // mounting one sprite per world tile (COLS*ROWS) would mean 96000+ Pixi
  // display objects just for the ground. Computed once: if the browser
  // window grows a lot after mount there may be a thin uncovered edge
  // until reload, which is an acceptable trade for not having to manage a
  // dynamically-resizing pool.
  const floorPoolDims = useMemo(
    () => ({
      cols: Math.ceil(window.innerWidth / WORLD_SCALE / TILE) + FLOOR_POOL_MARGIN * 2,
      rows: Math.ceil(window.innerHeight / WORLD_SCALE / TILE) + FLOOR_POOL_MARGIN * 2,
    }),
    []
  );
  const floorPoolRefs = useRef<(Sprite | null)[]>([]);

  const { grid, obstacles, decor, critters, enemies, vendors, water, settlements, spawn } = useMemo(() => generateWorld(seed), [seed]);
  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  const settlementsRef = useRef(settlements);
  useEffect(() => {
    settlementsRef.current = settlements;
  }, [settlements]);

  const posRef = useRef({ x: spawn.x, y: spawn.y }); // current tile (float during travel)
  const pathRef = useRef<{ x: number; y: number }[]>([]);
  const stepElapsedRef = useRef(0);
  const facingRef = useRef(1);

  const critterStatesRef = useRef<Record<string, CritterState>>({});
  useEffect(() => {
    const states: Record<string, CritterState> = {};
    critters.forEach((c, i) => {
      states[c.id] = {
        kind: c.kind,
        home: { x: c.x, y: c.y },
        pos: { x: c.x, y: c.y },
        target: null,
        stepElapsed: 0,
        idleUntil: performance.now() + (i % 30) * 130, // stagger so they don't all move in lockstep
        facing: 1,
        mode: "idle",
        modeDirty: false,
        hp: CRITTER_HP,
        hitFlashUntil: 0,
        dead: false,
        deathElapsed: 0,
      };
    });
    critterStatesRef.current = states;
  }, [critters]);

  const enemyStatesRef = useRef<Record<string, EnemyState>>({});
  useEffect(() => {
    const states: Record<string, EnemyState> = {};
    enemies.forEach((en) => {
      states[en.id] = {
        kind: en.kind,
        home: { x: en.x, y: en.y },
        pos: { x: en.x, y: en.y },
        target: null,
        stepElapsed: 0,
        facing: 1,
        mode: "idle",
        modeDirty: false,
        hp: ENEMY_HP[en.kind] ?? 2,
        hitFlashUntil: 0,
        deathElapsed: 0,
        chaseKind: null,
        chaseCritterId: null,
        attackCooldown: 0,
      };
    });
    enemyStatesRef.current = states;
    heroAttackRef.current = null;
    pendingAttackTargetRef.current = null;
  }, [enemies]);

  useEffect(() => {
    const onResize = () => {
      viewSizeRef.current = { w: window.innerWidth / WORLD_SCALE, h: window.innerHeight / WORLD_SCALE };
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    posRef.current = { x: spawn.x, y: spawn.y };
    pathRef.current = [];
    if (worldRef.current) {
      const { w: viewW, h: viewH } = viewSizeRef.current;
      const camX = clamp(spawn.x * TILE + TILE / 2 - viewW / 2, 0, Math.max(0, WORLD_PX_W - viewW));
      const camY = clamp(spawn.y * TILE + TILE - viewH / 2, 0, Math.max(0, WORLD_PX_H - viewH));
      worldRef.current.position.set(-camX, -camY);
    }
  }, [spawn]);

  useEffect(() => {
    let cancelled = false;
    const uniqueAtlases = Array.from(new Set(EXTRA_PROPS.map((p) => p.atlas)));
    Promise.all([
      Assets.load(TILESET_ATLAS),
      ...uniqueAtlases.map((a) => Assets.load(a)),
      ...HERO_ANIM_ENTRIES.map((h) => Assets.load(h.atlas)),
      ...CRITTER_SPECIES.map((s) => Assets.load(s.idleAtlas)),
      ...CRITTER_SPECIES.map((s) => Assets.load(s.moveAtlas)),
      ...ENEMY_ANIM_ENTRIES.map((en) => Assets.load(en.atlas)),
      ...VENDOR_SPECIES.map((v) => Assets.load(v.atlas)),
    ]).then((loaded) => {
      if (cancelled) return;
      const [tileSheet, ...rest] = loaded;
      const extraSheets = rest.slice(0, uniqueAtlases.length);
      const heroSheets = rest.slice(uniqueAtlases.length, uniqueAtlases.length + HERO_ANIM_ENTRIES.length);
      const critterStart = uniqueAtlases.length + HERO_ANIM_ENTRIES.length;
      const idleSheets = rest.slice(critterStart, critterStart + CRITTER_SPECIES.length);
      const moveSheets = rest.slice(critterStart + CRITTER_SPECIES.length, critterStart + CRITTER_SPECIES.length * 2);
      const enemyStart = critterStart + CRITTER_SPECIES.length * 2;
      const enemySheets = rest.slice(enemyStart, enemyStart + ENEMY_ANIM_ENTRIES.length);
      const vendorSheets = rest.slice(enemyStart + ENEMY_ANIM_ENTRIES.length);

      setFloorTex(tileSheet.textures[FLOOR_FRAME]);

      const props: Record<string, Texture> = {};
      ALL_TILESET_FRAMES.forEach((f) => (props[f] = tileSheet.textures[f]));
      uniqueAtlases.forEach((atlasPath, i) => {
        const sheet = extraSheets[i];
        EXTRA_PROPS.filter((p) => p.atlas === atlasPath).forEach((p) => {
          props[p.id] = sheet.textures[p.frame];
        });
      });
      setPropTex(props);

      const heroAnims: HeroAnims = {
        down: { idle: [], move: [], attack: [] },
        up: { idle: [], move: [], attack: [] },
        side: { idle: [], move: [], attack: [] },
      };
      HERO_ANIM_ENTRIES.forEach((h, i) => {
        heroAnims[h.dir][h.mode] = Object.values(heroSheets[i].textures);
      });
      setHeroTex(heroAnims);

      const critterFrames: Record<string, CritterAnims> = {};
      CRITTER_SPECIES.forEach((s, i) => {
        critterFrames[s.id] = {
          idle: Object.values(idleSheets[i].textures),
          move: Object.values(moveSheets[i].textures),
        };
      });
      setCritterTex(critterFrames);

      const enemyFrames: Record<string, EnemyAnims> = {};
      ENEMY_POOL.forEach((species) => {
        enemyFrames[species] = { idle: [], walk: [], death: null };
      });
      ENEMY_ANIM_ENTRIES.forEach((en, i) => {
        const textures = Object.values(enemySheets[i].textures) as Texture[];
        if (en.kind === "death") enemyFrames[en.species].death = textures;
        else enemyFrames[en.species][en.kind] = textures;
      });
      setEnemyTex(enemyFrames);

      const vendorFrames: Record<string, Texture[]> = {};
      VENDOR_SPECIES.forEach((v, i) => {
        vendorFrames[v.id] = Object.values(vendorSheets[i].textures) as Texture[];
      });
      setVendorTex(vendorFrames);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onTap = useCallback(
    (e: FederatedPointerEvent) => {
      if (!worldRef.current) return;
      const local = e.getLocalPosition(worldRef.current);
      const gx = Math.floor(local.x / TILE);
      const gy = Math.floor(local.y / TILE);
      if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return;
      const start = { x: Math.round(posRef.current.x), y: Math.round(posRef.current.y) };

      // clicked a living enemy -> attack intent: swing now if already
      // adjacent, otherwise walk to the nearest adjacent open tile first
      // and let the tick loop trigger the swing on arrival.
      for (const [id, en] of Object.entries(enemyStatesRef.current)) {
        if (en.mode === "dead") continue;
        if (Math.round(en.pos.x) !== gx || Math.round(en.pos.y) !== gy) continue;

        const dist = Math.max(Math.abs(start.x - gx), Math.abs(start.y - gy));
        if (dist <= ATTACK_RANGE) {
          heroAttackRef.current = { targetId: id, elapsed: 0 };
          pathRef.current = [];
          pendingAttackTargetRef.current = null;
          return;
        }

        let best: { x: number; y: number }[] | null = null;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          if (!grid[ny]?.[nx]) continue;
          const p = bfsPath(grid, start, { x: nx, y: ny });
          if (p && (!best || p.length < best.length)) best = p;
        }
        if (best) {
          pathRef.current = best;
          pendingAttackTargetRef.current = id;
        }
        return;
      }

      pendingAttackTargetRef.current = null;
      const path = bfsPath(grid, start, { x: gx, y: gy });
      if (path) pathRef.current = path;
    },
    [grid]
  );

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      const g = gridRef.current;

      const prevHeroDir = heroDirRef.current;
      const prevHeroMode = heroModeRef.current;

      if (heroAttackRef.current) {
        const atk = heroAttackRef.current;
        if (atk.elapsed === 0) {
          const target = enemyStatesRef.current[atk.targetId];
          if (target) {
            const dx = Math.round(target.pos.x) - Math.round(posRef.current.x);
            const dy = Math.round(target.pos.y) - Math.round(posRef.current.y);
            if (dy > 0) heroDirRef.current = "down";
            else if (dy < 0) heroDirRef.current = "up";
            else if (dx !== 0) {
              heroDirRef.current = "side";
              facingRef.current = dx > 0 ? 1 : -1;
            }
          }
          heroModeRef.current = "attack";
        }
        atk.elapsed += dt;
        if (atk.elapsed >= ATTACK_DURATION_MS) {
          const target = enemyStatesRef.current[atk.targetId];
          if (target && target.mode !== "dead") {
            const dist = Math.max(
              Math.abs(Math.round(target.pos.x) - Math.round(posRef.current.x)),
              Math.abs(Math.round(target.pos.y) - Math.round(posRef.current.y))
            );
            if (dist <= ATTACK_RANGE) {
              target.hp -= 1;
              target.hitFlashUntil = now + 150;
              if (target.hp <= 0) {
                target.mode = "dead";
                target.modeDirty = true;
                target.target = null;
              }
            }
          }
          heroAttackRef.current = null;
          heroModeRef.current = "idle";
        }
      } else if (pathRef.current.length > 0) {
        stepElapsedRef.current += dt;
        const next = pathRef.current[0];
        const cur = posRef.current;
        const from = { x: Math.round(cur.x), y: Math.round(cur.y) };
        const t = Math.min(1, stepElapsedRef.current / STEP_MS);
        posRef.current = {
          x: from.x + (next.x - from.x) * t,
          y: from.y + (next.y - from.y) * t,
        };
        const dx = next.x - from.x;
        const dy = next.y - from.y;
        if (dy > 0) heroDirRef.current = "down";
        else if (dy < 0) heroDirRef.current = "up";
        else if (dx !== 0) {
          heroDirRef.current = "side";
          facingRef.current = dx > 0 ? 1 : -1;
        }
        heroModeRef.current = "move";
        if (t >= 1) {
          posRef.current = { x: next.x, y: next.y };
          pathRef.current = pathRef.current.slice(1);
          stepElapsedRef.current = 0;

          const pendingId = pendingAttackTargetRef.current;
          if (pendingId && pathRef.current.length === 0) {
            const target = enemyStatesRef.current[pendingId];
            if (target && target.mode !== "dead") {
              const dist = Math.max(
                Math.abs(Math.round(target.pos.x) - next.x),
                Math.abs(Math.round(target.pos.y) - next.y)
              );
              if (dist <= ATTACK_RANGE) {
                heroAttackRef.current = { targetId: pendingId, elapsed: 0 };
              }
            }
            pendingAttackTargetRef.current = null;
          }
        }
      } else {
        heroModeRef.current = "idle";
      }
      if (heroDirRef.current !== prevHeroDir || heroModeRef.current !== prevHeroMode) {
        heroAnimDirtyRef.current = true;
      }

      const p = posRef.current;
      const heroPxX = p.x * TILE + TILE / 2;
      const heroPxY = p.y * TILE + TILE;

      if (heroRef.current) {
        heroRef.current.x = heroPxX;
        heroRef.current.y = heroPxY;
        const baseScale = Math.abs(heroRef.current.scale.x || 1);
        heroRef.current.scale.x = heroDirRef.current === "side" ? baseScale * facingRef.current : baseScale;
        if (heroAnimDirtyRef.current) {
          const anims = heroTexRef.current;
          if (anims) {
            heroRef.current.textures = anims[heroDirRef.current][heroModeRef.current];
            heroRef.current.gotoAndPlay(0);
          }
          heroAnimDirtyRef.current = false;
        } else if (!heroRef.current.playing) {
          heroRef.current.play();
        }
      }

      let camX = 0;
      let camY = 0;
      if (worldRef.current) {
        const { w: viewW, h: viewH } = viewSizeRef.current;
        camX = clamp(heroPxX - viewW / 2, 0, Math.max(0, WORLD_PX_W - viewW));
        camY = clamp(heroPxY - viewH / 2, 0, Math.max(0, WORLD_PX_H - viewH));
        worldRef.current.position.set(-camX, -camY);
      }

      // floor pool: reposition the fixed sprite pool to cover the visible
      // area around the camera instead of tracking world tiles directly.
      {
        const camTileX = Math.floor(camX / TILE) - FLOOR_POOL_MARGIN;
        const camTileY = Math.floor(camY / TILE) - FLOOR_POOL_MARGIN;
        const { cols, rows } = floorPoolDims;
        for (let i = 0; i < cols * rows; i++) {
          const sprite = floorPoolRefs.current[i];
          if (!sprite) continue;
          const tx = i % cols;
          const ty = (i / cols) | 0;
          sprite.x = (camTileX + tx) * TILE;
          sprite.y = (camTileY + ty) * TILE;
        }
      }

      // compass: point at the nearest settlement. Cheap (a handful of
      // settlements), but still only recomputed a few times a second since
      // it drives a React re-render, not worth doing every Pixi frame.
      if (now - lastCompassUpdateRef.current > 250) {
        lastCompassUpdateRef.current = now;
        let nearest: { x: number; y: number } | null = null;
        let nearestDist = Infinity;
        for (const s of settlementsRef.current) {
          const d = chebyshev(posRef.current, s);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = s;
          }
        }
        if (nearest) {
          onCompassUpdate({ dx: nearest.x - posRef.current.x, dy: nearest.y - posRef.current.y, dist: Math.round(nearestDist) });
        } else {
          onCompassUpdate(null);
        }
      }

      // wandering critters: small local random walk around their spawn
      // tile, fleeing the hero if close, dying if an enemy catches them.
      for (const [id, c] of Object.entries(critterStatesRef.current)) {
        const sprite = critterRefs.current[id];
        if (c.dead) {
          if (sprite) {
            c.deathElapsed += dt;
            sprite.alpha = Math.max(0, 1 - c.deathElapsed / 600);
          }
          continue;
        }

        if (c.target) {
          c.stepElapsed += dt;
          const t = Math.min(1, c.stepElapsed / CRITTER_STEP_MS);
          const from = c.pos;
          c.pos = {
            x: Math.round(from.x) + (c.target.x - Math.round(from.x)) * t,
            y: Math.round(from.y) + (c.target.y - Math.round(from.y)) * t,
          };
          if (c.target.x !== Math.round(from.x)) c.facing = c.target.x > Math.round(from.x) ? 1 : -1;
          if (t >= 1) {
            c.pos = { x: c.target.x, y: c.target.y };
            c.target = null;
            c.stepElapsed = 0;
            c.idleUntil = now + 1200 + Math.random() * 2600;
            if (c.mode !== "idle") {
              c.mode = "idle";
              c.modeDirty = true;
            }
          }
        } else {
          const heroDist = chebyshev(c.pos, posRef.current);
          const fleeing = heroDist <= CRITTER_FLEE_RADIUS;
          if (fleeing || now >= c.idleUntil) {
            const candidates: { x: number; y: number }[] = [];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx2 = Math.round(c.pos.x) + dx;
              const ny2 = Math.round(c.pos.y) + dy;
              if (nx2 < 0 || ny2 < 0 || nx2 >= COLS || ny2 >= ROWS) continue;
              if (!g[ny2]?.[nx2]) continue;
              if (!fleeing) {
                if (Math.abs(nx2 - c.home.x) > CRITTER_WANDER_RADIUS) continue;
                if (Math.abs(ny2 - c.home.y) > CRITTER_WANDER_RADIUS) continue;
              }
              candidates.push({ x: nx2, y: ny2 });
            }
            if (fleeing) {
              candidates.sort((a, b) => {
                const da = Math.max(Math.abs(a.x - Math.round(posRef.current.x)), Math.abs(a.y - Math.round(posRef.current.y)));
                const db = Math.max(Math.abs(b.x - Math.round(posRef.current.x)), Math.abs(b.y - Math.round(posRef.current.y)));
                return db - da; // farthest-from-hero first
              });
            }
            if (candidates.length > 0) {
              c.target = fleeing ? candidates[0] : candidates[Math.floor(Math.random() * candidates.length)];
              if (c.mode !== "move") {
                c.mode = "move";
                c.modeDirty = true;
              }
            } else if (!fleeing) {
              c.idleUntil = now + 800 + Math.random() * 1500;
            }
          }
        }

        if (sprite) {
          sprite.x = c.pos.x * TILE + TILE / 2;
          sprite.y = c.pos.y * TILE + TILE / 2;
          sprite.scale.x = Math.abs(sprite.scale.x) * c.facing;
          sprite.tint = now < c.hitFlashUntil ? 0xff6666 : 0xffffff;
          if (c.modeDirty) {
            const anims = critterTexRef.current?.[c.kind];
            if (anims) {
              sprite.textures = anims[c.mode];
              sprite.gotoAndPlay(0);
            }
            c.modeDirty = false;
          } else if (!sprite.playing) {
            sprite.play();
          }
        }
      }

      // enemies: idle until the hero OR a critter gets close, then chase
      // whichever is nearer; attacked by the hero via onTap, and attack
      // critters themselves once adjacent (hero is unharmed -- no hero HP
      // model yet, so hero-target enemies just close in and hold position).
      for (const [id, en] of Object.entries(enemyStatesRef.current)) {
        const sprite = enemyRefs.current[id];
        const anims = enemyTexRef.current?.[en.kind];

        if (en.mode === "dead") {
          if (en.modeDirty) {
            if (sprite && anims) {
              if (anims.death) {
                sprite.loop = false;
                sprite.textures = anims.death;
                sprite.gotoAndPlay(0);
              } else {
                sprite.stop();
              }
            }
            en.modeDirty = false;
          }
          if (sprite && !anims?.death) {
            en.deathElapsed += dt;
            sprite.alpha = Math.max(0, 1 - en.deathElapsed / 700);
          }
          continue;
        }

        if (en.target) {
          en.stepElapsed += dt;
          const t = Math.min(1, en.stepElapsed / ENEMY_STEP_MS);
          const from = en.pos;
          en.pos = {
            x: Math.round(from.x) + (en.target.x - Math.round(from.x)) * t,
            y: Math.round(from.y) + (en.target.y - Math.round(from.y)) * t,
          };
          if (en.target.x !== Math.round(from.x)) en.facing = en.target.x > Math.round(from.x) ? 1 : -1;
          if (t >= 1) {
            en.pos = { x: en.target.x, y: en.target.y };
            en.target = null;
            en.stepElapsed = 0;
          }
        } else {
          const radius = en.mode === "chase" ? ENEMY_LEASH_RADIUS : ENEMY_AGGRO_RADIUS;
          let bestKind: "hero" | "critter" | null = null;
          let bestId: string | null = null;
          let bestDist = radius;
          const heroDist = chebyshev(en.pos, posRef.current);
          if (heroDist <= bestDist) {
            bestKind = "hero";
            bestDist = heroDist;
          }
          for (const [cid, c] of Object.entries(critterStatesRef.current)) {
            if (c.dead) continue;
            const d = chebyshev(en.pos, c.pos);
            if (d < bestDist) {
              bestKind = "critter";
              bestId = cid;
              bestDist = d;
            }
          }

          const newMode: EnemyMode = bestKind ? "chase" : "idle";
          if (newMode !== en.mode) {
            en.mode = newMode;
            en.modeDirty = true;
          }
          en.chaseKind = bestKind;
          en.chaseCritterId = bestKind === "critter" ? bestId : null;

          if (bestKind) {
            const targetPos = bestKind === "hero" ? posRef.current : critterStatesRef.current[bestId!]?.pos;
            if (targetPos) {
              const dist = chebyshev(en.pos, targetPos);
              if (dist > ATTACK_RANGE) {
                const hx = Math.round(targetPos.x);
                const hy = Math.round(targetPos.y);
                const ex = Math.round(en.pos.x);
                const ey = Math.round(en.pos.y);
                const stepDx = Math.sign(hx - ex);
                const stepDy = Math.sign(hy - ey);
                const options: { x: number; y: number }[] = [];
                if (stepDx !== 0) options.push({ x: ex + stepDx, y: ey });
                if (stepDy !== 0) options.push({ x: ex, y: ey + stepDy });
                const valid = options.filter((o) => o.x >= 0 && o.y >= 0 && o.x < COLS && o.y < ROWS && g[o.y]?.[o.x]);
                if (valid.length > 0) en.target = valid[Math.floor(Math.random() * valid.length)];
              } else if (bestKind === "critter" && now >= en.attackCooldown) {
                const critter = critterStatesRef.current[bestId!];
                if (critter && !critter.dead) {
                  critter.hp -= 1;
                  critter.hitFlashUntil = now + 150;
                  en.attackCooldown = now + ENEMY_ATTACK_COOLDOWN_MS;
                  if (critter.hp <= 0) critter.dead = true;
                }
              }
            }
          }
        }

        if (sprite) {
          sprite.x = en.pos.x * TILE + TILE / 2;
          sprite.y = en.pos.y * TILE + TILE;
          sprite.scale.x = Math.abs(sprite.scale.x) * en.facing;
          sprite.tint = now < en.hitFlashUntil ? 0xff6666 : 0xffffff;
          if (en.modeDirty) {
            if (anims) {
              sprite.textures = en.mode === "chase" ? anims.walk : anims.idle;
              sprite.gotoAndPlay(0);
            }
            en.modeDirty = false;
          } else if (!sprite.playing) {
            sprite.play();
          }
        }
      }

      // vendors: static, just keep their idle animation running
      for (const sprite of Object.values(vendorRefs.current)) {
        if (sprite && !sprite.playing) sprite.play();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [floorPoolDims]);

  if (!floorTex || !propTex || !heroTex || !critterTex || !enemyTex || !vendorTex) return null;

  return (
    <pixiContainer ref={worldRef}>
      <pixiGraphics
        eventMode="static"
        onPointerTap={onTap}
        draw={(g) => {
          g.clear();
          g.rect(0, 0, WORLD_PX_W, WORLD_PX_H);
          g.fill({ color: 0x000000, alpha: 0.001 });
        }}
      />
      {Array.from({ length: floorPoolDims.cols * floorPoolDims.rows }).map((_, i) => (
        <pixiSprite
          key={`fp${i}`}
          ref={(s: Sprite | null) => {
            floorPoolRefs.current[i] = s;
          }}
          texture={floorTex}
        />
      ))}
      {water.map((w, i) => (
        <pixiSprite
          key={`w${i}`}
          texture={Texture.WHITE}
          x={w.x * TILE}
          y={w.y * TILE}
          width={TILE}
          height={TILE}
          tint={WATER_TINT}
        />
      ))}
      {decor.map((d, i) => (
        <pixiSprite
          key={`d${i}`}
          texture={propTex[d.frame]}
          x={d.x * TILE + TILE / 2}
          y={d.y * TILE + TILE / 2}
          anchor={{ x: 0.5, y: 0.5 }}
          alpha={0.9}
        />
      ))}
      {obstacles.map((o, i) => (
        <pixiSprite
          key={`o${i}`}
          texture={propTex[o.frame]}
          x={o.x * TILE + TILE / 2}
          y={o.y * TILE + TILE}
          anchor={{ x: 0.5, y: 0.85 }}
        />
      ))}
      {vendors.map((v) => (
        <pixiAnimatedSprite
          key={v.id}
          ref={(s: AnimatedSprite | null) => {
            vendorRefs.current[v.id] = s;
          }}
          textures={vendorTex[v.kind]}
          anchor={{ x: 0.5, y: 0.85 }}
          animationSpeed={0.1}
          loop
          x={v.x * TILE + TILE / 2}
          y={v.y * TILE + TILE}
        />
      ))}
      {critters.map((c) => (
        <pixiAnimatedSprite
          key={c.id}
          ref={(s: AnimatedSprite | null) => {
            critterRefs.current[c.id] = s;
          }}
          textures={critterTex[c.kind].idle}
          anchor={{ x: 0.5, y: 0.75 }}
          animationSpeed={0.12 + Math.random() * 0.06}
          loop
          x={c.x * TILE + TILE / 2}
          y={c.y * TILE + TILE / 2}
        />
      ))}
      {enemies.map((en) => (
        <pixiAnimatedSprite
          key={en.id}
          ref={(s: AnimatedSprite | null) => {
            enemyRefs.current[en.id] = s;
          }}
          textures={enemyTex[en.kind].idle}
          anchor={{ x: 0.5, y: 0.85 }}
          animationSpeed={0.15}
          loop
          x={en.x * TILE + TILE / 2}
          y={en.y * TILE + TILE}
        />
      ))}
      <pixiAnimatedSprite
        ref={heroRef}
        textures={heroTex.down.idle}
        anchor={{ x: 0.5, y: 0.85 }}
        animationSpeed={0.2}
        loop
        x={spawn.x * TILE + TILE / 2}
        y={spawn.y * TILE + TILE}
      />
    </pixiContainer>
  );
}

export default function WorldDemoPage() {
  const [seed, setSeed] = useState(1);
  const [compass, setCompass] = useState<CompassInfo>(null);

  const arrowDeg = compass ? (Math.atan2(compass.dy, compass.dx) * 180) / Math.PI : 0;

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <button
        className="absolute top-3 left-3 z-10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/30 hover:text-white/80"
        onClick={() => setSeed((s) => s + 1)}
      >
        Regenerate
      </button>
      {compass && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 text-white/50 text-[10px] uppercase tracking-wide">
          <span
            className="inline-block text-teal-300 text-sm leading-none"
            style={{ transform: `rotate(${arrowDeg}deg)` }}
          >
            &#10148;
          </span>
          <span>
            settlement &middot; {compass.dist} tile{compass.dist === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <Application resizeTo={window} background="#0c0a08">
        <pixiContainer scale={{ x: WORLD_SCALE, y: WORLD_SCALE }}>
          <World seed={seed} onCompassUpdate={setCompass} />
        </pixiContainer>
      </Application>
    </main>
  );
}
