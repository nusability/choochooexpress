import { describe, expect, it } from 'vitest';
import {
  COUPLING_GAP, DERAIL_PILE, ENGINE_LEN, WAGON_LEN, carAt, isDangerousPile, pileHeight, trainLength, wagonCenter, wagonOffset,
} from '../../src/engine/flow';

describe('train and pile formulas', () => {
  it('derails at a pile of 40 toys (A1 threshold, FR-017)', () => {
    expect(DERAIL_PILE).toBe(40);
    expect(isDangerousPile(39)).toBe(false);
    expect(isDangerousPile(40)).toBe(true);
    expect(pileHeight(40)).toBeCloseTo(0.05, 9);
  });

  it('measures the train', () => {
    expect(trainLength(3)).toBeCloseTo(ENGINE_LEN + 3 * (WAGON_LEN + COUPLING_GAP), 9);
    expect(wagonOffset(1)).toBeCloseTo(ENGINE_LEN + COUPLING_GAP, 9);
    expect(wagonCenter(2)).toBeCloseTo(wagonOffset(2) + WAGON_LEN / 2, 9);
  });

  it('finds the car under a point, each car owning half of its coupling gaps (FR-070)', () => {
    expect(carAt(-0.01, 2)).toBe(-1);
    expect(carAt(0, 2)).toBe(0);
    expect(carAt(ENGINE_LEN + COUPLING_GAP / 2 - 1e-6, 2)).toBe(0);
    expect(carAt(ENGINE_LEN + COUPLING_GAP / 2 + 1e-6, 2)).toBe(1);
    expect(carAt(wagonCenter(1), 2)).toBe(1);
    expect(carAt(wagonCenter(2), 2)).toBe(2);
    expect(carAt(trainLength(2) - 1e-6, 2)).toBe(2);
    expect(carAt(trainLength(2) + 1e-6, 2)).toBe(-1);
    expect(carAt(wagonCenter(2), 1)).toBe(-1);
  });
});
