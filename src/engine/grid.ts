// Tile grid geometry. Tile (c, r) covers x ∈ [c, c+1], y ∈ [r, r+1]; y grows south.
import type { Dir, TileIndex } from './types';

export const N: Dir = 0;
export const E: Dir = 1;
export const S: Dir = 2;
export const W: Dir = 3;
export const DIRS: readonly Dir[] = [N, E, S, W];

export const DX: readonly number[] = [0, 1, 0, -1];
export const DY: readonly number[] = [-1, 0, 1, 0];

/** Heading angle (radians, y-down) of travel toward each direction. */
export const DIR_ANGLE: readonly number[] = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

export const CURVE_RADIUS = 0.5;
export const CURVE_LENGTH = Math.PI / 4;

export function opposite(d: Dir): Dir {
  return ((d + 2) & 3) as Dir;
}

export function turnLeft(d: Dir): Dir {
  return ((d + 3) & 3) as Dir;
}

export function turnRight(d: Dir): Dir {
  return ((d + 1) & 3) as Dir;
}

export function tileIndex(c: number, r: number, cols: number): TileIndex {
  return r * cols + c;
}

export function tileCol(t: TileIndex, cols: number): number {
  return t % cols;
}

export function tileRow(t: TileIndex, cols: number): number {
  return Math.floor(t / cols);
}

export function inBounds(c: number, r: number, cols: number, rows: number): boolean {
  return c >= 0 && r >= 0 && c < cols && r < rows;
}

/** Neighbour tile across edge `d`, or -1 outside the grid. */
export function neighbor(t: TileIndex, d: Dir, cols: number, rows: number): TileIndex {
  const c = tileCol(t, cols) + (DX[d] as number);
  const r = tileRow(t, cols) + (DY[d] as number);
  return inBounds(c, r, cols, rows) ? tileIndex(c, r, cols) : -1;
}

/** Direction from tile a to an adjacent tile b, or -1. */
export function dirBetween(a: TileIndex, b: TileIndex, cols: number): Dir | -1 {
  const dc = tileCol(b, cols) - tileCol(a, cols);
  const dr = tileRow(b, cols) - tileRow(a, cols);
  for (const d of DIRS) if (DX[d] === dc && DY[d] === dr) return d;
  return -1;
}

export function edgeMid(c: number, r: number, d: Dir): { x: number; y: number } {
  switch (d) {
    case N:
      return { x: c + 0.5, y: r };
    case E:
      return { x: c + 1, y: r + 0.5 };
    case S:
      return { x: c + 0.5, y: r + 1 };
    default:
      return { x: c, y: r + 0.5 };
  }
}

export function laneKind(from: Dir, to: Dir): 'straight' | 'curve' {
  if (from === to) throw new Error('A lane cannot leave through the edge it entered');
  return from === opposite(to) ? 'straight' : 'curve';
}

export function laneLengthOf(kind: 'straight' | 'curve'): number {
  return kind === 'straight' ? 1 : CURVE_LENGTH;
}

export interface LanePoint {
  x: number;
  y: number;
  heading: number;
}

/**
 * Point at distance `u` (0 … lane length) along a lane in tile (c, r) entering through `from`
 * and leaving through `to`. Curves are quarter circles of radius 0.5 around the tile corner
 * shared by both edges.
 */
export function lanePoint(c: number, r: number, from: Dir, to: Dir, u: number, out?: LanePoint): LanePoint {
  const p = out ?? { x: 0, y: 0, heading: 0 };
  const a = edgeMid(c, r, from);
  const b = edgeMid(c, r, to);
  if (from === opposite(to)) {
    const t = Math.min(1, Math.max(0, u));
    p.x = a.x + (b.x - a.x) * t;
    p.y = a.y + (b.y - a.y) * t;
    p.heading = DIR_ANGLE[to] as number;
    return p;
  }
  const horizontal = from === E || from === W ? from : to;
  const vertical = from === N || from === S ? from : to;
  const cx = c + (horizontal === E ? 1 : 0);
  const cy = r + (vertical === S ? 1 : 0);
  const a0 = Math.atan2(a.y - cy, a.x - cx);
  let sweep = Math.atan2(b.y - cy, b.x - cx) - a0;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  const t = Math.min(1, Math.max(0, u / CURVE_LENGTH));
  const theta = a0 + sweep * t;
  p.x = cx + CURVE_RADIUS * Math.cos(theta);
  p.y = cy + CURVE_RADIUS * Math.sin(theta);
  p.heading = theta + (sweep > 0 ? Math.PI / 2 : -Math.PI / 2);
  return p;
}
