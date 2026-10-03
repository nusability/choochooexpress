// Addendum A3 precision scoring (spec F-003, research R6).
import type { OrderLine, ToyType } from './types';

export const BASE_POINTS = 1000;
export const SPILL_PENALTY = 5;
export const EFFICIENCY_BONUS = 300;
export const STAR_1 = 750;
export const STAR_2 = 900;
export const STAR_2_MAX_SPILLS = 10;
export const STAR_3 = 1200;

export interface PassRecord {
  type: ToyType;
  loaded: number;
  spilled: number;
}

/** Loaded sequence (FR-022): passes in order, empty passes dropped, consecutive same types merged. */
export function loadedLines(passes: readonly PassRecord[]): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const pass of passes) {
    if (pass.loaded <= 0) continue;
    const last = lines[lines.length - 1];
    if (last && last.type === pass.type) last.quantity += pass.loaded;
    else lines.push({ type: pass.type, quantity: pass.loaded });
  }
  return lines;
}

/**
 * N_correct (FR-023): weighted longest common subsequence of order lines and loaded lines — each
 * order line matches at most one later loaded line of the same type, counting at most its quantity.
 */
export function countCorrect(order: readonly OrderLine[], loaded: readonly OrderLine[]): number {
  const n = order.length;
  const m = loaded.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const o = order[i - 1] as OrderLine;
    const row = dp[i] as number[];
    const prev = dp[i - 1] as number[];
    for (let j = 1; j <= m; j++) {
      const l = loaded[j - 1] as OrderLine;
      const match = o.type === l.type ? (prev[j - 1] as number) + Math.min(o.quantity, l.quantity) : 0;
      row[j] = Math.max(prev[j] as number, row[j - 1] as number, match);
    }
  }
  return (dp[n] as number[])[m] as number;
}

export interface Score {
  nCorrect: number;
  nTotal: number;
  bonus: 0 | 300;
  score: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
}

export function scoreDelivery(order: readonly OrderLine[], loaded: readonly OrderLine[], nSpilled: number, secretRoute: boolean): Score {
  const ordered = order.reduce((s, l) => s + l.quantity, 0);
  const delivered = loaded.reduce((s, l) => s + l.quantity, 0);
  const nCorrect = countCorrect(order, loaded);
  const nTotal = Math.max(ordered, delivered);
  const bonus: 0 | 300 = secretRoute ? EFFICIENCY_BONUS : 0;
  const ratio = nTotal > 0 ? nCorrect / nTotal : 0;
  const score = Math.max(0, Math.round(BASE_POINTS * ratio - SPILL_PENALTY * nSpilled + bonus));
  const perfect = nCorrect === ordered && delivered === ordered && nSpilled === 0 && ordered > 0;
  const stars: 0 | 1 | 2 | 3 =
    score >= STAR_3 || perfect ? 3 : score >= STAR_2 && nSpilled <= STAR_2_MAX_SPILLS ? 2 : score >= STAR_1 ? 1 : 0;
  return { nCorrect, nTotal, bonus, score, stars, passed: stars >= 1 };
}
