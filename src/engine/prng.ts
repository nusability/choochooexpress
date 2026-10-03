// Seeded PCG32 (XSH-RR, 64-bit state) — https://www.pcg-random.org/
// Implemented with BigInt for exact 64-bit arithmetic; fast enough for level generation.

const MASK64 = (1n << 64n) - 1n;
const MULTIPLIER = 6364136223846793005n;

export class Pcg32 {
  private state = 0n;
  private readonly inc: bigint;

  constructor(seed: number | bigint, stream: number | bigint = 54) {
    this.inc = ((BigInt.asUintN(64, BigInt(stream)) << 1n) | 1n) & MASK64;
    this.nextU32();
    this.state = (this.state + BigInt.asUintN(64, BigInt(seed))) & MASK64;
    this.nextU32();
  }

  /** Next uniformly distributed 32-bit unsigned integer. */
  nextU32(): number {
    const old = this.state;
    this.state = (old * MULTIPLIER + this.inc) & MASK64;
    const xorshifted = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn);
    const rot = Number(old >> 59n);
    return ((xorshifted >>> rot) | (xorshifted << ((32 - rot) & 31))) >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    if (max < min) throw new RangeError(`int(${min}, ${max})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('pick() from an empty list');
    return items[this.int(0, items.length - 1)] as T;
  }

  /** Fisher–Yates shuffle in place; returns the same array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = items[i] as T;
      items[i] = items[j] as T;
      items[j] = tmp;
    }
    return items;
  }

  /** Independent generator derived from this one's next output and a label. */
  fork(label: number | string): Pcg32 {
    const salt = typeof label === 'string' ? hashString(label) : label >>> 0;
    return new Pcg32(hashSeed(this.nextU32(), salt), salt);
  }
}

/** MurmurHash3 32-bit finalizer. */
export function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return fmix32(h);
}

/** Combines two values into a well-mixed 32-bit seed. */
export function hashSeed(a: number, b: number | string): number {
  const bb = typeof b === 'string' ? hashString(b) : b >>> 0;
  return fmix32((a ^ Math.imul((bb + 0x9e3779b9) >>> 0, 0x85ebca6b)) >>> 0);
}
