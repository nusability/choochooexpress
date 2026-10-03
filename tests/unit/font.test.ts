import { describe, expect, it } from 'vitest';
import font from '../../src/ui/fonts/fredoka.json';

// The 3D lettering (spec FR-061) draws every interface string from this subset (research R19).
const glyphs = (font as unknown as { glyphs: Record<string, [number, string]> }).glyphs;

describe('interface font subset', () => {
  it('covers printable ASCII and the typographic characters the interface uses', () => {
    const needed: string[] = [];
    for (let c = 32; c <= 126; c++) needed.push(String.fromCharCode(c));
    needed.push(...'×−…’·–—');
    const missing = needed.filter((ch) => !(ch in glyphs));
    expect(missing).toEqual([]);
  });

  it('stores outlines with move, line, quadratic and close commands only', () => {
    for (const [ch, [advance, path]] of Object.entries(glyphs)) {
      expect(advance, ch).toBeGreaterThan(0);
      const commands = path.split(' ').filter((t) => /^[A-Za-z]$/.test(t));
      expect(commands.every((c) => 'MLQZ'.includes(c)), ch).toBe(true);
    }
    expect(glyphs[' ']?.[1]).toBe('');
    expect(glyphs.A?.[1].startsWith('M')).toBe(true);
  });
});
