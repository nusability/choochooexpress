// Loop templates (research R5): a rectangle beside a straight route stretch M … W.
//
// Local frame: u runs along the route direction d (M at u = 0, chord tiles 1…k, W at u = k + 1),
// v runs toward `side` (the route is v = 0, the loop occupies v = 1 … h). The loop path leaves W
// sideways, runs around the rectangle u ∈ [−a, k + 1 + b] × v ∈ [1, h] and comes back into M.
import { CURVE_LENGTH, DX, DY, dirBetween, inBounds, laneKind, laneLengthOf, opposite, tileCol, tileIndex, tileRow } from './grid';
import type { Dir } from './types';

export interface LoopCell {
  tile: number;
  from: Dir;
  to: Dir;
}

export interface LoopShape {
  /** Loop tiles in travel order, from beside W to beside M. */
  cells: LoopCell[];
  mTile: number;
  wTile: number;
  /** Route tiles strictly between M and W. */
  chord: number[];
  d: Dir;
  side: Dir;
  k: number;
  a: number;
  b: number;
  h: number;
  /** Length of one lap: W's diverging lane + loop tiles + M's merging lane + chord. */
  circuit: number;
  /** W's diverging lane length (a curve). */
  switchLaneLength: number;
}

export interface LoopParams {
  cols: number;
  rows: number;
  mTile: number;
  d: Dir;
  /** Chord tiles between M and W (0–2). */
  k: number;
  side: Dir;
  a: number;
  b: number;
  h: number;
}

function localPath(k: number, a: number, b: number, h: number): [number, number][] | null {
  if (h < 1 || a < 0 || b < 0 || k < 0) return null;
  if (h === 1) {
    if (a !== 0 || b !== 0) return null;
    const cells: [number, number][] = [];
    for (let u = k + 1; u >= 0; u--) cells.push([u, 1]);
    return cells;
  }
  const cells: [number, number][] = [];
  const right = k + 1 + b;
  for (let u = k + 1; u <= right; u++) cells.push([u, 1]);
  for (let v = 2; v <= h; v++) cells.push([right, v]);
  for (let u = right - 1; u >= -a; u--) cells.push([u, h]);
  for (let v = h - 1; v >= 1; v--) cells.push([-a, v]);
  for (let u = -a + 1; u <= 0; u++) cells.push([u, 1]);
  return cells;
}

export function buildLoop(p: LoopParams): LoopShape | null {
  const { cols, rows, mTile, d, k, side, a, b, h } = p;
  if (side === d || side === opposite(d)) return null;
  const mc = tileCol(mTile, cols);
  const mr = tileRow(mTile, cols);
  const toTile = (u: number, v: number): number => {
    const c = mc + u * (DX[d] as number) + v * (DX[side] as number);
    const r = mr + u * (DY[d] as number) + v * (DY[side] as number);
    return inBounds(c, r, cols, rows) ? tileIndex(c, r, cols) : -1;
  };
  const wTile = toTile(k + 1, 0);
  if (wTile < 0) return null;
  const chord: number[] = [];
  for (let u = 1; u <= k; u++) chord.push(toTile(u, 0));
  const local = localPath(k, a, b, h);
  if (!local) return null;
  const tiles = local.map(([u, v]) => toTile(u, v));
  if (tiles.some((t) => t < 0)) return null;
  const cells: LoopCell[] = [];
  let circuit = CURVE_LENGTH * 2 + k;
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i] as number;
    const prev = i === 0 ? wTile : (tiles[i - 1] as number);
    const next = i === tiles.length - 1 ? mTile : (tiles[i + 1] as number);
    const from = dirBetween(tile, prev, cols);
    const to = dirBetween(tile, next, cols);
    if (from === -1 || to === -1 || from === to) return null;
    cells.push({ tile, from, to });
    circuit += laneLengthOf(laneKind(from, to));
  }
  return { cells, mTile, wTile, chord, d, side, k, a, b, h, circuit, switchLaneLength: CURVE_LENGTH };
}
