// Endless levels (spec F-010, research R27): worlds of 7 levels cycle through the four biomes, and
// difficulty climbs with the level number up to a ceiling at level 40 ("6-5").
import { Pcg32, hashSeed } from './prng';
import type { BiomeId, LevelRecipe } from './types';

export interface BiomeInfo {
  id: BiomeId;
  name: string;
}

export const LEVELS_PER_WORLD = 7;
export const DIFFICULTY_CEILING = 40;
/** Highest level number the game accepts (effectively endless). */
export const MAX_LEVEL = 999_999;

export const BIOMES: readonly BiomeInfo[] = [
  { id: 'rug', name: 'Living Room Rug' },
  { id: 'candy', name: 'Candy Kingdom' },
  { id: 'garden', name: 'Garden Sandbox' },
  { id: 'space', name: 'Space Playroom' },
];

export function isLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL;
}

function check(level: number): void {
  if (!isLevel(level)) throw new RangeError(`No level ${level}`);
}

export function worldOf(level: number): number {
  check(level);
  return Math.floor((level - 1) / LEVELS_PER_WORLD) + 1;
}

/** First level of a world. */
export function firstLevelOf(world: number): number {
  return (world - 1) * LEVELS_PER_WORLD + 1;
}

export function biomeOfWorld(world: number): BiomeInfo {
  return BIOMES[(world - 1) % BIOMES.length] as BiomeInfo;
}

export function biomeOf(level: number): BiomeInfo {
  return biomeOfWorld(worldOf(level));
}

/** "6-5": world and the level's number within it (FR-079). */
export function levelLabel(level: number): string {
  const world = worldOf(level);
  return `${world}-${level - firstLevelOf(world) + 1}`;
}

/** "Garden Sandbox · 6-5". */
export function levelTitle(level: number): string {
  return `${biomeOf(level).name} · ${levelLabel(level)}`;
}

export function levelSeed(level: number): number {
  return hashSeed(0x5eedc0de, level);
}

export function difficultyOf(level: number): number {
  check(level);
  return Math.min(level, DIFFICULTY_CEILING);
}

/** Linear ramp over the difficulty range: `a` at d = 1, `b` at the ceiling. */
function ramp(d: number, a: number, b: number): number {
  return a + ((b - a) * (d - 1)) / (DIFFICULTY_CEILING - 1);
}

export function recipeFor(level: number): LevelRecipe {
  const d = difficultyOf(level);
  const world = worldOf(level);
  const seed = levelSeed(level);
  const dice = new Pcg32(hashSeed(seed, 'recipe'));
  const wagons = d <= 3 ? 1 : d <= 10 ? 2 : d <= 22 ? 3 : 4;
  const factories = Math.min(6, wagons + (d >= 14 ? 1 : 0) + (d >= 30 ? 1 : 0));
  const decoys = d < 2 ? 0 : d < 8 ? 1 : d < 20 ? 2 : 3;
  const bypasses = d < 26 ? 1 : 2;
  // Pure holding loops are rare and never in the first world (FR-083).
  const hold = d >= 8 && dice.chance(0.34);
  const holdLap = hold && dice.chance(0.6);
  const factoryLoop = d >= 16 && dice.chance(0.45);
  const secret = d >= 15 && dice.chance(0.4);
  return {
    level,
    difficulty: d,
    world,
    biome: biomeOfWorld(world).id,
    seed,
    cols: 7 + Math.floor(ramp(d, 0, 3.99)),
    rows: 12 + Math.floor(ramp(d, 0, 6.99)),
    wagons,
    factories,
    decoys,
    bypasses,
    hold,
    holdLap,
    factoryLoop,
    crossings: d >= 4,
    bridges: d >= 9,
    tunnels: d >= 12,
    secret,
    speed: Math.round(ramp(d, 1.0, 1.3) * 100) / 100,
    periodSlack: [ramp(d, 2.0, 0.4), ramp(d, 3.2, 1.4)],
    batch: [Math.round(ramp(d, 6, 9)), Math.round(ramp(d, 10, 18))],
  };
}
