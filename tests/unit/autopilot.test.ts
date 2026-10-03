import { describe, expect, it } from 'vitest';
import { runRoute } from '../../src/engine/autopilot';
import { generateLevel } from '../../src/engine/levelGenerator';

const STANDARD_LEVELS = Array.from({ length: 21 }, (_, i) => i + 1);

describe('standard routes are solvable by construction (FR-032, SC-004)', () => {
  it.each(STANDARD_LEVELS)('level %i: the standard route scores 1000 with 3 stars and no spills', (level) => {
    const def = generateLevel(level);
    const sim = runRoute(def, def.routes.standard);
    expect(sim.phase).toBe('delivered');
    const result = sim.result();
    expect(result?.nSpilled).toBe(0);
    expect(result?.nCorrect).toBe(def.order.lines.reduce((s, l) => s + l.quantity, 0));
    expect(result?.score).toBe(1000);
    expect(result?.stars).toBe(3);
    expect(result?.loadedLines).toEqual(def.order.lines);
    expect(sim.traversedLanes()).toEqual(def.routes.standard.lanes);
  });
});
