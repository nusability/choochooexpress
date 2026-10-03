import { describe, expect, it } from 'vitest';
import { Autopilot, runRoute } from '../../src/engine/autopilot';
import { generateLevel } from '../../src/engine/levelGenerator';
import { Simulation } from '../../src/engine/simulation';
import type { LevelDefinition, SimEvent } from '../../src/engine/types';

function runUntil(sim: Simulation, done: () => boolean, maxTicks = 60 * 300) {
  while (!done() && sim.tick < maxTicks && sim.phase === 'running') sim.step();
}

describe('switching (US1)', () => {
  const level1 = generateLevel(1);
  const bay = level1.switches[0];

  it('applies planning flips immediately', () => {
    const sim = new Simulation(level1);
    const before = sim.switchState(0);
    expect(sim.flip(0)).toBe('flipped');
    expect(sim.switchState(0)).toBe(1 - before);
    expect(sim.drainEvents()).toEqual([{ t: 'switch', tick: 0, switch: 0, state: 1 - before }]);
    expect(sim.replay().flips).toEqual([[0, 0]]);
  });

  it('queues running flips to the next tick', () => {
    const sim = new Simulation(level1);
    sim.go();
    const before = sim.switchState(0);
    expect(sim.flip(0)).toBe('queued');
    expect(sim.switchState(0)).toBe(before);
    sim.step();
    expect(sim.switchState(0)).toBe(1 - before);
    expect(sim.replay().flips).toEqual([[1, 0]]);
  });

  it('refuses flips while paused, delivered or derailed', () => {
    const sim = new Simulation(level1);
    sim.go();
    sim.pause();
    expect(sim.flip(0)).toBe('refused');
    sim.resume();
    expect(sim.flip(0)).toBe('queued');
  });

  it('chooses the lane when the engine enters the switch tile, and locks the switch while occupied', () => {
    // Level 1 starts with its loop-bay switch turned into the bay (FR-034).
    expect(bay?.kind).toBe('distractor');
    const sim = new Simulation(level1);
    const diverge = bay?.lanes[bay.initial] as number;
    expect(level1.routes.standard.switchPlan.some((s) => s.lane === diverge)).toBe(false);
    sim.go();
    runUntil(sim, () => sim.traversedLanes().includes(diverge));
    expect(sim.traversedLanes()).toContain(diverge);
    // The train is on the switch tile now: flipping is refused.
    expect(sim.isSwitchLocked(0)).toBe(true);
    expect(sim.flip(0)).toBe('locked');
    expect(sim.drainEvents().some((e) => e.t === 'switchLocked')).toBe(true);
    // Once the train has left the switch tile, the flip works and the train leaves the bay next time.
    runUntil(sim, () => !sim.isSwitchLocked(0));
    expect(sim.flip(0)).toBe('queued');
    runUntil(sim, () => sim.phase !== 'running');
    expect(sim.phase).toBe('delivered');
    const straight = bay?.lanes[1 - (bay?.initial ?? 0)] as number;
    expect(sim.traversedLanes()).toContain(straight);
  });

  it('stops at the store and reports a result', () => {
    const sim = runRoute(level1, level1.routes.standard);
    expect(sim.phase).toBe('delivered');
    expect(sim.result()).not.toBeNull();
    expect(sim.traversedLanes().at(-1)).toBe(level1.store.lane);
    const tickBefore = sim.tick;
    sim.step();
    expect(sim.tick).toBe(tickBefore);
  });

  it('replays deterministically (FR-011)', () => {
    const level: LevelDefinition = generateLevel(12);
    const record = (): SimEvent[] => {
      const sim = new Simulation(level);
      const pilot = new Autopilot(sim, level.routes.standard);
      pilot.update();
      sim.go();
      const events: SimEvent[] = [...sim.drainEvents()];
      while (sim.phase === 'running' && sim.tick < 60 * 300) {
        pilot.update();
        sim.step();
        events.push(...sim.drainEvents());
      }
      return events;
    };
    const a = record();
    const b = record();
    expect(a.length).toBeGreaterThan(100);
    expect(a).toEqual(b);
  });
});
