// Directed lane graph over the tile grid: lookup, successor resolution and validation helpers.
import { lanePoint, neighbor, opposite, tileCol, tileRow, type LanePoint } from './grid';
import type { Lane, LevelDefinition, SwitchDef } from './types';

export interface TrackLayout {
  cols: number;
  rows: number;
  lanes: Lane[];
  switches: SwitchDef[];
  storeLane: number;
}

export class TrackGraph {
  readonly cols: number;
  readonly rows: number;
  readonly lanes: readonly Lane[];
  readonly storeLane: number;
  private readonly entry = new Map<number, number[]>();
  private readonly switchByTile = new Map<number, SwitchDef>();
  private readonly succ: number[][];

  constructor(layout: TrackLayout) {
    this.cols = layout.cols;
    this.rows = layout.rows;
    this.lanes = layout.lanes;
    this.storeLane = layout.storeLane;
    for (const lane of layout.lanes) {
      const key = lane.tile * 4 + lane.from;
      const list = this.entry.get(key);
      if (list) list.push(lane.id);
      else this.entry.set(key, [lane.id]);
    }
    for (const sw of layout.switches) this.switchByTile.set(sw.tile, sw);
    this.succ = layout.lanes.map((lane) => {
      if (lane.id === layout.storeLane) return [];
      const t = neighbor(lane.tile, lane.to, this.cols, this.rows);
      if (t < 0) return [];
      return [...(this.entry.get(t * 4 + opposite(lane.to)) ?? [])];
    });
  }

  static fromLevel(level: LevelDefinition): TrackGraph {
    return new TrackGraph({
      cols: level.cols,
      rows: level.rows,
      lanes: level.lanes,
      switches: level.switches,
      storeLane: level.station.lane,
    });
  }

  lane(id: number): Lane {
    const lane = this.lanes[id];
    if (!lane) throw new Error(`Unknown lane ${id}`);
    return lane;
  }

  lanesInto(tile: number, from: number): readonly number[] {
    return this.entry.get(tile * 4 + from) ?? [];
  }

  /** Lanes that may follow `laneId`: one, two at a switch, none at the end of the track. */
  successors(laneId: number): readonly number[] {
    return this.succ[laneId] ?? [];
  }

  switchAt(tile: number): SwitchDef | undefined {
    return this.switchByTile.get(tile);
  }

  /** The lane taken after `laneId` given the current switch states, or -1 at the end of the track. */
  next(laneId: number, stateOf: (sw: SwitchDef) => 0 | 1): number {
    const options = this.successors(laneId);
    if (options.length === 0) return -1;
    if (options.length === 1) return options[0] as number;
    const first = this.lane(options[0] as number);
    const sw = this.switchByTile.get(first.tile);
    if (!sw) throw new Error(`Lane ${laneId} branches without a switch`);
    return sw.lanes[stateOf(sw)];
  }

  point(laneId: number, u: number, out?: LanePoint): LanePoint {
    const lane = this.lane(laneId);
    return lanePoint(tileCol(lane.tile, this.cols), tileRow(lane.tile, this.cols), lane.from, lane.to, u, out);
  }

  /** Height (deck units) at distance `u` along a lane. */
  height(laneId: number, u: number): number {
    const lane = this.lane(laneId);
    const t = lane.length > 0 ? Math.min(1, Math.max(0, u / lane.length)) : 0;
    return lane.z0 + (lane.z1 - lane.z0) * t;
  }

  /** True when the store lane can be reached from every lane (no dead ends, FR-008). */
  allReachStore(): boolean {
    const pred: number[][] = this.lanes.map(() => []);
    this.lanes.forEach((lane) => {
      for (const s of this.successors(lane.id)) pred[s]?.push(lane.id);
    });
    const seen = new Uint8Array(this.lanes.length);
    const stack = [this.storeLane];
    seen[this.storeLane] = 1;
    while (stack.length) {
      const id = stack.pop() as number;
      for (const p of pred[id] ?? []) {
        if (!seen[p]) {
          seen[p] = 1;
          stack.push(p);
        }
      }
    }
    return seen.every((v) => v === 1);
  }

  /** Length of the shortest directed cycle in the lane graph (Infinity if there is none). */
  shortestCycle(): number {
    const n = this.lanes.length;
    let best = Infinity;
    const dist = new Float64Array(n);
    const done = new Uint8Array(n);
    for (const start of this.lanes) {
      dist.fill(Infinity);
      done.fill(0);
      for (const s of this.successors(start.id)) dist[s] = Math.min(dist[s] as number, start.length);
      for (;;) {
        let u = -1;
        let ud = Infinity;
        for (let i = 0; i < n; i++) {
          if (!done[i] && (dist[i] as number) < ud) {
            ud = dist[i] as number;
            u = i;
          }
        }
        if (u < 0 || ud >= best) break;
        if (u === start.id) {
          best = ud;
          break;
        }
        done[u] = 1;
        const len = this.lane(u).length;
        for (const s of this.successors(u)) {
          if (ud + len < (dist[s] as number)) dist[s] = ud + len;
        }
      }
    }
    return best;
  }
}
