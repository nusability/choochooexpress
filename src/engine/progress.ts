// Save model v2 (specs/contracts/save-format.md): endless levels (F-010, FR-085). Pure functions,
// never throw on bad input. A v1 save (28-level campaign) is migrated as it is.
import { LEVELS_PER_WORLD, MAX_LEVEL, isLevel, worldOf } from './campaign';

export const SAVE_KEY = 'ccxd3d.save';
export const SAVE_VERSION = 2;

export interface LevelProgress {
  stars: 0 | 1 | 2 | 3;
  best: number;
  secret: boolean;
}

export interface SaveData {
  version: 2;
  levels: Record<string, LevelProgress>;
  settings: { muted: boolean };
}

export function defaultSave(): SaveData {
  return { version: 2, levels: {}, settings: { muted: false } };
}

function isLevelProgress(v: unknown): v is LevelProgress {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    Number.isInteger(o.stars) &&
    (o.stars as number) >= 0 &&
    (o.stars as number) <= 3 &&
    Number.isInteger(o.best) &&
    (o.best as number) >= 0 &&
    typeof o.secret === 'boolean'
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
  if (o.version !== 1 && o.version !== SAVE_VERSION) return defaultSave();
  const settings = o.settings as Record<string, unknown> | undefined;
  if (typeof settings !== 'object' || settings === null || typeof settings.muted !== 'boolean') return defaultSave();
  if (typeof o.levels !== 'object' || o.levels === null || Array.isArray(o.levels)) return defaultSave();
  const levels: Record<string, LevelProgress> = {};
  for (const [key, value] of Object.entries(o.levels as Record<string, unknown>)) {
    const n = Number(key);
    if (!isLevel(n) || String(n) !== key) continue;
    if (!isLevelProgress(value)) return defaultSave();
    levels[key] = { stars: value.stars, best: value.best, secret: value.secret };
  }
  return { version: 2, levels, settings: { muted: settings.muted } };
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}

export function levelProgress(save: SaveData, level: number): LevelProgress {
  return save.levels[String(level)] ?? { stars: 0, best: 0, secret: false };
}

/** Level 1 is always open; level n opens once level n − 1 has at least one star (FR-047). */
export function isUnlocked(save: SaveData, level: number): boolean {
  if (!isLevel(level)) return false;
  if (level === 1) return true;
  return levelProgress(save, level - 1).stars >= 1;
}

export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((sum, l) => sum + l.stars, 0);
}

/** The highest unlocked level (levels after a passed level open, even past a gap). */
export function furthestUnlocked(save: SaveData): number {
  let level = 1;
  for (const [key, p] of Object.entries(save.levels)) {
    const n = Number(key);
    if (p.stars >= 1 && n + 1 > level && n < MAX_LEVEL) level = n + 1;
  }
  return level;
}

/** Highest world with an unlocked level. */
export function furthestWorld(save: SaveData): number {
  return worldOf(furthestUnlocked(save));
}

export function worldStars(save: SaveData, world: number): number {
  let sum = 0;
  for (let i = 0; i < LEVELS_PER_WORLD; i++) sum += levelProgress(save, (world - 1) * LEVELS_PER_WORLD + 1 + i).stars;
  return sum;
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
    secret: prev.secret || outcome.secretRoute,
  };
  return { save: { ...save, levels: { ...save.levels, [String(level)]: next } }, newBest };
}
