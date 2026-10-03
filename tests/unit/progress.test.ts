import { describe, expect, it } from 'vitest';
import {
  applyResult, defaultSave, furthestUnlocked, furthestWorld, isUnlocked, parseSave, serializeSave, totalStars, worldStars,
} from '../../src/engine/progress';

describe('save model v2 (contracts/save-format.md, FR-085)', () => {
  it('starts fresh with only level 1 unlocked', () => {
    const save = defaultSave();
    expect(isUnlocked(save, 1)).toBe(true);
    expect(isUnlocked(save, 2)).toBe(false);
    expect(totalStars(save)).toBe(0);
    expect(furthestUnlocked(save)).toBe(1);
    expect(furthestWorld(save)).toBe(1);
  });

  it('unlocks the next level when a level is passed, without end', () => {
    let save = defaultSave();
    for (let level = 1; level <= 40; level++) save = applyResult(save, level, { stars: 1, score: 700, secretRoute: false }).save;
    expect(isUnlocked(save, 41)).toBe(true);
    expect(isUnlocked(save, 42)).toBe(false);
    expect(furthestUnlocked(save)).toBe(41);
    expect(furthestWorld(save)).toBe(6);
    expect(worldStars(save, 2)).toBe(7);
    save = applyResult(save, 5000, { stars: 2, score: 900, secretRoute: false }).save;
    expect(isUnlocked(save, 5001)).toBe(true);
    expect(furthestUnlocked(save)).toBe(5001);
  });

  it('never lowers best stars or score (FR-029) and keeps the secret mark once found', () => {
    let save = defaultSave();
    const first = applyResult(save, 3, { stars: 3, score: 1000, secretRoute: true });
    expect(first.newBest).toBe(true);
    save = first.save;
    const worse = applyResult(save, 3, { stars: 1, score: 760, secretRoute: false });
    expect(worse.newBest).toBe(false);
    expect(worse.save.levels['3']).toEqual({ stars: 3, best: 1000, secret: true });
  });

  it('round-trips through JSON', () => {
    let save = defaultSave();
    save = applyResult(save, 1, { stars: 3, score: 1000, secretRoute: false }).save;
    save = { ...save, settings: { muted: true } };
    expect(parseSave(serializeSave(save))).toEqual(save);
  });

  it('migrates a v1 save from the 28-level campaign as it is', () => {
    const v1 = { version: 1, levels: { 1: { stars: 3, best: 1000, secret: false }, 22: { stars: 2, best: 1300, secret: true } }, settings: { muted: true } };
    const save = parseSave(JSON.stringify(v1));
    expect(save.version).toBe(2);
    expect(save.levels).toEqual(v1.levels);
    expect(save.settings.muted).toBe(true);
    expect(isUnlocked(save, 23)).toBe(true);
  });

  it.each([
    ['missing', null],
    ['not JSON', '{oops'],
    ['unknown version', JSON.stringify({ version: 3, levels: {}, settings: { muted: false } })],
    ['levels not an object', JSON.stringify({ version: 2, levels: [], settings: { muted: false } })],
    ['stars out of range', JSON.stringify({ version: 2, levels: { 1: { stars: 4, best: 0, secret: false } }, settings: { muted: false } })],
    ['negative best', JSON.stringify({ version: 2, levels: { 1: { stars: 1, best: -5, secret: false } }, settings: { muted: false } })],
    ['muted not boolean', JSON.stringify({ version: 2, levels: {}, settings: { muted: 'yes' } })],
  ])('treats a %s save as a fresh start', (_name, json) => {
    expect(parseSave(json)).toEqual(defaultSave());
  });

  it('drops unknown level keys without discarding the rest', () => {
    const json = JSON.stringify({ version: 2, levels: { 1: { stars: 2, best: 950, secret: false }, 0: { stars: 3, best: 1, secret: false }, x: 1 }, settings: { muted: false } });
    expect(parseSave(json).levels).toEqual({ 1: { stars: 2, best: 950, secret: false } });
  });
});
