// A* track router on the tile grid (research R5, R26). States are (tile, entry edge); from each
// state a path may go straight or turn 90°, and may run straight across an existing perpendicular
// track (a crossing) when the request allows it. Paths never revisit a tile.
import { neighbor, opposite, tileCol, tileRow, turnLeft, turnRight } from './grid';
import type { Pcg32 } from './prng';
import type { Dir } from './types';

export interface Step {
  tile: number;
  from: Dir;
  to: Dir;
}

export interface RouteRequest {
  cols: number;
  rows: number;
  isFree(tile: number): boolean;
  /** Tiles already holding track or buildings (for the "keep some distance" penalty). */
  isOccupied?(tile: number): boolean;
  start: number;
  /** Edge through which the path enters `start`. */
  startFrom: Dir;
  goal: number;
  /** Edge through which the path must leave `goal`. */
  goalTo: Dir;
  rng: Pcg32;
  /**
   * May the path cross this occupied tile going straight along `travel` (a level crossing, FR-086)?
   * Crossing tiles can only be passed straight through.
   */
  canCross?(tile: number, travel: Dir): boolean;
  /** Extra cost of passing a crossing tile. */
  crossCost?: number;
  turnPenalty?: number;
  nearPenalty?: number;
  jitter?: number;
  maxExpansions?: number;
}

class MinHeap {
  private keys: number[] = [];
  private prio: number[] = [];
  get size(): number {
    return this.keys.length;
  }
  push(key: number, p: number): void {
    this.keys.push(key);
    this.prio.push(p);
    let i = this.keys.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if ((this.prio[parent] as number) <= p) break;
      this.swap(i, parent);
      i = parent;
    }
  }
  pop(): number {
    const top = this.keys[0] as number;
    const lastKey = this.keys.pop() as number;
    const lastPrio = this.prio.pop() as number;
    if (this.keys.length > 0) {
      this.keys[0] = lastKey;
      this.prio[0] = lastPrio;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.keys.length && (this.prio[l] as number) < (this.prio[m] as number)) m = l;
        if (r < this.keys.length && (this.prio[r] as number) < (this.prio[m] as number)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number): void {
    const k = this.keys[a] as number;
    this.keys[a] = this.keys[b] as number;
    this.keys[b] = k;
    const p = this.prio[a] as number;
    this.prio[a] = this.prio[b] as number;
    this.prio[b] = p;
  }
}

export function routeTrack(req: RouteRequest): Step[] | null {
  const { cols, rows, start, startFrom, goal, goalTo } = req;
  if (!req.isFree(start) || !req.isFree(goal)) return null;
  if (start === goal) return startFrom !== goalTo ? [{ tile: start, from: startFrom, to: goalTo }] : null;

  const turnPenalty = req.turnPenalty ?? 0.35;
  const nearPenalty = req.nearPenalty ?? 0.15;
  const jitterAmp = req.jitter ?? 0.2;
  const maxExpansions = req.maxExpansions ?? 40000;
  const crossCost = req.crossCost ?? 0.6;
  const tiles = cols * rows;
  const jitter = new Float64Array(tiles);
  for (let t = 0; t < tiles; t++) jitter[t] = req.rng.next() * jitterAmp;
  const near = new Float64Array(tiles);
  if (req.isOccupied) {
    for (let t = 0; t < tiles; t++) {
      for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
        const n = neighbor(t, d, cols, rows);
        if (n >= 0 && req.isOccupied(n)) {
          near[t] = nearPenalty;
          break;
        }
      }
    }
  }
  const gc = tileCol(goal, cols);
  const gr = tileRow(goal, cols);
  const h = (t: number) => Math.abs(tileCol(t, cols) - gc) + Math.abs(tileRow(t, cols) - gr);

  const g = new Float64Array(tiles * 4).fill(Infinity);
  const parent = new Int32Array(tiles * 4).fill(-1);
  const closed = new Uint8Array(tiles * 4);
  const open = new MinHeap();
  const startKey = start * 4 + startFrom;
  g[startKey] = 1;
  open.push(startKey, 1 + h(start));
  let found = -1;
  let expansions = 0;

  while (open.size > 0) {
    const key = open.pop();
    if (closed[key]) continue;
    closed[key] = 1;
    const tile = key >> 2;
    const from = (key & 3) as Dir;
    if (tile === goal) {
      if (from !== goalTo) {
        found = key;
        break;
      }
      continue;
    }
    if (++expansions > maxExpansions) break;
    const ahead = opposite(from);
    const crossing = tile !== start && !req.isFree(tile);
    for (const to of (crossing ? [ahead] : [ahead, turnLeft(ahead), turnRight(ahead)]) as Dir[]) {
      const next = neighbor(tile, to, cols, rows);
      if (next < 0) continue;
      const free = req.isFree(next);
      if (!free && !(next !== goal && req.canCross?.(next, to))) continue;
      const nkey = next * 4 + opposite(to);
      if (closed[nkey]) continue;
      const cost =
        (g[key] as number) +
        1 +
        (to !== ahead ? turnPenalty : 0) +
        (free ? (near[next] as number) : crossCost) +
        (jitter[next] as number);
      if (cost < (g[nkey] as number)) {
        g[nkey] = cost;
        parent[nkey] = key;
        open.push(nkey, cost + h(next));
      }
    }
  }
  if (found < 0) return null;

  const steps: Step[] = [];
  let key = found;
  let to: Dir = goalTo;
  while (key >= 0) {
    const tile = key >> 2;
    const from = (key & 3) as Dir;
    steps.push({ tile, from, to });
    to = opposite(from);
    key = parent[key] as number;
  }
  steps.reverse();
  const seen = new Set<number>();
  for (const s of steps) {
    if (seen.has(s.tile)) return null;
    seen.add(s.tile);
  }
  return steps;
}
