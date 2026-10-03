import { describe, expect, it } from 'vitest';
import {
  DERAIL_PILE, H_THRESHOLD, L_FUNNEL, RHO_TOY, W_TRACK, WHEEL_HEIGHT, dosePerPass, isDangerousPile, pileHeight,
  pourRate, switchWindow, trainLength,
} from '../../src/engine/flow';

describe('A1 flow equations', () => {
  it('derives the derailment pile from H_threshold = 0.5 × wheel height', () => {
    expect(H_THRESHOLD).toBeCloseTo(0.5 * WHEEL_HEIGHT, 12);
    expect(DERAIL_PILE).toBe(40);
    expect(DERAIL_PILE).toBeCloseTo(H_THRESHOLD * W_TRACK * L_FUNNEL * RHO_TOY, 9);
  });

  it('treats 39 spilled toys as safe and 40 as dangerous', () => {
    expect(isDangerousPile(39)).toBe(false);
    expect(isDangerousPile(40)).toBe(true);
    expect(pileHeight(39)).toBeLessThan(H_THRESHOLD);
    expect(pileHeight(40)).toBeGreaterThanOrEqual(H_THRESHOLD - 1e-12);
  });

  it('satisfies the fill condition Q · L / v = dose', () => {
    for (const v of [1, 1.1, 1.2, 1.3]) {
      for (const dose of [15, 23, 40, 70]) {
        expect(dosePerPass(pourRate(dose, v), v)).toBeCloseTo(dose, 9);
      }
    }
  });

  it('computes train lengths', () => {
    expect(trainLength(1)).toBeCloseTo(1.2, 9);
    expect(trainLength(2)).toBeCloseTo(1.78, 9);
    expect(trainLength(3)).toBeCloseTo(2.36, 9);
    expect(trainLength(4)).toBeCloseTo(2.94, 9);
  });

  it('computes switch windows', () => {
    // 2-row narrow loop (C = 5.14) vs 3-row (C = 7.14), 3 wagons at 1.3 tiles/s.
    // Circuit = 2 straights + 2 corner curves + the switch's and the merge's curved lanes.
    const c2 = 2 + 4 * (Math.PI / 4);
    const c3 = 4 + 4 * (Math.PI / 4);
    const w2 = switchWindow(c2, Math.PI / 4, trainLength(3), 1.3);
    const w3 = switchWindow(c3, Math.PI / 4, trainLength(3), 1.3);
    expect(w2).toBeCloseTo(1.5355, 3);
    expect(w3).toBeCloseTo(3.074, 2);
    expect(w2 / w3).toBeGreaterThan(0.425);
    expect(w2 / w3).toBeLessThan(0.575);
  });
});
