import { describe, expect, it } from 'vitest';
import { runRoute } from '../../src/engine/autopilot';
import { factoryCount, recipeFor, switchCount } from '../../src/engine/campaign';
import { MUST_LOOP_WINDOW, WINDOW_RATIO, generateFromRecipe, generateLevel, validateLevel } from '../../src/engine/levelGenerator';
import type { RouteInfo } from '../../src/engine/types';

const DUAL_LEVELS = [22, 23, 24, 25, 26, 27, 28];
const distinctSwitches = (r: RouteInfo) => new Set(r.switchPlan.map((s) => s.switch)).size;

describe('dual-solution levels 22–28 (US7)', () => {
  it.each(DUAL_LEVELS)('level %i regenerates identically and matches its recipe', (level) => {
    const recipe = recipeFor(level);
    const def = generateFromRecipe(recipe);
    expect(generateFromRecipe(recipe)).toEqual(def);
    expect(validateLevel(def, recipe)).toEqual([]);
    expect(def.switches).toHaveLength(switchCount(recipe));
    expect(def.factories).toHaveLength(factoryCount(recipe));
    expect(def.attempt).toBeLessThan(30);
  });

  it.each(DUAL_LEVELS)('level %i meets the A2 constraints', (level) => {
    const def = generateLevel(level);
    const p1 = def.routes.standard;
    const p2 = def.routes.secret as RouteInfo;
    expect(p2).not.toBeNull();
    // Two independent routes: they share only the depot run, the split and the final merge/store.
    const p1Tiles = new Set(p1.lanes.map((id) => def.lanes[id]?.tile));
    const sharedTiles = new Set(p2.lanes.map((id) => def.lanes[id]?.tile).filter((t) => p1Tiles.has(t)));
    const allowed = new Set([...def.depot.tiles, def.store.tile, def.switches.find((s) => s.kind === 'split')?.tile]);
    const mergeTile = def.lanes[p1.lanes[p1.lanes.length - 2] as number]?.tile;
    allowed.add(mergeTile);
    for (const t of sharedTiles) {
      const onDepotLeg = p1.lanes.indexOf(p1.lanes.find((id) => def.lanes[id]?.tile === t) as number) < p1.lanes.findIndex((id) => def.switches.some((s) => s.kind === 'split' && s.lanes.includes(id)));
      expect(allowed.has(t) || onDepotLeg, `tile ${t} shared`).toBe(true);
    }
    // Cost(P2) ≤ 0.85 · Cost(P1) (FR-055).
    expect(p2.cost).toBeLessThanOrEqual(0.85 * p1.cost);
    // Δt(P2) = 0.5 · Δt(P1) ± 15%, with the standard window ≥ 3 s (FR-035, FR-056).
    const ratio = (p2.loopWindow as number) / (p1.loopWindow as number);
    expect(ratio).toBeGreaterThanOrEqual(WINDOW_RATIO[0]);
    expect(ratio).toBeLessThanOrEqual(WINDOW_RATIO[1]);
    expect(p1.loopWindow as number).toBeGreaterThanOrEqual(MUST_LOOP_WINDOW[0]);
    // P2 passes a Dual Factory and fewer switches (FR-054).
    expect(def.factories.some((f) => f.kind === 'dual' && f.route === 'P2' && f.funnels.length === 2)).toBe(true);
    expect(distinctSwitches(p2)).toBeLessThan(distinctSwitches(p1));
  });

  it.each(DUAL_LEVELS)('level %i: standard route 1000 / 3★, secret route 1300 / 3★ (SC-005)', (level) => {
    const def = generateLevel(level);
    const standard = runRoute(def, def.routes.standard);
    expect(standard.phase).toBe('delivered');
    expect(standard.result()).toMatchObject({ score: 1000, stars: 3, nSpilled: 0, secretRoute: false, bonus: 0 });
    const secret = runRoute(def, def.routes.secret as RouteInfo);
    expect(secret.phase).toBe('delivered');
    expect(secret.result()).toMatchObject({ score: 1300, stars: 3, nSpilled: 0, secretRoute: true, bonus: 300 });
    expect(secret.result()?.loadedLines).toEqual(def.order.lines);
  });
});
