import { describe, expect, it } from 'vitest';
import { BIOMES, LEVEL_COUNT, biomeOf, factoryCount, levelLabel, recipeFor, switchCount } from '../../src/engine/campaign';

// specs/data-model.md §Campaign table: [switches, factories] per level.
const EXPECTED: [number, number][] = [
  [1, 1], [1, 2], [1, 2], [2, 3], [2, 3], [3, 3], [3, 3],
  [2, 3], [2, 3], [2, 3], [2, 3], [3, 4], [3, 4], [4, 4],
  [3, 3], [3, 4], [4, 4], [4, 5], [4, 5], [5, 5], [5, 5],
  [4, 4], [4, 3], [5, 4], [4, 6], [5, 6], [5, 6], [6, 7],
];

// spec FR-036 ranges per biome: [orderLines, switches, factories, distractors, wagons] as [min, max].
const RANGES: Record<string, [number, number][]> = {
  rug: [[1, 2], [1, 3], [1, 3], [1, 3], [1, 2]],
  candy: [[2, 3], [2, 4], [2, 4], [1, 3], [2, 3]],
  garden: [[2, 3], [3, 5], [3, 5], [2, 4], [3, 3]],
  space: [[2, 3], [4, 6], [3, 7], [1, 3], [3, 3]],
};

describe('campaign', () => {
  it('has 28 levels in four biomes of exactly seven, in order', () => {
    expect(LEVEL_COUNT).toBe(28);
    expect(BIOMES.map((b) => b.id)).toEqual(['rug', 'candy', 'garden', 'space']);
    for (let level = 1; level <= 28; level++) {
      expect(biomeOf(level).id).toBe(BIOMES[Math.floor((level - 1) / 7)]?.id);
    }
    expect(() => recipeFor(0)).toThrow();
    expect(() => recipeFor(29)).toThrow();
    expect(levelLabel(10)).toBe('Candy Kingdom · 3');
  });

  it('derives switch and factory counts as in the data model', () => {
    for (let level = 1; level <= 28; level++) {
      const r = recipeFor(level);
      expect([switchCount(r), factoryCount(r)]).toEqual(EXPECTED[level - 1]);
    }
  });

  it('stays within the FR-036 difficulty ranges', () => {
    for (let level = 1; level <= 28; level++) {
      const r = recipeFor(level);
      const [lines, sw, fac, dis, wag] = RANGES[r.biome] as [number, number][];
      const within = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;
      expect(within(r.orderLength, lines), `level ${level} lines`).toBe(true);
      expect(within(switchCount(r), sw), `level ${level} switches`).toBe(true);
      expect(within(factoryCount(r), fac), `level ${level} factories`).toBe(true);
      expect(within(r.distractors.length, dis), `level ${level} distractors`).toBe(true);
      expect(within(r.wagons, wag), `level ${level} wagons`).toBe(true);
      expect(r.mustLoop).toBe(level >= 10);
      expect(r.dual).toBe(level >= 22);
    }
  });

  it('gives every level a distinct, stable seed', () => {
    const seeds = new Set<number>();
    for (let level = 1; level <= 28; level++) seeds.add(recipeFor(level).seed);
    expect(seeds.size).toBe(28);
    expect(recipeFor(5).seed).toBe(recipeFor(5).seed);
  });
});
