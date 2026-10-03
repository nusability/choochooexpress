import { describe, expect, it } from 'vitest';
import { E, N, S, W, neighbor, opposite, tileIndex } from '../../src/engine/grid';
import { Pcg32 } from '../../src/engine/prng';
import { routeTrack, type Step } from '../../src/engine/router';

const cols = 8, rows = 8;

function check(steps: Step[], start: number, startFrom: number, goal: number, goalTo: number) {
  expect(steps[0]?.tile).toBe(start);
  expect(steps[0]?.from).toBe(startFrom);
  expect(steps.at(-1)?.tile).toBe(goal);
  expect(steps.at(-1)?.to).toBe(goalTo);
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1] as Step;
    const cur = steps[i] as Step;
    expect(neighbor(prev.tile, prev.to, cols, rows)).toBe(cur.tile);
    expect(cur.from).toBe(opposite(prev.to));
    expect(cur.from).not.toBe(cur.to);
  }
  expect(new Set(steps.map((s) => s.tile)).size).toBe(steps.length);
}

describe('routeTrack', () => {
  it('connects start and goal with the requested entry and exit edges', () => {
    const start = tileIndex(1, 6, cols);
    const goal = tileIndex(6, 1, cols);
    const steps = routeTrack({ cols, rows, isFree: () => true, start, startFrom: S, goal, goalTo: N, rng: new Pcg32(1) });
    expect(steps).not.toBeNull();
    check(steps as Step[], start, S, goal, N);
  });

  it('avoids blocked tiles', () => {
    const blocked = new Set<number>();
    for (let r = 0; r < 7; r++) blocked.add(tileIndex(4, r, cols)); // a wall with a gap at the bottom row
    const start = tileIndex(1, 1, cols);
    const goal = tileIndex(6, 1, cols);
    const steps = routeTrack({
      cols, rows, isFree: (t) => !blocked.has(t), start, startFrom: W, goal, goalTo: E, rng: new Pcg32(2),
    }) as Step[];
    expect(steps).not.toBeNull();
    check(steps, start, W, goal, E);
    for (const s of steps) expect(blocked.has(s.tile)).toBe(false);
    expect(steps.some((s) => s.tile === tileIndex(4, 7, cols))).toBe(true);
  });

  it('returns null when the goal is unreachable', () => {
    const wall = new Set<number>();
    for (let r = 0; r < rows; r++) wall.add(tileIndex(4, r, cols));
    const steps = routeTrack({
      cols, rows, isFree: (t) => !wall.has(t), start: tileIndex(1, 1, cols), startFrom: W,
      goal: tileIndex(6, 1, cols), goalTo: E, rng: new Pcg32(3),
    });
    expect(steps).toBeNull();
  });

  it('handles a single-tile path and rejects a U-turn on it', () => {
    const t = tileIndex(3, 3, cols);
    expect(routeTrack({ cols, rows, isFree: () => true, start: t, startFrom: W, goal: t, goalTo: N, rng: new Pcg32(4) }))
      .toEqual([{ tile: t, from: W, to: N }]);
    expect(routeTrack({ cols, rows, isFree: () => true, start: t, startFrom: W, goal: t, goalTo: W, rng: new Pcg32(4) }))
      .toBeNull();
  });

  it('is deterministic for the same seed', () => {
    const req = { cols, rows, isFree: () => true, start: tileIndex(0, 7, cols), startFrom: S as 2, goal: tileIndex(7, 0, cols), goalTo: N as 0 };
    const a = routeTrack({ ...req, rng: new Pcg32(9) });
    const b = routeTrack({ ...req, rng: new Pcg32(9) });
    expect(a).toEqual(b);
  });
});
