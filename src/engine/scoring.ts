// Score v2 (spec F-009, FR-074 / FR-075, research R24): every wagon tips its toys into its own
// chute; each chute counts at most the wanted number of its toy type. Extras cost nothing.
import { STAR_1_RATIO, STAR_2_RATIO } from './flow';
import type { ChuteResult, OrderLine, ToyType } from './types';

export const BASE_POINTS = 1000;

export type WagonContents = Partial<Record<ToyType, number>>;

export function chuteResults(order: readonly OrderLine[], wagons: readonly WagonContents[]): ChuteResult[] {
  return order.map((line) => {
    const contents = wagons[line.wagon - 1] ?? {};
    const have = contents[line.type] ?? 0;
    const total = Object.values(contents).reduce((sum, n) => sum + (n ?? 0), 0);
    const got = Math.min(line.quantity, have);
    return { wagon: line.wagon, type: line.type, wanted: line.quantity, got, extra: total - got };
  });
}

export function starsFor(ratio: number): 0 | 1 | 2 | 3 {
  if (ratio >= 1) return 3;
  if (ratio >= STAR_2_RATIO) return 2;
  if (ratio >= STAR_1_RATIO) return 1;
  return 0;
}

export interface Score {
  chutes: ChuteResult[];
  ratio: number;
  score: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
}

export function scoreDelivery(order: readonly OrderLine[], wagons: readonly WagonContents[]): Score {
  const chutes = chuteResults(order, wagons);
  const wanted = chutes.reduce((s, c) => s + c.wanted, 0);
  const got = chutes.reduce((s, c) => s + c.got, 0);
  const ratio = wanted > 0 ? got / wanted : 0;
  const stars = starsFor(ratio);
  return { chutes, ratio, score: Math.round(BASE_POINTS * ratio), stars, passed: stars >= 1 };
}
