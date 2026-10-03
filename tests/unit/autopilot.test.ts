import { describe, expect, it } from 'vitest';
import { Autopilot, runRoute } from '../../src/engine/autopilot';
import { generateLevel } from '../../src/engine/levelGenerator';
import { Simulation } from '../../src/engine/simulation';

describe('autopilot', () => {
  it('follows a route that laps a holding loop', () => {
    const n = Array.from({ length: 60 }, (_, i) => i + 8).find((k) => {
      const d = generateLevel(k);
      const hold = d.switches.find((s) => s.kind === 'hold');
      return hold && d.routes.standard.switchPlan.filter((p) => p.switch === hold.id).length === 2;
    });
    expect(n).toBeDefined();
    const level = generateLevel(n!);
    const sim = runRoute(level, level.routes.standard);
    expect(sim.traversedLanes()).toEqual(level.routes.standard.lanes);
  });

  it('flips switches during planning toward the first required lane', () => {
    const level = generateLevel(5);
    const sim = new Simulation(level);
    new Autopilot(sim, level.routes.standard).update();
    const first = new Map<number, number>();
    for (const step of level.routes.standard.switchPlan) if (!first.has(step.switch)) first.set(step.switch, step.lane);
    for (const [id, lane] of first) expect(sim.switchLane(id)).toBe(lane);
  });
});
