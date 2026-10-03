// The 28-level campaign (specs/data-model.md §Campaign table, spec FR-036 / FR-045).
import { hashSeed } from './prng';
import type { BiomeId, DistractorKind, LevelRecipe } from './types';

export interface BiomeInfo {
  id: BiomeId;
  name: string;
  firstLevel: number;
  speed: number;
  cols: number;
  rows: number;
}

export const LEVELS_PER_BIOME = 7;
export const LEVEL_COUNT = 28;

export const BIOMES: readonly BiomeInfo[] = [
  { id: 'rug', name: 'Living Room Rug', firstLevel: 1, speed: 1.0, cols: 7, rows: 9 },
  { id: 'candy', name: 'Candy Kingdom', firstLevel: 8, speed: 1.1, cols: 8, rows: 10 },
  { id: 'garden', name: 'Garden Sandbox', firstLevel: 15, speed: 1.2, cols: 9, rows: 11 },
  { id: 'space', name: 'Space Playroom', firstLevel: 22, speed: 1.3, cols: 11, rows: 14 },
];

type Row = [orderLength: number, wagons: number, mustLoop: boolean, dual: boolean, distractors: DistractorKind[]];

const TABLE: readonly Row[] = [
  // Living Room Rug
  [1, 1, false, false, ['loopBay']],
  [1, 1, false, false, ['decoy']],
  [2, 1, false, false, ['bypass']],
  [2, 2, false, false, ['decoy', 'loopBay']],
  [2, 2, false, false, ['bypass', 'decoy']],
  [2, 2, false, false, ['decoy', 'loopBay', 'bypass']],
  [2, 2, false, false, ['bypass', 'decoy', 'loopBay']],
  // Candy Kingdom
  [2, 2, false, false, ['decoy', 'bypass']],
  [3, 2, false, false, ['bypass', 'loopBay']],
  [2, 2, true, false, ['decoy']],
  [3, 3, true, false, ['bypass']],
  [3, 3, true, false, ['decoy', 'loopBay']],
  [3, 3, true, false, ['decoy', 'bypass']],
  [3, 3, true, false, ['decoy', 'bypass', 'loopBay']],
  // Garden Sandbox
  [2, 3, true, false, ['decoy', 'bypass']],
  [3, 3, true, false, ['decoy', 'loopBay']],
  [3, 3, true, false, ['decoy', 'bypass', 'loopBay']],
  [3, 3, true, false, ['decoy', 'decoy', 'bypass']],
  [3, 3, true, false, ['decoy', 'decoy', 'loopBay']],
  [3, 3, true, false, ['decoy', 'decoy', 'bypass', 'loopBay']],
  [3, 3, true, false, ['decoy', 'bypass', 'loopBay', 'decoy']],
  // Space Playroom (dual-solution levels; both routes contain their own loop)
  [2, 3, true, true, ['decoy']],
  [2, 3, true, true, ['bypass']],
  [2, 3, true, true, ['decoy', 'loopBay']],
  [3, 3, true, true, ['decoy']],
  [3, 3, true, true, ['decoy', 'bypass']],
  [3, 3, true, true, ['decoy', 'loopBay']],
  [3, 3, true, true, ['decoy', 'decoy', 'bypass']],
];

/**
 * Per-level seed offsets; a level whose layout needs replacing gets a new offset here. These were
 * chosen so every level generates within a handful of attempts (fast level loads).
 */
const SEED_SALT: Readonly<Record<number, number>> = { 7: 9, 20: 5, 25: 3, 26: 5, 27: 14, 28: 30 };

export function biomeOf(level: number): BiomeInfo {
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) throw new RangeError(`No level ${level}`);
  return BIOMES[Math.floor((level - 1) / LEVELS_PER_BIOME)] as BiomeInfo;
}

export function levelSeed(level: number): number {
  return hashSeed(0x5eedc0de, level * 1000 + (SEED_SALT[level] ?? 0));
}

export function recipeFor(level: number): LevelRecipe {
  const biome = biomeOf(level);
  const row = TABLE[level - 1] as Row;
  const [orderLength, wagons, mustLoop, dual, distractors] = row;
  return {
    level,
    biome: biome.id,
    seed: levelSeed(level),
    cols: biome.cols,
    rows: biome.rows,
    orderLength,
    wagons,
    speed: biome.speed,
    mustLoop,
    dual,
    distractors: [...distractors],
  };
}

export function switchCount(r: LevelRecipe): number {
  return r.distractors.length + (r.dual ? 3 : r.mustLoop ? 1 : 0);
}

export function factoryCount(r: LevelRecipe): number {
  const decoys = r.distractors.filter((d) => d === 'decoy').length;
  return r.orderLength + decoys + (r.dual ? (r.orderLength === 3 ? 2 : 1) : 0);
}

/** "Living Room Rug · 3" style label: biome name and the level's number within the biome. */
export function levelLabel(level: number): string {
  const biome = biomeOf(level);
  return `${biome.name} · ${level - biome.firstLevel + 1}`;
}
