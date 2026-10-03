import { describe, expect, it } from 'vitest';
import { DT, DERAIL_PILE, wagonCenter } from '../../src/engine/flow';
import { Simulation, ticksToDrop } from '../../src/engine/simulation';
import type { SimEvent } from '../../src/engine/types';
import { lineLevel, ringLevel } from './fixtures';

/** Tick at which the point `behind` the engine front reaches distance D on the line (speed 1, start 4). */
const tickAt = (D: number, behind: number) => Math.round((D + behind - 4) / DT);

function runAll(sim: Simulation, maxTicks = 60 * 120): SimEvent[] {
  const events: SimEvent[] = [];
  sim.go();
  while (sim.phase === 'running' && sim.tick < maxTicks) {
    sim.step();
    events.push(...sim.drainEvents());
  }
  return events;
}

describe('timed batches (US9, FR-069 – FR-071)', () => {
  it('drops the batch into the wagon under the hopper', () => {
    const phase = tickAt(6.5, wagonCenter(2));
    const sim = new Simulation(lineLevel({ factories: [{ phase, period: 2000, batch: 12 }] }));
    const drops = runAll(sim).filter((e) => e.t === 'drop');
    expect(drops).toEqual([{ t: 'drop', tick: phase, factory: 0, car: 2, type: 'duck', caught: 12, spilled: 0 }]);
    expect(sim.wagonLoads()[1]).toEqual({ total: 12, byType: { duck: 12 } });
    expect(sim.spilled()).toBe(0);
  });

  it('spills the whole batch when the engine is under the hopper', () => {
    const phase = tickAt(6.5, 0.3);
    const sim = new Simulation(lineLevel({ factories: [{ phase, period: 2000, batch: 12 }] }));
    const events = runAll(sim);
    expect(events.find((e) => e.t === 'drop')).toMatchObject({ car: 0, caught: 0, spilled: 12 });
    expect(sim.piles()[0]?.spilled).toBe(12);
    expect(sim.wagonLoads().every((w) => w.total === 0)).toBe(true);
  });

  it('skips a batch when nothing is under the hopper', () => {
    const sim = new Simulation(lineLevel({ factories: [{ phase: 30, period: 2000 }] }));
    const events = runAll(sim);
    expect(events.filter((e) => e.t === 'skip')).toEqual([{ t: 'skip', tick: 30, factory: 0 }]);
    expect(events.some((e) => e.t === 'drop')).toBe(false);
    expect(sim.spilled()).toBe(0);
  });

  it('fills a wagon only up to its capacity and spills the rest', () => {
    const phase = tickAt(6.5, wagonCenter(1));
    const sim = new Simulation(lineLevel({ capacity: 7, factories: [{ phase, period: 2000, batch: 10 }] }));
    expect(runAll(sim).find((e) => e.t === 'drop')).toMatchObject({ car: 1, caught: 7, spilled: 3 });
    expect(sim.piles()[0]?.spilled).toBe(3);
  });

  it('drops on every period; a period longer than the passing time catches at most one batch per pass', () => {
    const phase = tickAt(6.5, wagonCenter(1));
    const sim = new Simulation(lineLevel({ factories: [{ phase: phase % 150, period: 150 }] }));
    const events = runAll(sim);
    const ticks = events.filter((e) => e.t === 'drop' || e.t === 'skip').map((e) => e.tick);
    expect(ticks.slice(0, 3)).toEqual([phase - 150, phase, phase + 150]);
    expect(events.filter((e) => e.t === 'drop')).toHaveLength(1);
  });

  it('counts down to the next drop, frozen during planning (FR-069)', () => {
    expect(ticksToDrop({ period: 100, phase: 0 }, 0)).toBe(100);
    expect(ticksToDrop({ period: 100, phase: 30 }, 0)).toBe(30);
    expect(ticksToDrop({ period: 100, phase: 30 }, 30)).toBe(100);
    expect(ticksToDrop({ period: 100, phase: 30 }, 31)).toBe(99);
    const sim = new Simulation(lineLevel({ factories: [{ phase: 90, period: 120 }] }));
    expect(sim.factoryClock(0).seconds).toBeCloseTo(1.5, 9);
    sim.go();
    for (let i = 0; i < 30; i++) sim.step();
    expect(sim.factoryClock(0).seconds).toBeCloseTo(1.0, 9);
    expect(sim.factoryClock(0).progress).toBeCloseTo(0.5, 9);
  });
});

describe('piles and derailment (FR-016, FR-017, SC-009)', () => {
  // On the ring, wagon 1 passes the hopper every lap; with capacity 0 every caught batch spills.
  const lapDrop = (batch: number) => {
    const level = ringLevel({ capacity: 0, factories: [{ batch, period: 100000, phase: 0 }] });
    // Find the tick at which wagon 1 is under the hopper on the first lap.
    const probe = new Simulation(level);
    probe.go();
    let phase = -1;
    while (probe.tick < 2000) {
      probe.step();
      if ((probe as unknown as { carUnder(f: unknown): number }).carUnder(level.factories[0]) === 1) {
        phase = probe.tick + 5;
        break;
      }
    }
    (level.factories[0] as { phase: number }).phase = phase;
    return new Simulation(level);
  };

  it('derails when the engine reaches a pile at the threshold', () => {
    const sim = lapDrop(DERAIL_PILE);
    const events = runAll(sim, 60 * 60);
    expect(events.some((e) => e.t === 'pileDanger')).toBe(true);
    expect(sim.phase).toBe('derailed');
    expect(events.at(-1)).toMatchObject({ t: 'derail', factory: 0 });
  });

  it('never derails below the threshold', () => {
    const sim = lapDrop(DERAIL_PILE - 1);
    const events = runAll(sim, 60 * 60);
    expect(sim.piles()[0]?.spilled).toBe(DERAIL_PILE - 1);
    expect(events.some((e) => e.t === 'derail')).toBe(false);
    expect(sim.phase).toBe('running');
  });
});

describe('slopes and the station (FR-072, FR-077)', () => {
  it('slows down uphill and speeds up downhill', () => {
    const flat = new Simulation(lineLevel());
    runAll(flat);
    const hilly = new Simulation(lineLevel({ lanes: { 5: { z1: 1, speed: 0.6 }, 6: { z0: 1, z1: 1 }, 7: { z0: 1, speed: 1.5 } } }));
    runAll(hilly);
    const extra = (1 / 0.6 + 1 / 1.5 - 2) / DT;
    expect(hilly.result()?.ticks).toBe(Math.ceil((flat.result()?.ticks ?? 0) + extra - 1e-6));
  });

  it('lifts and tilts the cars on a ramp', () => {
    const sim = new Simulation(lineLevel({ wagons: 1, lanes: { 5: { z1: 1, speed: 0.6 }, 6: { z0: 1, z1: 1 }, 7: { z0: 1, speed: 1.5 } } }));
    sim.go();
    while (sim.engineDistance() < 5.6) sim.step();
    const engine = sim.carPoses()[0];
    expect(engine?.z).toBeGreaterThan(0);
    expect(engine?.pitch).toBeGreaterThan(0);
    while (sim.engineDistance() < 7.6) sim.step();
    expect(sim.carPoses()[0]?.pitch).toBeLessThan(0);
  });

  it('stops with the engine at the buffer and every wagon at its chute', () => {
    const sim = new Simulation(lineLevel({ wagons: 3 }));
    runAll(sim);
    expect(sim.phase).toBe('delivered');
    expect(sim.engineDistance()).toBeCloseTo(14, 9);
    sim.carPoses().forEach((p, k) => {
      if (k > 0) expect(p.x).toBeCloseTo(14 - wagonCenter(k), 6);
    });
    const r = sim.result();
    expect(r?.chutes.map((c) => c.wanted)).toEqual([10, 10, 10]);
    expect(r?.ratio).toBe(0);
  });

  it('runs the platform slower than the open track', () => {
    const sim = new Simulation(lineLevel({ station: 4 }));
    runAll(sim);
    // 6 tiles at speed 1 (after the depot), 4 platform tiles at 0.6.
    expect(sim.result()?.ticks).toBe(Math.ceil((6 + 4 / 0.6) / DT - 1e-6));
  });
});
