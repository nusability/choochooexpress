// Plan enumeration (research R33): every switch setting (one bit per linked group) times every way
// to place up to `pads` uncouplers on the tiles where a pad can matter. Bounded, so players may
// still find a plan shorter than par (FR-105).
import { neighbor, opposite } from './grid';
import { padAllowed, pieceAt, runPlan, type Plan, type RunResult, type YardLevel } from './yard';
import type { Dir } from './types';

export const PLAN_CAP = 1000;

/** Edges a piece connects. */
function edges(level: YardLevel, tile: number): Dir[] {
  const p = pieceAt(level)[tile];
  if (!p) return [];
  switch (p.kind) {
    case 'track':
      return [p.a as Dir, p.b as Dir];
    case 'buffer':
      return [p.a as Dir];
    case 'crossing':
      return [0, 1, 2, 3];
    case 'switch': {
      const sw = level.switches[p.switchId as number];
      return sw ? [sw.stem, ...sw.branches] : [];
    }
  }
}

/** Pad tiles within `reach` tiles of a buffer, the buffer included (the only places a pad can cut a train). */
export function padCandidates(level: YardLevel, reach = level.wagons.length + 1): number[] {
  const dist = new Map<number, number>();
  const queue: number[] = [];
  for (const p of level.pieces) {
    if (p.kind === 'buffer' && p.tile !== level.station.buffer) {
      dist.set(p.tile, 0);
      queue.push(p.tile);
    }
  }
  while (queue.length) {
    const t = queue.shift() as number;
    const d = dist.get(t) as number;
    if (d >= reach) continue;
    for (const e of edges(level, t)) {
      const n = neighbor(t, e, level.cols, level.rows);
      if (n < 0 || dist.has(n) || !edges(level, n).includes(opposite(e))) continue;
      dist.set(n, d + 1);
      queue.push(n);
    }
  }
  return [...dist.entries()]
    .filter(([t]) => padAllowed(level, t))
    .sort((x, y) => x[1] - y[1] || x[0] - y[0])
    .slice(0, 12)
    .map(([t]) => t)
    .sort((x, y) => x - y);
}

function subsets(items: readonly number[], maxSize: number): number[][] {
  const out: number[][] = [[]];
  const rec = (start: number, cur: number[]) => {
    if (cur.length >= maxSize) return;
    for (let i = start; i < items.length; i++) {
      const next = [...cur, items[i] as number];
      out.push(next);
      rec(i + 1, next);
    }
  };
  rec(0, []);
  return out;
}

/** Every plan in the bounded plan space, in a fixed order (capped by an even stride). */
export function enumeratePlans(level: YardLevel, cap = PLAN_CAP): Plan[] {
  const groups = [...new Set(level.switches.map((s) => s.group))];
  const padSets = subsets(padCandidates(level), level.pads);
  const total = (1 << groups.length) * padSets.length;
  const stride = Math.max(1, Math.ceil(total / cap));
  const plans: Plan[] = [];
  for (let i = 0; i < total; i += stride) {
    const bits = i % (1 << groups.length);
    const pads = padSets[Math.floor(i / (1 << groups.length))] as number[];
    const switches = level.switches.map((s) => (((bits >> groups.indexOf(s.group)) & 1) as 0 | 1));
    plans.push({ switches, pads });
  }
  return plans;
}

export interface Arrival {
  /** Delivered sequence key (see `goalKey`). */
  key: string;
  plan: Plan;
  result: RunResult;
}

export function goalKey(seq: readonly (string | null)[]): string {
  return seq.map((s) => s ?? '-').join(',');
}

/** Runs every plan and returns the ones that reach the station. */
export function arrivals(level: YardLevel, cap = PLAN_CAP): Arrival[] {
  const out: Arrival[] = [];
  for (const plan of enumeratePlans(level, cap)) {
    const result = runPlan(level, plan);
    if (result.delivered) out.push({ key: goalKey(result.delivered), plan, result });
  }
  return out;
}
