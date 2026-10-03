import { describe, expect, it } from 'vitest';
import { factoryCount, recipeFor, switchCount } from '../../src/engine/campaign';
import { trainLength } from '../../src/engine/flow';
import { MAX_GEN_ATTEMPTS, MUST_LOOP_WINDOW, generateFromRecipe, generateLevel, validateLevel } from '../../src/engine/levelGenerator';
import { TrackGraph } from '../../src/engine/trackGraph';

const STANDARD_LEVELS = Array.from({ length: 21 }, (_, i) => i + 1);

describe('levelGenerator (levels 1–21)', () => {
  it.each(STANDARD_LEVELS)('level %i regenerates identically (FR-030)', (level) => {
    const recipe = recipeFor(level);
    expect(generateFromRecipe(recipe)).toEqual(generateFromRecipe(recipe));
  });

  it.each(STANDARD_LEVELS)('level %i satisfies the level contract', (level) => {
    const recipe = recipeFor(level);
    const def = generateLevel(level);
    expect(validateLevel(def, recipe)).toEqual([]);
    expect(def.attempt).toBeLessThan(MAX_GEN_ATTEMPTS);
    // FR-033: exact recipe counts.
    expect(def.switches).toHaveLength(switchCount(recipe));
    expect(def.factories).toHaveLength(factoryCount(recipe));
    expect(def.order.lines).toHaveLength(recipe.orderLength);
    expect(def.distractors.map((d) => d.kind).sort()).toEqual([...recipe.distractors].sort());
    // FR-008 / FR-009: no dead ends, loops longer than the train.
    const graph = TrackGraph.fromLevel(def);
    expect(graph.allReachStore()).toBe(true);
    expect(graph.shortestCycle()).toBeGreaterThan(trainLength(recipe.wagons) + 0.5);
    // Order quantities are wagon count × per-wagon dose of the matching required factory.
    const required = def.factories.filter((f) => f.kind === 'required');
    for (const line of def.order.lines) {
      const funnel = def.funnels.find((f) => f.type === line.type && required.some((r) => r.funnels.includes(f.id)));
      expect(funnel, `${line.type} factory`).toBeDefined();
      expect(line.quantity).toBe((funnel?.dose ?? 0) * recipe.wagons);
    }
    const perWagon = def.order.lines.reduce((s, l) => s + l.quantity, 0) / recipe.wagons;
    expect(perWagon).toBeGreaterThanOrEqual(64);
    expect(perWagon).toBeLessThanOrEqual(74);
  });

  it.each(STANDARD_LEVELS.filter((l) => l >= 10))('level %i has a must-loop window in [3, 6] s (FR-035)', (level) => {
    const def = generateLevel(level);
    const window = def.routes.standard.loopWindow;
    expect(window).not.toBeNull();
    expect(window as number).toBeGreaterThanOrEqual(MUST_LOOP_WINDOW[0]);
    expect(window as number).toBeLessThanOrEqual(MUST_LOOP_WINDOW[1]);
    // The loop switch is met twice on the standard route: first into the loop, then straight on.
    const loopSwitch = def.switches.find((s) => s.kind === 'loop');
    const steps = def.routes.standard.switchPlan.filter((s) => s.switch === loopSwitch?.id);
    expect(steps).toHaveLength(2);
    expect(steps[0]?.lane).not.toBe(steps[1]?.lane);
  });

  it.each(STANDARD_LEVELS.filter((l) => l < 10))('level %i never needs a flip while running', (level) => {
    const def = generateLevel(level);
    const seen = new Map<number, number>();
    for (const step of def.routes.standard.switchPlan) {
      const prev = seen.get(step.switch);
      if (prev !== undefined) expect(step.lane).toBe(prev);
      seen.set(step.switch, step.lane);
    }
  });
});
