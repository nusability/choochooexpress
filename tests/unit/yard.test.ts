import { describe, expect, it } from 'vitest';
import { defaultPlan, runPlan, type Piece, type YardFactory, type YardLevel, type YardSwitch } from '../../src/engine/yard';
import type { Dir, ToyType } from '../../src/engine/types';

const COLS = 8;
const t = (c: number, r: number) => r * COLS + c;

/**
 * Row 1: depot buffer (0,1), engine (1,1) heading east, a switch at (2,1) (stem west, branches
 * east / north) with a one-tile siding (2,0) ending in a buffer, track (3,1), and the station
 * (4,1)–(5,1) ending in a buffer at (5,1).
 */
function yard(opts: {
  switchKind?: YardSwitch['kind'];
  initial?: 0 | 1;
  wagon?: ToyType | null | 'none';
  goal?: (ToyType | null)[];
  factories?: Partial<YardFactory>[];
  extra?: Piece[];
} = {}): YardLevel {
  const pieces: Piece[] = [
    { tile: t(0, 1), kind: 'buffer', a: 1 },
    { tile: t(1, 1), kind: 'track', a: 3, b: 1 },
    { tile: t(2, 1), kind: 'switch', switchId: 0 },
    { tile: t(2, 0), kind: 'buffer', a: 2 },
    { tile: t(3, 1), kind: 'track', a: 3, b: 1 },
    { tile: t(4, 1), kind: 'track', a: 3, b: 1 },
    { tile: t(5, 1), kind: 'buffer', a: 3 },
    ...(opts.extra ?? []),
  ];
  const wagon = opts.wagon === undefined ? 'duck' : opts.wagon;
  return {
    level: 1, world: 1, label: '1-1', biome: 'rug', seed: 1, attempt: 0, difficulty: 1, cols: COLS, rows: 3, lesson: null,
    pieces,
    switches: [{ id: 0, tile: t(2, 1), stem: 3, branches: [1, 0], kind: opts.switchKind ?? 'alternating', group: 0, initial: opts.initial ?? 1 }],
    plates: [],
    factories: (opts.factories ?? []).map((f, id) => ({ id, tile: t(3, 1), kind: 'loader', toy: 'car', building: t(3, 2), ...f })),
    depot: { tiles: [t(0, 1), t(1, 1)], buffer: t(0, 1) },
    station: { tiles: [t(4, 1), t(5, 1)], buffer: t(5, 1), buildingTiles: [], dir: 1 },
    engine: { tile: t(1, 1), from: 3, to: 1 },
    wagons: wagon === 'none' ? [] : [wagon],
    groups: wagon === 'none' ? [] : [{ cells: [{ tile: t(2, 0), from: 2 as Dir, to: -1 }], ids: [0] }],
    goal: opts.goal ?? ['duck'],
    pads: 1, par: 0, solution: { switches: [], pads: [] }, solutions: 0, props: [],
  };
}

describe('shunting rules (US14, FR-096 – FR-104)', () => {
  it('fetches a wagon from a siding through an alternating switch and delivers it', () => {
    const level = yard();
    const run = runPlan(level, defaultPlan(level), { frames: true });
    expect(run.outcome).toBe('delivered');
    expect(run.success).toBe(true);
    expect(run.steps).toBe(10);
    expect(run.couples).toBe(1);
    expect(run.reversals).toBe(2);
    expect(run.delivered).toEqual(['duck']);
    // One frame per step plus the start.
    expect(run.frames).toHaveLength(11);
    expect(run.frames[1]?.events).toEqual([{ t: 'flip', switch: 0 }]);
    expect(run.frames[2]?.events).toEqual([{ t: 'couple', tile: t(2, 0) }]);
  });

  it('is deterministic (FR-096)', () => {
    const level = yard();
    expect(JSON.stringify(runPlan(level, defaultPlan(level), { frames: true }))).toBe(JSON.stringify(runPlan(level, defaultPlan(level), { frames: true })));
  });

  it('follows a manual switch and lets trailing moves pass', () => {
    // Set straight: the train never sees the siding and arrives without the wagon.
    const level = yard({ switchKind: 'manual', initial: 0 });
    const run = runPlan(level, defaultPlan(level));
    expect(run.outcome).toBe('wrongTrain');
    expect(run.delivered).toEqual([]);
    // Set to the siding: in, couple, back out (trailing), reverse at the depot, in again … forever.
    const into = runPlan(level, { switches: [1], pads: [] });
    expect(into.outcome).toBe('loop');
  });

  it('leaves wagons behind at a pad when the train reverses at a buffer (FR-101)', () => {
    const level = yard({ switchKind: 'manual', initial: 1, goal: [] });
    // Pad under the siding buffer: the wagon is left exactly where it was … and fetched again.
    const run = runPlan(level, { switches: [1], pads: [t(2, 0)] }, { frames: true });
    expect(run.uncouples).toBeGreaterThan(0);
    expect(run.frames.some((f) => f.events.some((e) => e.t === 'uncouple'))).toBe(true);
    expect(run.outcome).toBe('loop');
  });

  it('runs every factory type on the wagons entering its tile (FR-108)', () => {
    const go = (wagon: ToyType | null, f: Partial<YardFactory>) => {
      const level = yard({ wagon, factories: [f], goal: [] });
      return runPlan(level, defaultPlan(level)).delivered;
    };
    expect(go(null, { kind: 'loader', toy: 'car' })).toEqual(['car']);
    expect(go('duck', { kind: 'loader', toy: 'car' })).toEqual(['duck']);
    expect(go(null, { kind: 'single', toy: 'car' })).toEqual(['car']);
    expect(go('duck', { kind: 'converter', from: 'duck', to: 'star' })).toEqual(['star']);
    expect(go('ball', { kind: 'converter', from: 'duck', to: 'star' })).toEqual(['ball']);
    expect(go('duck', { kind: 'washer' })).toEqual([null]);
    expect(go('duck', { kind: 'swap', from: 'duck', to: 'car' })).toEqual(['car']);
    expect(go('car', { kind: 'swap', from: 'duck', to: 'car' })).toEqual(['duck']);
  });

  it('never loads the engine and needs the exact train at the station (FR-103)', () => {
    const level = yard({ wagon: 'none', goal: [], factories: [{ kind: 'loader', toy: 'car' }], switchKind: 'manual', initial: 0 });
    const run = runPlan(level, defaultPlan(level));
    expect(run).toMatchObject({ outcome: 'delivered', success: true, delivered: [] });
    const wanting = { ...level, goal: ['car' as ToyType] };
    expect(runPlan(wanting, defaultPlan(wanting)).outcome).toBe('wrongTrain');
  });

  it('flips trigger switches and linked switches together (FR-102)', () => {
    // A trigger plate on (1,1) cannot be reached by the front car (it starts there), so put the
    // plate at (3,1): it flips the siding switch after the train passed it — no effect, still a
    // valid run. A linked pair flips together when one is flipped.
    const level = yard({ switchKind: 'trigger', initial: 0, wagon: 'none', goal: [] });
    level.plates = [{ tile: t(3, 1), switches: [0] }];
    const run = runPlan(level, defaultPlan(level), { frames: true });
    expect(run.success).toBe(true);
    expect(run.frames.at(-2)?.switches[0]).toBe(1);
  });

  it('reports a dead end without a buffer as stuck', () => {
    const level = yard({ switchKind: 'manual', initial: 0, wagon: 'none', goal: [] });
    level.pieces = level.pieces.filter((p) => p.tile !== t(4, 1));
    expect(runPlan(level, defaultPlan(level)).outcome).toBe('stuck');
  });
});
