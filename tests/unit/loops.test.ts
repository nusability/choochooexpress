import { describe, expect, it } from 'vitest';
import { trainLength, switchWindow } from '../../src/engine/flow';
import { E, N, S, neighbor, opposite, tileIndex } from '../../src/engine/grid';
import { buildLoop, type LoopShape } from '../../src/engine/loops';

const cols = 10, rows = 10;

function connected(shape: LoopShape) {
  const first = shape.cells[0];
  const last = shape.cells.at(-1);
  expect(neighbor(shape.wTile, shape.side, cols, rows)).toBe(first?.tile);
  expect(first?.from).toBe(opposite(shape.side));
  expect(neighbor(last?.tile as number, last?.to as 0, cols, rows)).toBe(shape.mTile);
  for (let i = 1; i < shape.cells.length; i++) {
    const prev = shape.cells[i - 1];
    const cur = shape.cells[i];
    expect(neighbor(prev?.tile as number, prev?.to as 0, cols, rows)).toBe(cur?.tile);
    expect(cur?.from).toBe(opposite(prev?.to as 0));
  }
}

describe('buildLoop', () => {
  const m = tileIndex(4, 6, cols);

  it('builds a narrow 2-row loop with circuit 2 + π', () => {
    const shape = buildLoop({ cols, rows, mTile: m, d: E, k: 0, side: N, a: 0, b: 0, h: 2 }) as LoopShape;
    expect(shape).not.toBeNull();
    expect(shape.cells).toHaveLength(4);
    expect(shape.circuit).toBeCloseTo(2 + Math.PI, 9);
    connected(shape);
  });

  it('builds a narrow 3-row loop with circuit 4 + π', () => {
    const shape = buildLoop({ cols, rows, mTile: m, d: E, k: 0, side: N, a: 0, b: 0, h: 3 }) as LoopShape;
    expect(shape.circuit).toBeCloseTo(4 + Math.PI, 9);
    connected(shape);
  });

  it('gives windows of 1.53 s and 3.07 s for three wagons at 1.3 tiles/s (ratio ≈ 0.5)', () => {
    const l2 = buildLoop({ cols, rows, mTile: m, d: E, k: 0, side: N, a: 0, b: 0, h: 2 }) as LoopShape;
    const l3 = buildLoop({ cols, rows, mTile: m, d: E, k: 0, side: N, a: 0, b: 0, h: 3 }) as LoopShape;
    const w2 = switchWindow(l2.circuit, l2.switchLaneLength, trainLength(3), 1.3);
    const w3 = switchWindow(l3.circuit, l3.switchLaneLength, trainLength(3), 1.3);
    expect(w2).toBeCloseTo(1.535, 2);
    expect(w3).toBeCloseTo(3.074, 2);
    expect(w2 / w3).toBeCloseTo(0.5, 1);
  });

  it('supports chords, extensions and both sides', () => {
    for (const side of [N, S]) {
      for (const [k, a, b, h] of [[1, 1, 0, 2], [2, 0, 1, 3], [0, 1, 1, 2], [0, 0, 0, 1]] as const) {
        const shape = buildLoop({ cols, rows, mTile: m, d: E, k, side, a, b, h }) as LoopShape;
        expect(shape, `k${k} a${a} b${b} h${h}`).not.toBeNull();
        expect(shape.chord).toHaveLength(k);
        connected(shape);
        expect(new Set(shape.cells.map((c) => c.tile)).size).toBe(shape.cells.length);
      }
    }
  });

  it('rejects impossible shapes and loops leaving the board', () => {
    expect(buildLoop({ cols, rows, mTile: m, d: E, k: 0, side: N, a: 1, b: 0, h: 1 })).toBeNull();
    expect(buildLoop({ cols, rows, mTile: m, d: E, k: 0, side: E, a: 0, b: 0, h: 2 })).toBeNull();
    expect(buildLoop({ cols, rows, mTile: tileIndex(4, 0, cols), d: E, k: 0, side: N, a: 0, b: 0, h: 2 })).toBeNull();
  });
});
