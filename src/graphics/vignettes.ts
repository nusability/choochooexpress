// Little scenes instead of scattered props (spec FR-117, research R41): things lie where a child
// left them — a notepad with crayons, a half-built block tower, figurines round a table, sheep in
// a pen. Inside the yard, scenes go on open patches between the tracks (2 × 2 or 2 × 1 tiles), the
// rest of the play area stays clear; around the diorama, room-sized things are grouped the same way.
import * as THREE from 'three';
import { Pcg32, hashSeed } from '../engine/prng';
import type { PropDef } from '../engine/types';
import type { YardLevel } from '../engine/yard';
import { tileCenter } from './buildings';
import { activeHoliday, ring, row, type Item, type Scene } from './holiday';

/** Scenes on open patches inside the yard (offsets in tiles from the patch's middle). */
const INSIDE: Record<string, Scene[]> = {
  rug: [
    { name: 'drawing', w: 2, h: 2, items: [['paper', -0.1, 0.05, 0.25, 1], ['paper', 0.25, -0.15, -0.3, 1, 0.008, 1], ['crayon', -0.45, 0.55, 1.3, 1, 0.02, 0], ['crayon', 0.55, -0.45, -0.5, 1, 0.02, 2], ['crayon', 0.7, 0.45, 2.2, 1, 0, 3]] },
    { name: 'blockTower', w: 2, h: 2, items: [['toy:block', 0, 0, 0, 0.7], ['toy:block', 0, 0, 0.3, 0.7, 0.4], ['toy:block', 0.02, 0, -0.2, 0.7, 0.8], ['toy:block', 0.65, 0.45, 0.8, 0.7], ['toy:block', -0.55, 0.6, 2.1, 0.7]] },
    { name: 'teaParty', w: 2, h: 2, items: [['table', 0, 0], ['teapot', 0, 0, 0.5, 1, 0.2], ['cup', 0.16, 0.12, 0, 1, 0.2], ['cup', -0.15, -0.12, 2, 1, 0.2], ['toy:teddy', -0.6, 0, 'face', 0.55], ['toy:robot', 0.6, 0, 'face', 0.55], ['toy:duck', 0, 0.62, 'face', 0.55], ['toy:soldier', 0, -0.62, 'face', 0.55]] },
    { name: 'marbles', w: 2, h: 1, items: [['marble', -0.7, 0, 0, 1, 0, 0], ['marble', -0.45, 0.12, 0, 1, 0, 1], ['marble', -0.2, -0.05, 0, 1, 0, 2], ['marble', 0.1, 0.18, 0, 1, 0, 3], ['marble', 0.45, 0.02, 0, 1, 0, 4], ['marble', 0.75, -0.15, 0, 1, 0, 1]] },
    { name: 'parade', w: 2, h: 1, items: [['toy:drum', -0.75, 0, 0, 0.55], ...row(4, 0.35, 'toy:soldier', 0.55, 0, 0).map((it) => [it[0], it[1] + 0.2, it[2], it[3], it[4]] as Item)] },
  ],
  candy: [
    { name: 'cupcakeParty', w: 2, h: 2, items: [['plate', 0, 0, 0, 1.4], ['toy:cupcake', -0.15, 0.08, 0, 0.6, 0.02], ['toy:cupcake', 0.18, 0.12, 0.6, 0.6, 0.02], ['toy:cupcake', 0.02, -0.18, 1.2, 0.6, 0.02], ['teapot', 0.7, 0.5, 2.5, 1.2], ['cup', -0.65, 0.55, 0, 1.2], ['cup', 0.6, -0.6, 1, 1.2]] },
    { name: 'candySpill', w: 2, h: 1, items: [['jar', -0.6, 0, 0.1, 1], ['toy:gumdrop', -0.25, 0.05, 0, 0.6], ['toy:gumdrop', 0.0, -0.12, 0, 0.6], ['toy:sweet', 0.25, 0.1, 0.7, 0.6], ['toy:gumdrop', 0.5, -0.05, 0, 0.6], ['toy:sweet', 0.78, 0.12, 2, 0.6]] },
    { name: 'donutStack', w: 2, h: 1, items: [['plate', -0.3, 0, 0, 1.2], ['toy:donut', -0.3, 0, 0, 0.7, 0.02], ['toy:donut', -0.3, 0, 0.6, 0.7, 0.11], ['toy:donut', -0.28, 0.02, 1.2, 0.7, 0.2], ['toy:donut', 0.45, 0.1, 0, 0.7], ['toy:macaron', 0.7, -0.15, 0, 0.6]] },
    { name: 'iceCreamStand', w: 2, h: 1, items: [['stand', 0, -0.2, 0, 1], ...row(3, 0.3, 'toy:iceCream', 0.6, 0, 0.25)] },
  ],
  garden: [
    { name: 'sandcastle', w: 2, h: 2, items: [['dune', 0, 0, 0.4, 0.55], ['bucket', 0.65, 0.5, 0, 0.35], ['spade', -0.6, 0.45, 2.2, 0.35], ['flag', 0.05, -0.05, 0, 1, 0.3]] },
    { name: 'flowerBed', w: 2, h: 1, items: [['flowers', -0.45, 0, 0, 1.6], ['flowers', 0.15, 0.05, 1, 1.6], ['toy:wateringCan', 0.72, -0.1, 2.6, 0.7]] },
    { name: 'fairyRing', w: 2, h: 2, items: [...ring(7, 0.62, 'toy:toadstool', 0.55, 0.2, false), ['toy:snail', 0, 0, 0.8, 0.6]] },
    { name: 'pond', w: 2, h: 2, items: [['pond', 0, 0, 0, 1], ['toy:duck', -0.15, 0.1, 0.6, 0.6, 0.015], ['toy:duck', 0.25, -0.1, 2.4, 0.45, 0.015], ['reeds', 0.6, 0.45, 0, 1], ['reeds', -0.55, -0.5, 1, 1]] },
    { name: 'ladybugLeaf', w: 2, h: 1, items: [['leaf', -0.2, 0, 0.4, 1], ['toy:ladybug', -0.25, 0.05, 1, 0.5, 0.03], ['toy:ladybug', 0.55, -0.1, 2.4, 0.5], ['toy:bee', 0.75, 0.2, 0, 0.5, 0.3]] },
  ],
  space: [
    { name: 'launchPad', w: 2, h: 2, items: [['pad', 0, 0, 0, 1], ['rocket', 0, 0, 0, 0.5, 0.03], ['flag', 0.55, 0.45, 0, 1]] },
    { name: 'moonBase', w: 2, h: 2, items: [['crater', -0.2, 0.1, 0, 0.9], ['toy:helmet', 0.45, -0.35, 1, 0.6], ['flag', 0.35, 0.45, 0, 1], ['toy:alien', -0.55, -0.4, 'face', 0.55], ['toy:alien', -0.7, 0.45, 'face', 0.45]] },
    { name: 'planets', w: 2, h: 1, items: [['toy:planet', -0.6, 0, 0, 0.8], ['toy:moon', -0.1, 0.05, 0.4, 0.6], ['toy:planet', 0.35, -0.05, 1.5, 0.55], ['toy:star', 0.75, 0.1, 0, 0.5]] },
    { name: 'ufoLanding', w: 2, h: 2, items: [['pad', 0, 0, 0, 0.9, 0, 1], ['toy:ufo', 0, 0, 0, 0.9, 0.05], ['toy:alien', 0.62, 0.3, 'face', 0.5], ['toy:alien', -0.6, 0.35, 'face', 0.5], ['toy:satellite', 0.4, -0.6, 0.8, 0.5]] },
  ],
  ice: [
    { name: 'snowman', w: 2, h: 2, items: [['toy:snowman', 0, 0, 0.6, 0.9], ['snowball', 0.55, 0.45, 0, 1], ['snowball', 0.7, 0.2, 0, 0.8], ['toy:mitten', -0.55, 0.5, 2, 0.5], ['toy:bobbleHat', -0.5, -0.45, 0, 0.5]] },
    { name: 'skating', w: 2, h: 2, items: [['pond', 0, 0, 0, 1, 0, 1], ['toy:skate', -0.2, 0.15, 0.4, 0.55, 0.02], ['toy:skate', 0.15, 0.2, 0.7, 0.55, 0.02], ['toy:penguin', 0.3, -0.25, 2.5, 0.6, 0.02]] },
    { name: 'penguinFamily', w: 2, h: 1, items: [['toy:penguin', -0.5, 0, 0.3, 0.8], ['toy:penguin', 0.0, 0.05, 0.3, 0.6], ['toy:penguin', 0.4, 0.08, 0.3, 0.45], ['toy:snowflake', 0.75, -0.15, 0.6, 0.4, 0.15]] },
    { name: 'sledHill', w: 2, h: 1, items: [['snowDrift', -0.2, 0, 0, 0.45], ['toy:sled', 0.4, 0.05, 0.2, 0.7], ['toy:polarBear', -0.55, 0.1, 0.4, 0.55, 0.05]] },
  ],
  village: [
    { name: 'sheepPen', w: 2, h: 2, items: [['pen', 0, 0, 0, 1], ['toy:sheep', -0.25, 0.15, 0.4, 0.55], ['toy:sheep', 0.2, -0.2, 2.3, 0.55], ['toy:sheep', 0.25, 0.3, 1.2, 0.45], ['toy:hayBale', -0.3, -0.3, 0, 0.5]] },
    { name: 'forest', w: 2, h: 2, items: [['toy:fir', -0.4, -0.3, 0, 1.1], ['toy:fir', 0.35, -0.35, 1, 0.85], ['toy:fir', 0.1, 0.35, 2, 1.25], ['toy:fir', -0.5, 0.5, 3, 0.7], ['bush', 0.6, 0.55, 0, 0.6]] },
    { name: 'cottage', w: 2, h: 2, items: [['house', -0.15, -0.2, 0, 0.7], ['tree', 0.6, 0.45, 0, 0.55], ['fence', -0.1, 0.65, 0, 0.6], ['toy:milkCan', 0.6, -0.4, 0, 0.5], ['toy:milkCan', 0.75, -0.25, 0, 0.5]] },
    { name: 'woodpile', w: 2, h: 1, items: [['toy:log', -0.3, -0.1, 0.1, 0.7], ['toy:log', -0.3, 0.15, 0.1, 0.7], ['toy:log', -0.3, 0.02, 0.1, 0.7, 0.14], ['toy:barrel', 0.45, 0, 0, 0.6], ['toy:crate', 0.8, 0.1, 0.4, 0.5]] },
  ],
  shop: [
    { name: 'giftPile', w: 2, h: 2, items: [['toy:gift', -0.2, 0.1, 0.3, 0.8], ['toy:gift', 0.25, -0.1, 1.1, 0.7], ['toy:gift', 0.0, 0.0, 0.7, 0.55, 0.38], ['toy:gift', 0.55, 0.5, 2, 0.5], ['ribbon', -0.55, -0.5, 0, 1]] },
    { name: 'boardGame', w: 2, h: 2, items: [['board', 0, 0, 0.1, 1], ['toy:dice', 0.6, 0.55, 0.4, 0.5], ['toy:dice', 0.75, 0.3, 1.1, 0.5], ['token', -0.2, 0.1, 0, 1, 0.02, 0], ['token', 0.15, -0.25, 0, 1, 0.02, 1], ['token', 0.3, 0.2, 0, 1, 0.02, 2]] },
    { name: 'soldierParade', w: 2, h: 1, items: [['toy:drum', -0.75, 0, 0, 0.5], ...row(4, 0.33, 'toy:soldier', 0.55).map((it) => [it[0], it[1] + 0.2, it[2], it[3], it[4]] as Item)] },
    { name: 'yoyos', w: 2, h: 1, items: [['toy:yoyo', -0.5, 0, 0, 0.6], ['toy:yoyo', -0.15, 0.1, 0.6, 0.6], ['toy:kite', 0.45, 0, 0.2, 0.7]] },
  ],
  roads: [
    { name: 'roadworks', w: 2, h: 2, items: [...ring(5, 0.6, 'toy:cone', 0.6, 0.4, false).slice(0, 4), ['toy:truck', -0.1, 0.05, 0.6, 0.9], ['toy:tire', 0.55, -0.45, 0, 0.6], ['toy:tire', 0.55, -0.45, 0, 0.6, 0.24]] },
    { name: 'parking', w: 2, h: 2, items: [['lines', 0, 0, 0, 1], ['toy:car', -0.35, -0.2, Math.PI / 2, 0.85], ['toy:car', 0.35, -0.2, Math.PI / 2, 0.85], ['toy:bus', 0.0, 0.45, 0, 0.8]] },
    { name: 'petrol', w: 2, h: 1, items: [['pump', -0.5, -0.1, 0, 1], ['pump', -0.1, -0.1, 0, 1], ['toy:fuelCan', 0.35, 0.1, 0.4, 0.55], ['toy:car', 0.65, -0.05, 1.6, 0.8]] },
    { name: 'junction', w: 2, h: 1, items: [['toy:trafficLight', -0.55, 0, 0, 0.8], ['toy:roadSign', 0.1, 0.05, 0, 0.8], ['toy:trafficLight', 0.65, 0, Math.PI, 0.8]] },
  ],
};

/** Room-sized scenes beside the diorama (offsets in world units). */
const OUTSIDE: Record<string, Scene[]> = {
  rug: [
    { name: 'readingNook', w: 2.6, h: 0, items: [['pillow', 0, 0, 0, 5], ['teddy', 0.3, -0.4, 1.2, 4, 0.3], ['book', 1.6, 0.9, 0.5, 4]] },
    { name: 'music', w: 2.2, h: 0, items: [['drum', 0, 0, 0, 7], ['ball', 1.9, 0.7, 0, 6]] },
    { name: 'drawing', w: 2.2, h: 0, items: [['bigPaper', 0, 0, 0.3, 1], ['crayons', 0.6, 0.2, 0.8, 2.2, 0.01]] },
  ],
  candy: [
    { name: 'teaTime', w: 2.4, h: 0, items: [['cupcake', 0, 0, 0, 3], ['donut', 1.4, 0.6, 0, 3.2], ['lollipop', -1.1, 0.7, 0, 2.4]] },
    { name: 'canes', w: 1.6, h: 0, items: [['candyCane', 0, 0, 0, 2.6], ['candyCane', 0.6, 0.3, 1, 2.6], ['gumdrop', -0.5, 0.6, 0, 1.6]] },
    { name: 'marshmallows', w: 1.6, h: 0, items: [['marshmallow', 0, 0, 0, 2.2], ['marshmallow', 0.9, 0.4, 1, 2.2]] },
  ],
  garden: [
    { name: 'beach', w: 2.6, h: 0, items: [['ball', 0, 0, 0, 7], ['bucket', 2, 0.4, 0, 4], ['spade', 1.8, -0.9, 1.1, 3.5]] },
    { name: 'flowerbed', w: 2.2, h: 0, items: [['flowers', 0, 0, 0, 4], ['flowers', 1.2, 0.4, 1, 3.5], ['windmill', -0.9, 0.5, 0, 3.5]] },
    { name: 'castle', w: 2.2, h: 0, items: [['dune', 0, 0, 0.3, 4], ['mushroom', 1.6, 0.6, 0, 2.5]] },
  ],
  space: [
    { name: 'launch', w: 1.8, h: 0, items: [['rocket', 0, 0, 0, 4], ['planet', 1.4, 0.6, 0, 3]] },
    { name: 'flyby', w: 1.8, h: 0, items: [['ufo', 0, 0, 0, 4], ['starSticker', 1.3, 0.5, 0.4, 3]] },
    { name: 'craters', w: 1.6, h: 0, items: [['crater', 0, 0, 0, 3], ['planet', 1, 0.6, 1, 2.5]] },
  ],
  ice: [
    { name: 'snowyWood', w: 2.4, h: 0, items: [['snowTree', 0, 0, 0, 4], ['snowTree', 1.3, 0.6, 1, 3.2], ['snowDrift', 0.5, 1.2, 0, 3]] },
    { name: 'igloo', w: 2.4, h: 0, items: [['igloo', 0, 0, 0, 4], ['toy:penguin', 1.7, 0.5, 2.5, 3], ['toy:penguin', 2.1, 0.1, 2.8, 2.2]] },
    { name: 'snowman', w: 1.6, h: 0, items: [['toy:snowman', 0, 0, 1.2, 4], ['snowDrift', 0.8, 0.6, 0, 2]] },
  ],
  village: [
    { name: 'hamlet', w: 2.6, h: 0, items: [['house', 0, 0, 0, 3], ['house', 1.9, 0.5, 0.4, 2.6], ['tree', -1.3, 0.7, 0, 3.2], ['fence', 0.8, 1.4, 0, 3]] },
    { name: 'woods', w: 2.2, h: 0, items: [['toy:fir', 0, 0, 0, 4.5], ['toy:fir', 1, 0.4, 1, 3.6], ['toy:fir', 0.3, 1.1, 2, 4], ['tree', -0.9, 0.6, 0, 3]] },
    { name: 'meadow', w: 2, h: 0, items: [['toy:sheep', 0, 0, 0.4, 1.2], ['toy:sheep', 0.6, 0.4, 2, 1.1], ['toy:hayBale', -0.7, 0.3, 0, 1.4], ['fence', 0.2, -0.8, 0, 3]] },
  ],
  shop: [
    { name: 'shelves', w: 3, h: 0, items: [['shelf', 0, 0, 0, 3], ['shelf', 2.8, 0, 0, 3]] },
    { name: 'plushies', w: 2.2, h: 0, items: [['toy:teddy', 0, 0, 'face', 4.5], ['toy:gift', 1.3, 0.5, 0.4, 3], ['toy:gift', 1.5, -0.4, 1, 2.4]] },
    { name: 'robots', w: 2, h: 0, items: [['toy:robot', 0, 0, 0.5, 4], ['toy:soldier', 1.1, 0.4, 0.2, 4]] },
  ],
  roads: [
    { name: 'garage', w: 2.4, h: 0, items: [['garage', 0, 0, 0, 3], ['toy:bus', 1.6, 0.6, 1.4, 1.4], ['toy:cone', -1.2, 0.8, 0, 2]] },
    { name: 'park', w: 2.2, h: 0, items: [['tree', 0, 0, 0, 3.5], ['tree', 1.2, 0.6, 1, 3], ['toy:trafficLight', -1, 0.5, 0, 2.2]] },
    { name: 'tyres', w: 1.6, h: 0, items: [['toy:tire', 0, 0, 0, 2.2], ['toy:tire', 0, 0, 0, 2.2, 0.88], ['toy:truck', 1.1, 0.3, 0.5, 1.4]] },
  ],
};

export interface PlacedProp {
  prop: PropDef;
  at: THREE.Vector3;
  radius?: number;
}

/** Toys in scenes inside the yard are drawn a little larger than life, so they read at a glance. */
const TOY_BOOST = 1.3;

function toItems(scene: Scene, cx: number, cy: number, cz: number, yaw: number, unit: number, rng: Pcg32, boost = 1): PlacedProp[] {
  const skin = activeHoliday()?.skin;
  const holidayScene = !!skin && (skin.inside.includes(scene) || skin.outside.includes(scene));
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return scene.items.map(([item, dx, dz, rot = 0, scale = 1, dy = 0, variant]) => {
    // Toys in a holiday's own scenes are drawn as its cargo models (F-015).
    const kind = holidayScene && item.startsWith('toy:') ? `h${item}` : item;
    const toy = kind.startsWith('toy:') || kind.startsWith('htoy:');
    const x = (dx * c + dz * s) * unit;
    const z = (-dx * s + dz * c) * unit;
    // Toys face +x; "face" turns them toward the scene's middle.
    const r = rot === 'face' ? Math.atan2(z, -x) : rot + yaw;
    const size = toy ? scale * boost : scale;
    return { prop: { kind, tile: -1, rotation: r, scale: size, variant: variant ?? rng.int(0, 3) }, at: new THREE.Vector3(cx + x, cy + dy * (toy ? boost : 1), cz + z) };
  });
}

/** Tiles nothing stands on: no track, no building, not the depot or the station. */
function freeTiles(level: YardLevel): boolean[] {
  const free = new Array<boolean>(level.cols * level.rows).fill(true);
  for (const p of level.pieces) free[p.tile] = false;
  for (const t of [...level.station.buildingTiles, ...level.depot.tiles]) free[t] = false;
  for (const f of level.factories) free[f.building] = false;
  return free;
}

/** Scenes on open 2 × 2 and 2 × 1 patches inside the yard, a tile apart, each scene once. */
export function insideScenes(level: YardLevel, biome: string): PlacedProp[] {
  const rng = new Pcg32(hashSeed(level.seed, 'scenes'));
  const free = freeTiles(level);
  const { cols, rows } = level;
  const taken = new Array<boolean>(cols * rows).fill(false);
  const ok = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && free[r * cols + c] && !taken[r * cols + c];
  const pool = rng.shuffle([...(INSIDE[biome] ?? INSIDE.rug ?? [])]);
  // A holiday's scenes come first (F-015).
  const holiday = activeHoliday()?.skin.inside;
  if (holiday?.length) pool.unshift(...rng.shuffle([...holiday]));
  const out: PlacedProp[] = [];
  const budget = Math.min(4, 1 + Math.floor(free.filter(Boolean).length / 14));
  let placed = 0;
  // Rounds of one scene per shape (2 × 2, 2 × 1, 1 × 2), so long scenes get a place too.
  const shapes = [[2, 2], [2, 1], [1, 2]] as const;
  for (let round = 0; round < budget && placed < budget; round++) {
    let any = false;
    for (const [w, h] of shapes) {
      if (placed >= budget) break;
      const fitting = pool.filter((sc) => sc.w === Math.max(w, h) && sc.h === Math.min(w, h));
      const scene = fitting[0];
      if (!scene) continue;
      const spots: [number, number][] = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) spots.push([c, r]);
      const spot = rng.shuffle(spots).find(([c, r]) => {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!ok(c + x, r + y)) return false;
        return true;
      });
      if (!spot) continue;
      const [c, r] = spot;
      pool.splice(pool.indexOf(scene), 1);
      // Keep a tile of air around each scene.
      for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (c + x >= 0 && r + y >= 0 && c + x < cols && r + y < rows) taken[(r + y) * cols + c + x] = true;
      const a = tileCenter(level, r * cols + c);
      const b = tileCenter(level, (r + h - 1) * cols + c + w - 1);
      const mid = a.add(b).multiplyScalar(0.5);
      // Upright scenes keep their front (+z) toward the camera; others turn at random.
      const yaw = h > w ? Math.PI / 2 : scene.upright ? 0 : rng.chance(0.5) ? 0 : Math.PI;
      const quarter = w === h && !scene.upright ? rng.int(0, 3) * (Math.PI / 2) : 0;
      out.push(...toItems(scene, mid.x, 0, mid.z, yaw + quarter, 1, rng, TOY_BOOST));
      placed++;
      any = true;
    }
    if (!any) break;
  }
  return out;
}

/** Room-sized scenes around the diorama on the floor at y = floorY. */
export function outsideScenes(level: YardLevel, biome: string, border: number, floorY: number): PlacedProp[] {
  const rng = new Pcg32(hashSeed(level.seed, 'room'));
  const ex = level.cols / 2 + border + 0.6;
  const ez = level.rows / 2 + border + 0.6;
  const scenes = rng.shuffle([...(OUTSIDE[biome] ?? OUTSIDE.rug ?? [])]);
  const holiday = activeHoliday()?.skin.outside;
  if (holiday?.length) scenes.unshift(...rng.shuffle([...holiday]));
  const out: PlacedProp[] = [];
  const centers: { x: number; z: number; r: number }[] = [];
  // Behind the yard (−z) and to the sides; the camera's side stays clear.
  const slots: [number, number][] = rng.shuffle([
    [-ex * 0.55, -ez - 2.6],
    [ex * 0.45, -ez - 2.4],
    [-ex - 2.5, -ez * 0.3],
    [ex + 2.5, ez * 0.1],
    [-ex - 2.4, ez * 0.55],
    [ex + 2.6, -ez * 0.6],
  ]);
  for (const scene of [...scenes, ...rng.shuffle([...scenes])]) {
    const slot = slots.find(([x, z]) => !centers.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + scene.w + 0.8));
    if (!slot) break;
    slots.splice(slots.indexOf(slot), 1);
    const [x, z] = slot;
    centers.push({ x, z, r: scene.w });
    for (const p of toItems(scene, x, floorY, z, rng.float(-0.6, 0.6), 1, rng)) out.push({ ...p, radius: 0.5 * p.prop.scale * 0.35 });
  }
  return out;
}
