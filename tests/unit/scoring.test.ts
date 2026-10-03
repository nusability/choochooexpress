import { describe, expect, it } from 'vitest';
import { chuteResults, scoreDelivery, starsFor } from '../../src/engine/scoring';
import type { OrderLine } from '../../src/engine/types';

const order: OrderLine[] = [
  { wagon: 1, type: 'duck', quantity: 10 },
  { wagon: 2, type: 'block', quantity: 10 },
];

describe('score v2 (FR-074, FR-075)', () => {
  it('scores a perfect payload 1000 with 3 stars', () => {
    const s = scoreDelivery(order, [{ duck: 10 }, { block: 10 }]);
    expect(s).toMatchObject({ ratio: 1, score: 1000, stars: 3, passed: true });
  });

  it('counts each chute only for its own wagon and toy type', () => {
    // Ducks in wagon 2 do not count for chute 1.
    const s = scoreDelivery(order, [{ block: 10 }, { duck: 10 }]);
    expect(s.ratio).toBe(0);
    expect(s.stars).toBe(0);
    expect(s.passed).toBe(false);
  });

  it('never punishes extra toys or other types', () => {
    const s = scoreDelivery(order, [{ duck: 14, car: 5 }, { block: 10, star: 3 }]);
    expect(s.score).toBe(1000);
    expect(s.chutes[0]).toEqual({ wagon: 1, type: 'duck', wanted: 10, got: 10, extra: 9 });
  });

  it('gives partial credit per chute', () => {
    const s = scoreDelivery(order, [{ duck: 7 }, { block: 10 }]);
    expect(s.ratio).toBeCloseTo(0.85, 9);
    expect(s.score).toBe(850);
    expect(s.stars).toBe(2);
    expect(chuteResults(order, [{}, {}]).map((c) => c.got)).toEqual([0, 0]);
  });

  it('uses the 100% / 85% / 60% star steps', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.99)).toBe(2);
    expect(starsFor(0.85)).toBe(2);
    expect(starsFor(0.849)).toBe(1);
    expect(starsFor(0.6)).toBe(1);
    expect(starsFor(0.599)).toBe(0);
  });
});
