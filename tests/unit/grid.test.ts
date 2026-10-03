import { describe, expect, it } from 'vitest';
import {
  CURVE_LENGTH, E, N, S, W, dirBetween, edgeMid, laneKind, laneLengthOf, lanePoint, neighbor, opposite, tileIndex,
} from '../../src/engine/grid';
import type { Dir } from '../../src/engine/types';

const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe('grid', () => {
  it('has consistent directions and neighbours', () => {
    expect(opposite(N)).toBe(S);
    expect(opposite(E)).toBe(W);
    const cols = 5, rows = 4;
    const t = tileIndex(2, 1, cols);
    expect(neighbor(t, N, cols, rows)).toBe(tileIndex(2, 0, cols));
    expect(neighbor(t, E, cols, rows)).toBe(tileIndex(3, 1, cols));
    expect(neighbor(tileIndex(0, 0, cols), N, cols, rows)).toBe(-1);
    expect(dirBetween(t, tileIndex(1, 1, cols), cols)).toBe(W);
  });

  it('classifies and measures lanes', () => {
    expect(laneKind(W, E)).toBe('straight');
    expect(laneKind(W, N)).toBe('curve');
    expect(laneLengthOf('straight')).toBe(1);
    expect(laneLengthOf('curve')).toBeCloseTo(Math.PI / 4, 12);
    expect(() => laneKind(N, N)).toThrow();
  });

  it('starts and ends lanes on edge midpoints for every entry/exit pair', () => {
    const dirs: Dir[] = [N, E, S, W];
    for (const from of dirs) {
      for (const to of dirs) {
        if (from === to) continue;
        const len = laneLengthOf(laneKind(from, to));
        const p0 = lanePoint(3, 2, from, to, 0);
        const p1 = lanePoint(3, 2, from, to, len);
        const a = edgeMid(3, 2, from);
        const b = edgeMid(3, 2, to);
        close(p0.x, a.x); close(p0.y, a.y);
        close(p1.x, b.x); close(p1.y, b.y);
      }
    }
  });

  it('heads into the tile at the start and out of it at the end of a curve', () => {
    // Enter from W (travelling east), leave through N (travelling north).
    const start = lanePoint(0, 0, W, N, 0);
    const end = lanePoint(0, 0, W, N, CURVE_LENGTH);
    close(Math.cos(start.heading), 1); close(Math.sin(start.heading), 0);
    close(Math.cos(end.heading), 0); close(Math.sin(end.heading), -1);
    // Curve points keep radius 0.5 from the shared corner (0, 0).
    const mid = lanePoint(0, 0, W, N, CURVE_LENGTH / 2);
    close(Math.hypot(mid.x, mid.y), 0.5);
  });

  it('connects continuously across neighbouring tiles', () => {
    const a = lanePoint(1, 1, W, E, 1);
    const b = lanePoint(2, 1, W, S, 0);
    close(a.x, b.x); close(a.y, b.y);
    close(a.heading, b.heading);
  });
});
