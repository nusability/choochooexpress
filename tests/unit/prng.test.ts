import { describe, expect, it } from 'vitest';
import { Pcg32, fmix32, hashSeed } from '../../src/engine/prng';

describe('Pcg32', () => {
  it('matches the PCG32 reference vector (seed 42, stream 54)', () => {
    const rng = new Pcg32(42, 54);
    const out = Array.from({ length: 6 }, () => rng.nextU32());
    expect(out).toEqual([0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e]);
  });

  it('is deterministic for the same seed', () => {
    const a = new Pcg32(123456789);
    const b = new Pcg32(123456789);
    for (let i = 0; i < 1000; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('produces different sequences for different seeds and forks', () => {
    const a = new Pcg32(1);
    const b = new Pcg32(2);
    expect(a.nextU32()).not.toBe(b.nextU32());
    const base = new Pcg32(7);
    const f1 = base.fork('a');
    const f2 = base.fork('a');
    expect(f1.nextU32()).not.toBe(f2.nextU32());
  });

  it('keeps int() within inclusive bounds and covers them', () => {
    const rng = new Pcg32(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('next() stays in [0, 1)', () => {
    const rng = new Pcg32(5);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('shuffle keeps all items', () => {
    const rng = new Pcg32(11);
    const items = [1, 2, 3, 4, 5, 6];
    expect(rng.shuffle([...items]).sort()).toEqual(items);
  });
});

describe('hashing', () => {
  it('is stable', () => {
    expect(fmix32(0)).toBe(0);
    expect(hashSeed(1, 2)).toBe(hashSeed(1, 2));
    expect(hashSeed(1, 2)).not.toBe(hashSeed(2, 1));
    expect(hashSeed(1, 'x')).not.toBe(hashSeed(1, 'y'));
  });
});
