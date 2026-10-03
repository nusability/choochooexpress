import { describe, expect, it } from 'vitest';
import { DIFFICULTY_CEILING, biomeOf, isLevel, levelLabel, levelTitle, worldOf, yardRecipe } from '../../src/engine/campaign';

describe('endless levels (US10, FR-079, FR-080)', () => {
  it('groups levels into worlds of 7 that cycle through the biomes', () => {
    expect(levelLabel(1)).toBe('1-1');
    expect(levelLabel(7)).toBe('1-7');
    expect(levelLabel(8)).toBe('2-1');
    expect(levelLabel(33)).toBe('5-5');
    expect(levelLabel(40)).toBe('6-5');
    expect(worldOf(29)).toBe(5);
    expect(biomeOf(1).id).toBe('rug');
    expect(biomeOf(15).id).toBe('garden');
    expect(biomeOf(29).id).toBe('rug');
    expect(biomeOf(1000).id).toBe(['rug', 'candy', 'garden', 'space'][(worldOf(1000) - 1) % 4]);
    expect(levelTitle(40)).toBe('Candy Kingdom · 6-5');
  });

  it('accepts any positive level number', () => {
    expect(isLevel(1)).toBe(true);
    expect(isLevel(123456)).toBe(true);
    expect(isLevel(0)).toBe(false);
    expect(isLevel(1.5)).toBe(false);
    expect(() => yardRecipe(0)).toThrow(RangeError);
  });

  it('ramps difficulty monotonically up to the ceiling at level 40', () => {
    let prev = yardRecipe(1);
    for (let n = 2; n <= 60; n++) {
      const r = yardRecipe(n);
      for (const k of ['wagons', 'goalLength', 'pads', 'loops', 'cols', 'rows', 'triggers'] as const) expect(r[k]).toBeGreaterThanOrEqual(prev[k]);
      expect(r.factoryKinds.length).toBeGreaterThanOrEqual(prev.factoryKinds.length);
      prev = r;
    }
    expect(yardRecipe(1)).toMatchObject({ wagons: 1, goalLength: 1, pads: 0, cols: 7, rows: 10, crossings: false });
    expect(yardRecipe(DIFFICULTY_CEILING)).toMatchObject({ wagons: 5, pads: 3, cols: 9, rows: 14 });
  });

  it('keeps the same difficulty settings from level 40 on (only the seed changes)', () => {
    const strip = (n: number) => {
      const r: Partial<ReturnType<typeof yardRecipe>> = { ...yardRecipe(n) };
      for (const key of ['level', 'seed', 'world', 'biome', 'factories', 'preloaded', 'linked'] as const) delete r[key];
      return r;
    };
    expect(strip(75)).toEqual(strip(40));
    expect(strip(500)).toEqual(strip(40));
    expect(yardRecipe(75).seed).not.toBe(yardRecipe(40).seed);
  });
});
