import { describe, expect, it } from 'vitest';
import { runRoute } from '../../src/engine/autopilot';
import { recipeFor } from '../../src/engine/campaign';
import { STAR_1_RATIO } from '../../src/engine/flow';
import { generateFromRecipe, generateLevel, validateLevel } from '../../src/engine/levelGenerator';
import { Simulation } from '../../src/engine/simulation';
import type { LevelDefinition } from '../../src/engine/types';

const LEVELS = Array.from({ length: 100 }, (_, i) => i + 1);
const defs = new Map<number, LevelDefinition>();
const timings = new Map<number, number>();
for (const n of LEVELS) {
  const t0 = performance.now();
  defs.set(n, generateLevel(n));
  timings.set(n, performance.now() - t0);
}
const def = (n: number) => defs.get(n) as LevelDefinition;

function idle(level: LevelDefinition): Simulation {
  const sim = new Simulation(level);
  sim.go();
  while (sim.phase === 'running' && sim.tick < 60 * 400) sim.step();
  return sim;
}

describe('levels 1–100 (US10, FR-081, FR-082, SC-014, SC-015)', () => {
  it.each(LEVELS)('level %i is valid, scores 100% on its intended route, and fails when left alone', (n) => {
    const level = def(n);
    expect(validateLevel(level)).toEqual([]);
    const route = level.routes.secret ?? level.routes.standard;
    const sim = runRoute(level, route);
    expect(sim.phase).toBe('delivered');
    expect(sim.traversedLanes()).toEqual(route.lanes);
    expect(sim.result()).toMatchObject({ ratio: 1, score: 1000, stars: 3, nSpilled: 0 });
    const left = idle(level).result();
    expect(left === null || left.ratio < STAR_1_RATIO).toBe(true);
  });

  it('generates every level in under a second and identically every time (SC-006, SC-015)', () => {
    for (const n of LEVELS) expect(timings.get(n)).toBeLessThan(1000);
    for (const n of [1, 17, 40, 99]) expect(JSON.stringify(generateFromRecipe(recipeFor(n)))).toBe(JSON.stringify({ ...def(n) }));
  });

  it('builds one chute per wagon and a station long enough for the train (FR-072, FR-073)', () => {
    for (const n of LEVELS) {
      const level = def(n);
      expect(level.order.lines.map((l) => l.wagon)).toEqual(Array.from({ length: level.train.wagons }, (_, k) => k + 1));
      expect(level.station.lanes.length).toBeGreaterThanOrEqual(level.train.length + 0.6);
      expect(level.station.lane).toBe(level.station.lanes.at(-1));
      for (const f of level.factories) if (f.kind !== 'decoy') expect(level.order.lines[f.target - 1]?.type).toBe(f.type);
    }
  });

  it('keeps wagon capacity tight (FR-078)', () => {
    for (const n of LEVELS) {
      const level = def(n);
      const most = Math.max(...level.order.lines.map((l) => l.quantity));
      expect(level.train.capacity).toBe(most + 3);
    }
  });

  it('makes timing matter: a batch caught one wagon later goes into the wrong chute', () => {
    const level = def(12);
    const shifted: LevelDefinition = { ...level, factories: level.factories.map((f) => ({ ...f, phase: (f.phase + 35) % f.period })) };
    const sim = runRoute(shifted, shifted.routes.secret ?? shifted.routes.standard);
    expect(sim.result()?.ratio ?? 0).toBeLessThan(1);
  });

  it('places crossings, bridges and tunnels as the difficulty allows (F-011, SC-017)', () => {
    for (let n = 1; n <= 3; n++) expect(def(n).crossings.length + def(n).bridges.length + def(n).tunnels.length).toBe(0);
    for (let n = 1; n <= 8; n++) expect(def(n).bridges).toHaveLength(0);
    for (let n = 1; n <= 11; n++) expect(def(n).tunnels.filter((t) => !t.lanes.some((l) => (def(n).routes.secret?.lanes ?? []).includes(l)))).toHaveLength(0);
    const rich = LEVELS.filter((n) => n >= 15).filter((n) => def(n).crossings.length + def(n).bridges.length + def(n).tunnels.length > 0);
    expect(rich.length / LEVELS.filter((n) => n >= 15).length).toBeGreaterThanOrEqual(0.8);
    expect(LEVELS.filter((n) => def(n).bridges.length > 0).length).toBeGreaterThan(10);
    expect(LEVELS.filter((n) => def(n).tunnels.length > 0).length).toBeGreaterThan(10);
  });

  it('uses the full recipe on almost every level', () => {
    expect(LEVELS.filter((n) => def(n).relaxed > 0).length).toBeLessThanOrEqual(10);
  });

  it('keeps pure holding loops rare and out of world 1 (FR-083)', () => {
    const holds = LEVELS.filter((n) => def(n).switches.some((s) => s.kind === 'hold'));
    expect(holds.every((n) => n >= 8)).toBe(true);
    expect(holds.length).toBeLessThanOrEqual(45);
  });
});
