// Save model v1 (specs/contracts/save-format.md): pure functions, never throw on bad input.
import { LEVEL_COUNT, biomeOf } from './campaign';

export const SAVE_KEY = 'ccxd3d.save';
export const SAVE_VERSION = 1;
const FIRST_DUAL_LEVEL = 22;

export interface LevelProgress {
  stars: 0 | 1 | 2 | 3;
  best: number;
  secret: boolean;
}

export interface SaveData {
  version: 1;
  levels: Record<string, LevelProgress>;
  settings: { muted: boolean };
}

export function defaultSave(): SaveData {
  return { version: 1, levels: {}, settings: { muted: false } };
}

function isLevelProgress(level: number, v: unknown): v is LevelProgress {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    Number.isInteger(o.stars) &&
    (o.stars as number) >= 0 &&
    (o.stars as number) <= 3 &&
    Number.isInteger(o.best) &&
    (o.best as number) >= 0 &&
    typeof o.secret === 'boolean' &&
    (!o.secret || level >= FIRST_DUAL_LEVEL)
  );
}

/** Parses a stored save. Any JSON error, wrong type or out-of-range value gives a fresh save. */
export function parseSave(json: string | null | undefined): SaveData {
  if (!json) return defaultSave();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return defaultSave();
  }
  if (typeof raw !== 'object' || raw === null) return defaultSave();
  const o = raw as Record<string, unknown>;
  if (o.version !== SAVE_VERSION) return defaultSave();
  const settings = o.settings as Record<string, unknown> | undefined;
  if (typeof settings !== 'object' || settings === null || typeof settings.muted !== 'boolean') return defaultSave();
  if (typeof o.levels !== 'object' || o.levels === null || Array.isArray(o.levels)) return defaultSave();
  const levels: Record<string, LevelProgress> = {};
  for (const [key, value] of Object.entries(o.levels as Record<string, unknown>)) {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 1 || n > LEVEL_COUNT || String(n) !== key) continue;
    if (!isLevelProgress(n, value)) return defaultSave();
    levels[key] = { stars: value.stars, best: value.best, secret: value.secret };
  }
  return { version: 1, levels, settings: { muted: settings.muted } };
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}

export function levelProgress(save: SaveData, level: number): LevelProgress {
  return save.levels[String(level)] ?? { stars: 0, best: 0, secret: false };
}

/** Level 1 is always open; level n opens once level n − 1 has at least one star (FR-047). */
export function isUnlocked(save: SaveData, level: number): boolean {
  if (level < 1 || level > LEVEL_COUNT) return false;
  if (level === 1) return true;
  return levelProgress(save, level - 1).stars >= 1;
}

export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((sum, l) => sum + l.stars, 0);
}

export function furthestUnlocked(save: SaveData): number {
  let level = 1;
  while (level < LEVEL_COUNT && isUnlocked(save, level + 1)) level++;
  return level;
}

export function unlockedBiomes(save: SaveData): number {
  let count = 0;
  for (let level = 1; level <= LEVEL_COUNT; level += 7) if (isUnlocked(save, level)) count++;
  return count;
}

export interface RunOutcome {
  stars: 0 | 1 | 2 | 3;
  score: number;
  secretRoute: boolean;
}

/** Records a delivered run; best stars and score never decrease (FR-029). */
export function applyResult(save: SaveData, level: number, outcome: RunOutcome): { save: SaveData; newBest: boolean } {
  const prev = levelProgress(save, level);
  const newBest = outcome.score > prev.best;
  const next: LevelProgress = {
    stars: Math.max(prev.stars, outcome.stars) as 0 | 1 | 2 | 3,
    best: Math.max(prev.best, outcome.score),
    secret: prev.secret || (outcome.secretRoute && level >= FIRST_DUAL_LEVEL),
  };
  return { save: { ...save, levels: { ...save.levels, [String(level)]: next } }, newBest };
}

/** Name of the biome a level belongs to (for unlock messages). */
export function biomeName(level: number): string {
  return biomeOf(level).name;
}
