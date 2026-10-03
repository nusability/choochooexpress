import { describe, expect, it } from 'vitest';
import { yardRecipe } from '../../src/engine/campaign';
import { yardScore } from '../../src/engine/scoring';
import { defaultPlan, runPlan, type YardLevel } from '../../src/engine/yard';
import { generateYard, generateYardFromRecipe } from '../../src/engine/yardGen';

const LEVELS = Array.from({ length: 60 }, (_, i) => i + 1);
const levels = new Map<number, YardLevel>();
const times = new Map<number, number>();
for (const n of LEVELS) {
  const t0 = performance.now();
  levels.set(n, generateYard(n));
  times.set(n, performance.now() - t0);
}
const lv = (n: number) => levels.get(n) as YardLevel;

describe('shunting levels 1–60 (FR-107)', () => {
  it.each(LEVELS)('level %i: its solution delivers the goal in par steps; the untouched yard does not', (n) => {
    const level = lv(n);
    expect(level.goal.length).toBeGreaterThan(0);
    const run = runPlan(level, level.solution);
    expect(run).toMatchObject({ outcome: 'delivered', success: true, steps: level.par });
    expect(level.solution.pads.length).toBeLessThanOrEqual(level.pads);
    expect(runPlan(level, defaultPlan(level)).success).toBe(false);
  });

  it('generates deterministically and quickly', () => {
    for (const n of [1, 13, 40]) expect(JSON.stringify(generateYardFromRecipe(yardRecipe(n)))).toBe(JSON.stringify(lv(n)));
    for (const n of LEVELS) expect(times.get(n)).toBeLessThan(3000);
  });

  it('ramps difficulty: more wagons, pads, factory kinds and special switches', () => {
    expect(lv(1).wagons).toHaveLength(1);
    expect(lv(1).pads).toBe(0);
    expect(lv(40).wagons.length).toBeGreaterThanOrEqual(4);
    expect(lv(40).pads).toBe(3);
    const kinds = new Set(LEVELS.filter((n) => n >= 20).flatMap((n) => lv(n).factories.map((f) => f.kind)));
    expect([...kinds].sort()).toEqual(['converter', 'loader', 'single', 'swap', 'washer']);
    const switchKinds = new Set(LEVELS.filter((n) => n >= 20).flatMap((n) => lv(n).switches.map((s) => s.kind)));
    expect([...switchKinds].sort()).toEqual(['alternating', 'linked', 'manual', 'trigger']);
    // Most later levels need an uncoupler.
    const needPads = LEVELS.filter((n) => n >= 10).filter((n) => lv(n).solution.pads.length > 0).length;
    expect(needPads / 51).toBeGreaterThan(0.6);
  });
});

describe('yard stars (FR-105)', () => {
  it('gives 3 stars at par, 2 within 25%, 1 otherwise, and marks runs shorter than par', () => {
    expect(yardScore(true, 40, 40)).toEqual({ stars: 3, score: 1000, beatPar: false });
    expect(yardScore(true, 36, 40)).toEqual({ stars: 3, score: 1111, beatPar: true });
    expect(yardScore(true, 50, 40).stars).toBe(2);
    expect(yardScore(true, 51, 40).stars).toBe(1);
    expect(yardScore(false, 30, 40)).toEqual({ stars: 0, score: 0, beatPar: false });
  });
});
