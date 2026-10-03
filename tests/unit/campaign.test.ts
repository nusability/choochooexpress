import { describe, expect, it } from 'vitest';
import { DIFFICULTY_CEILING, biomeOf, isLevel, levelLabel, levelTitle, recipeFor, worldOf } from '../../src/engine/campaign';

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
    expect(() => recipeFor(0)).toThrow(RangeError);
  });

  it('ramps difficulty monotonically up to the ceiling at level 40', () => {
    let prev = recipeFor(1);
    for (let n = 2; n <= 60; n++) {
      const r = recipeFor(n);
      expect(r.wagons).toBeGreaterThanOrEqual(prev.wagons);
      expect(r.factories).toBeGreaterThanOrEqual(prev.factories);
      expect(r.decoys).toBeGreaterThanOrEqual(prev.decoys);
      expect(r.cols).toBeGreaterThanOrEqual(prev.cols);
      expect(r.rows).toBeGreaterThanOrEqual(prev.rows);
      expect(r.speed).toBeGreaterThanOrEqual(prev.speed);
      prev = r;
    }
    expect(recipeFor(1)).toMatchObject({ wagons: 1, factories: 1, cols: 7, rows: 12, speed: 1, crossings: false });
    expect(recipeFor(DIFFICULTY_CEILING)).toMatchObject({ wagons: 4, cols: 10, rows: 18, speed: 1.3 });
    expect(recipeFor(4).crossings).toBe(true);
    expect(recipeFor(8).bridges).toBe(false);
    expect(recipeFor(9).bridges).toBe(true);
    expect(recipeFor(12).tunnels).toBe(true);
  });

  it('keeps the same difficulty settings from level 40 on (only the seed changes)', () => {
    const strip = (n: number) => {
      const r: Partial<ReturnType<typeof recipeFor>> = { ...recipeFor(n) };
      for (const key of ['level', 'seed', 'world', 'biome', 'hold', 'holdLap', 'factoryLoop', 'secret'] as const) delete r[key];
      return r;
    };
    expect(strip(75)).toEqual(strip(40));
    expect(strip(500)).toEqual(strip(40));
    expect(recipeFor(75).seed).not.toBe(recipeFor(40).seed);
  });

  it('keeps pure holding loops out of world 1 and rare elsewhere (FR-083)', () => {
    for (let n = 1; n <= 7; n++) expect(recipeFor(n).hold).toBe(false);
    const holds = Array.from({ length: 200 }, (_, i) => recipeFor(i + 8).hold).filter(Boolean).length;
    expect(holds / 200).toBeLessThan(0.45);
    expect(holds).toBeGreaterThan(0);
  });
});
