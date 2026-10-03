import { describe, expect, it } from 'vitest';
import { countCorrect, loadedLines, scoreDelivery } from '../../src/engine/scoring';
import type { OrderLine } from '../../src/engine/types';

const order: OrderLine[] = [
  { type: 'duck', quantity: 60 },
  { type: 'block', quantity: 45 },
];

describe('A3 precision scoring (US3)', () => {
  it('scores a perfect delivery 1000 with 3 stars', () => {
    const s = scoreDelivery(order, [{ type: 'duck', quantity: 60 }, { type: 'block', quantity: 45 }], 0, false);
    expect(s).toEqual({ nCorrect: 105, nTotal: 105, bonus: 0, score: 1000, stars: 3, passed: true });
  });

  it('deducts 5 points per spilled toy; 2 stars need at most 10 spills', () => {
    const delivered = [{ type: 'duck' as const, quantity: 60 }, { type: 'block' as const, quantity: 45 }];
    const twelve = scoreDelivery(order, delivered, 12, false);
    expect(twelve.score).toBe(940);
    expect(twelve.stars).toBe(1);
    const ten = scoreDelivery(order, delivered, 10, false);
    expect(ten.score).toBe(950);
    expect(ten.stars).toBe(2);
  });

  it('counts only the in-sequence part when the order is reversed', () => {
    const s = scoreDelivery(order, [{ type: 'block', quantity: 45 }, { type: 'duck', quantity: 60 }], 0, false);
    expect(s.nCorrect).toBe(60);
    expect(s.score).toBe(571);
    expect(s.stars).toBe(0);
    expect(s.passed).toBe(false);
  });

  it('refuses orders below 750 points', () => {
    const s = scoreDelivery(order, [{ type: 'duck', quantity: 60 }], 0, false);
    expect(s.score).toBe(571);
    expect(s.passed).toBe(false);
  });

  it('lowers the ratio for extra toys (N_total = max of ordered and delivered)', () => {
    const s = scoreDelivery(order, [{ type: 'duck', quantity: 60 }, { type: 'star', quantity: 30 }, { type: 'block', quantity: 45 }], 0, false);
    expect(s.nCorrect).toBe(105);
    expect(s.nTotal).toBe(135);
    expect(s.score).toBe(778);
    expect(s.stars).toBe(1);
  });

  it('adds the 300-point efficiency bonus for the secret route; 1200+ is 3 stars', () => {
    const s = scoreDelivery(order, [{ type: 'duck', quantity: 60 }, { type: 'block', quantity: 45 }], 0, true);
    expect(s.score).toBe(1300);
    expect(s.bonus).toBe(300);
    expect(s.stars).toBe(3);
    const spilled = scoreDelivery(order, [{ type: 'duck', quantity: 60 }, { type: 'block', quantity: 45 }], 20, true);
    expect(spilled.score).toBe(1200);
    expect(spilled.stars).toBe(3);
  });

  it('never shows a negative score', () => {
    const s = scoreDelivery(order, [], 400, false);
    expect(s.score).toBe(0);
    expect(s.stars).toBe(0);
  });

  it('matches repeated order types line by line, in sequence', () => {
    const repeated: OrderLine[] = [
      { type: 'duck', quantity: 20 },
      { type: 'block', quantity: 20 },
      { type: 'duck', quantity: 20 },
    ];
    expect(countCorrect(repeated, [{ type: 'duck', quantity: 20 }, { type: 'block', quantity: 20 }, { type: 'duck', quantity: 20 }])).toBe(60);
    expect(countCorrect(repeated, [{ type: 'duck', quantity: 40 }, { type: 'block', quantity: 20 }])).toBe(40);
  });

  it('builds loaded lines from passes: empty passes dropped, consecutive types merged', () => {
    expect(
      loadedLines([
        { type: 'duck', loaded: 30, spilled: 0 },
        { type: 'duck', loaded: 10, spilled: 20 },
        { type: 'star', loaded: 0, spilled: 25 },
        { type: 'block', loaded: 15, spilled: 0 },
      ]),
    ).toEqual([
      { type: 'duck', quantity: 40 },
      { type: 'block', quantity: 15 },
    ]);
  });
});
