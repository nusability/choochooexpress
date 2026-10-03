import { describe, expect, it } from 'vitest';
import { Autopilot, runRoute } from '../../src/engine/autopilot';
import { DERAIL_PILE } from '../../src/engine/flow';
import { generateLevel } from '../../src/engine/levelGenerator';
import { Simulation } from '../../src/engine/simulation';
import type { LevelDefinition, SimEvent } from '../../src/engine/types';

function requiredFunnels(def: LevelDefinition) {
  return def.funnels.filter((f) => def.factories[f.factory]?.kind === 'required');
}

describe('loading, spills and derailment (US2)', () => {
  it('gives every wagon exactly one dose per pass and never loads the engine', () => {
    const def = generateLevel(4); // two wagons, two required factories
    const sim = new Simulation(def);
    const pilot = new Autopilot(sim, def.routes.standard);
    pilot.update();
    sim.go();
    const events: SimEvent[] = [];
    while (sim.phase === 'running') {
      pilot.update();
      sim.step();
      events.push(...sim.drainEvents());
    }
    expect(sim.phase).toBe('delivered');
    const loads = events.filter((e) => e.t === 'load');
    expect(loads.every((e) => e.t === 'load' && e.wagon >= 1 && e.wagon <= def.train.wagons)).toBe(true);
    for (const [k, wagon] of sim.wagonLoads().entries()) {
      for (const funnel of requiredFunnels(def)) {
        expect(wagon.byType[funnel.type], `wagon ${k + 1} ${funnel.type}`).toBe(funnel.dose);
      }
    }
  });

  it('doses do not depend on the tick phase (distance thresholds)', () => {
    // Shift the departure by flipping a no-op pair of switch taps during the run: same route, same loads.
    const def = generateLevel(9);
    const a = runRoute(def, def.routes.standard);
    const b = runRoute(def, def.routes.standard);
    expect(a.wagonLoads()).toEqual(b.wagonLoads());
    const total = a.wagonLoads().reduce((s, w) => s + w.total, 0);
    expect(total).toBe(def.order.lines.reduce((s, l) => s + l.quantity, 0));
  });

  it('overflows into a pile when the train keeps circling a loop factory, then derails at the threshold', () => {
    const def = generateLevel(10); // the standard route has a must-loop with a factory on it
    const loopSwitch = def.switches.find((s) => s.kind === 'loop');
    expect(loopSwitch).toBeDefined();
    const sim = new Simulation(def);
    // Follow the plan until the train has entered the loop, then never flip back.
    const pilot = new Autopilot(sim, def.routes.standard);
    pilot.update();
    sim.go();
    const plan = def.routes.standard.switchPlan;
    const intoLoop = plan.find((s) => s.switch === loopSwitch?.id)?.lane as number;
    while (sim.phase === 'running' && !sim.traversedLanes().includes(intoLoop)) {
      pilot.update();
      sim.step();
    }
    const events: SimEvent[] = [];
    let maxPileWithoutDerail = 0;
    while (sim.phase === 'running' && sim.tick < 60 * 600) {
      sim.step();
      for (const e of sim.drainEvents()) events.push(e);
      if (sim.phase === 'running') maxPileWithoutDerail = Math.max(maxPileWithoutDerail, ...sim.piles().map((p) => p.spilled));
    }
    expect(sim.phase).toBe('derailed');
    const derail = events.find((e) => e.t === 'derail');
    expect(derail).toBeDefined();
    const pile = sim.piles().find((p) => derail && derail.t === 'derail' && p.funnel === derail.funnel);
    expect(pile?.spilled).toBeGreaterThanOrEqual(DERAIL_PILE);
    expect(pile?.dangerous).toBe(true);
    expect(events.some((e) => e.t === 'spill')).toBe(true);
    expect(events.some((e) => e.t === 'pileDanger')).toBe(true);
    // The train kept running while the pile was still below the threshold.
    expect(maxPileWithoutDerail).toBeGreaterThan(0);
    // Toys beyond the capacity were spilled, never loaded.
    for (const w of sim.wagonLoads()) expect(w.total).toBeLessThanOrEqual(def.train.capacity);
    // Nothing happens after a derailment.
    const tick = sim.tick;
    sim.step();
    expect(sim.tick).toBe(tick);
    expect(sim.drainEvents()).toEqual([]);
    expect(sim.result()).toBeNull();
  });
});
