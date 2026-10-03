// Scoring of shunting runs (spec F-014, FR-105): fewer steps is better; par is the solver's
// shortest plan.

export interface YardScore {
  stars: 0 | 1 | 2 | 3;
  /** 1000 at par, more for a shorter run ("better than the dispatcher"). */
  score: number;
  beatPar: boolean;
}

export function yardScore(success: boolean, steps: number, par: number): YardScore {
  if (!success || steps <= 0) return { stars: 0, score: 0, beatPar: false };
  const stars: 1 | 2 | 3 = steps <= par ? 3 : steps <= Math.ceil(par * 1.25) ? 2 : 1;
  return { stars, score: Math.round((1000 * par) / steps), beatPar: steps < par };
}
