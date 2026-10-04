// Plan enumeration (research R33): every switch setting (one bit per linked group) times every way
// to place up to `pads` uncouplers on the tiles where a pad can matter. Bounded, so players may
// still find a plan shorter than par (FR-105).
import { padReach, runPlan, type Plan, type RunResult, type YardLevel } from './yard';

export const PLAN_CAP = 1000;

/** Pad tiles nearest a buffer first (the only places a pad can cut a train), at most 12. */
export function padCandidates(level: YardLevel): number[] {
  return [...padReach(level).entries()]
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

/**
 * Every plan in the bounded plan space, in a fixed order: every switch setting without pads first
 * (the backbone of any solution), then pad placements, sampled by an even stride up to the cap.
 */
export function enumeratePlans(level: YardLevel, cap = PLAN_CAP): Plan[] {
  const groups = [...new Set(level.switches.map((s) => s.group))];
  const padSets = subsets(padCandidates(level), level.pads);
  const combos = 1 << groups.length;
  const plan = (bits: number, pads: number[]): Plan => ({ switches: level.switches.map((s) => (((bits >> groups.indexOf(s.group)) & 1) as 0 | 1)), pads });
  const plans: Plan[] = [];
  const bare = Math.min(combos, Math.ceil(cap / 2));
  const bareStride = Math.max(1, Math.ceil(combos / bare));
  for (let bits = 0; bits < combos; bits += bareStride) plans.push(plan(bits, []));
  const rest = combos * (padSets.length - 1);
  if (rest <= 0) return plans;
  const room = Math.max(0, cap - plans.length);
  const stride = Math.max(1, Math.ceil(rest / Math.max(1, room)));
  for (let i = 0; i < rest && plans.length < cap; i += stride) {
    const bits = i % combos;
    plans.push(plan(bits, padSets[1 + Math.floor(i / combos)] as number[]));
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
