import { describe, expect, it } from 'vitest';
import {
  applyResult, defaultSave, furthestUnlocked, isUnlocked, parseSave, serializeSave, totalStars, unlockedBiomes,
} from '../../src/engine/progress';

describe('save model (contracts/save-format.md)', () => {
  it('starts fresh with only level 1 unlocked', () => {
    const save = defaultSave();
    expect(isUnlocked(save, 1)).toBe(true);
    expect(isUnlocked(save, 2)).toBe(false);
    expect(totalStars(save)).toBe(0);
    expect(furthestUnlocked(save)).toBe(1);
    expect(unlockedBiomes(save)).toBe(1);
  });

  it('unlocks the next level when a level is passed', () => {
    let save = defaultSave();
    save = applyResult(save, 1, { stars: 2, score: 905, secretRoute: false }).save;
    expect(isUnlocked(save, 2)).toBe(true);
    expect(isUnlocked(save, 3)).toBe(false);
    expect(furthestUnlocked(save)).toBe(2);
  });

  it('opens the next biome after its last level', () => {
    let save = defaultSave();
    for (let level = 1; level <= 7; level++) save = applyResult(save, level, { stars: 1, score: 800, secretRoute: false }).save;
    expect(isUnlocked(save, 8)).toBe(true);
    expect(unlockedBiomes(save)).toBe(2);
  });

  it('never lowers best stars or score (FR-029)', () => {
    let save = defaultSave();
    const first = applyResult(save, 3, { stars: 3, score: 1000, secretRoute: false });
    expect(first.newBest).toBe(true);
    save = first.save;
    const worse = applyResult(save, 3, { stars: 1, score: 760, secretRoute: false });
    expect(worse.newBest).toBe(false);
    expect(worse.save.levels['3']).toEqual({ stars: 3, best: 1000, secret: false });
  });

  it('keeps the secret-route mark once found (dual levels only)', () => {
    let save = defaultSave();
    save = applyResult(save, 22, { stars: 3, score: 1300, secretRoute: true }).save;
    save = applyResult(save, 22, { stars: 3, score: 1000, secretRoute: false }).save;
    expect(save.levels['22']?.secret).toBe(true);
    expect(applyResult(defaultSave(), 5, { stars: 3, score: 1000, secretRoute: true }).save.levels['5']?.secret).toBe(false);
  });

  it('round-trips through JSON', () => {
    let save = defaultSave();
    save = applyResult(save, 1, { stars: 3, score: 1000, secretRoute: false }).save;
    save = { ...save, settings: { muted: true } };
    expect(parseSave(serializeSave(save))).toEqual(save);
  });

  it.each([
    ['missing', null],
    ['not JSON', '{oops'],
    ['wrong version', JSON.stringify({ version: 2, levels: {}, settings: { muted: false } })],
    ['levels not an object', JSON.stringify({ version: 1, levels: [], settings: { muted: false } })],
    ['stars out of range', JSON.stringify({ version: 1, levels: { 1: { stars: 4, best: 0, secret: false } }, settings: { muted: false } })],
    ['negative best', JSON.stringify({ version: 1, levels: { 1: { stars: 1, best: -5, secret: false } }, settings: { muted: false } })],
    ['secret on a normal level', JSON.stringify({ version: 1, levels: { 3: { stars: 1, best: 800, secret: true } }, settings: { muted: false } })],
    ['muted not boolean', JSON.stringify({ version: 1, levels: {}, settings: { muted: 'yes' } })],
  ])('treats a %s save as a fresh start', (_name, json) => {
    expect(parseSave(json)).toEqual(defaultSave());
  });

  it('drops unknown level keys without discarding the rest', () => {
    const json = JSON.stringify({ version: 1, levels: { 1: { stars: 2, best: 950, secret: false }, 99: { stars: 3, best: 1, secret: false }, x: 1 }, settings: { muted: false } });
    expect(parseSave(json).levels).toEqual({ 1: { stars: 2, best: 950, secret: false } });
  });
});
