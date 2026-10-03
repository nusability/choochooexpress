// Endless levels (spec F-010, research R27): worlds of 7 levels cycle through the four biomes, and
// difficulty climbs with the level number up to a ceiling at level 40 ("6-5").
import { Pcg32, hashSeed } from './prng';
import type { BiomeId } from './types';

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

// ---------------------------------------------------------------------------------------------
// Shunting yard recipes (F-014, FR-107): what a level of difficulty d may contain.

export interface YardRecipe {
  level: number;
  difficulty: number;
  world: number;
  biome: BiomeId;
  seed: number;
  cols: number;
  rows: number;
  wagons: number;
  goalLength: number;
  sidings: number;
  loops: number;
  pads: number;
  factories: number;
  factoryKinds: ('loader' | 'single' | 'converter' | 'washer' | 'swap')[];
  /** Wagons that start loaded (the rest start empty). */
  preloaded: number;
  alternating: number;
  linked: boolean;
  triggers: number;
  crossings: boolean;
  /** 0 = pick a common solution … 1 = pick the rarest. */
  rarity: number;
}

export function yardRecipe(level: number): YardRecipe {
  const d = difficultyOf(level);
  const world = worldOf(level);
  const seed = levelSeed(level);
  const dice = new Pcg32(hashSeed(seed, 'yard'));
  const wagons = d <= 2 ? 1 : d <= 6 ? 2 : d <= 14 ? 3 : d <= 26 ? 4 : 5;
  const kinds: YardRecipe['factoryKinds'] = ['loader'];
  if (d >= 5) kinds.push('washer');
  if (d >= 9) kinds.push('converter');
  if (d >= 13) kinds.push('single');
  if (d >= 17) kinds.push('swap');
  return {
    level,
    difficulty: d,
    world,
    biome: biomeOfWorld(world).id,
    seed,
    cols: 7 + Math.floor(ramp(d, 0, 2.99)),
    rows: 10 + Math.floor(ramp(d, 0, 4.99)),
    wagons,
    goalLength: Math.min(wagons, d <= 2 ? 1 : d <= 8 ? 2 : d <= 18 ? 3 : 4),
    sidings: Math.min(4, 1 + Math.floor(d / 8)),
    loops: d < 5 ? 0 : d < 20 ? 1 : 2,
    pads: d <= 2 ? 0 : d <= 9 ? 1 : d <= 23 ? 2 : 3,
    factories: Math.min(5, 1 + Math.floor(d / 7) + (dice.chance(0.4) ? 1 : 0)),
    factoryKinds: kinds,
    preloaded: d < 5 ? 0 : Math.min(wagons - 1, Math.floor(d / 12) + (dice.chance(0.5) ? 1 : 0)),
    alternating: d < 16 ? 1 : 2,
    linked: d >= 11 && dice.chance(0.6),
    triggers: d < 15 ? 0 : d < 28 ? 1 : 2,
    crossings: d >= 4,
    rarity: ramp(d, 0.25, 1),
  };
}
