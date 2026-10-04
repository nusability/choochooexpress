import { describe, expect, it } from 'vitest';
import { HOLIDAY_IDS, easter, holidayForLevel, holidaysOn } from '../../src/engine/holidays';

const ids = (y: number, m: number, d: number) => holidaysOn(y, m, d).map((h) => h.id);

describe('holiday calendar (F-015)', () => {
  it('computes Gregorian Easter', () => {
    expect(easter(2025)).toEqual([4, 20]);
    expect(easter(2026)).toEqual([4, 5]);
    expect(easter(2027)).toEqual([3, 28]);
    expect(easter(2038)).toEqual([4, 25]);
  });

  it('finds fixed, table and Easter-based holidays', () => {
    expect(ids(2026, 12, 25)).toEqual(['christmas']);
    expect(ids(2027, 1, 7)).toEqual(['christmas']);
    expect(ids(2026, 10, 31)).toEqual(['halloween', 'muertos']);
    expect(ids(2026, 4, 5)).toEqual(['easter']);
    expect(ids(2026, 2, 17)).toContain('lunarnewyear');
    expect(ids(2026, 2, 14)).toEqual(['carnival']);
    expect(ids(2026, 11, 8)).toEqual(['diwali']);
    expect(ids(2026, 3, 20)).toEqual(['nowruz', 'eid']);
    expect(ids(2026, 5, 5)).toEqual(['kodomo']);
    expect(ids(2026, 7, 15)).toEqual([]);
  });

  it('counts the days of Hanukkah and crosses the new year', () => {
    const first = holidaysOn(2026, 12, 4).find((h) => h.id === 'hanukkah');
    expect(first).toMatchObject({ day: 0, length: 8 });
    expect(holidaysOn(2026, 12, 11).find((h) => h.id === 'hanukkah')?.day).toBe(7);
    expect(ids(2026, 12, 12)).not.toContain('hanukkah');
    expect(ids(2027, 1, 1)).toEqual(expect.arrayContaining(['newyear', 'kwanzaa']));
    expect(ids(2026, 12, 31)).toEqual(expect.arrayContaining(['newyear', 'kwanzaa']));
  });

  it('lets overlapping holidays take turns by level', () => {
    const today = holidaysOn(2026, 10, 31);
    expect(holidayForLevel(today, 4)?.id).not.toBe(holidayForLevel(today, 5)?.id);
    expect(holidayForLevel([], 3)).toBeNull();
  });

  it('every holiday appears at least once a year from 2025 to 2040', () => {
    for (let y = 2025; y <= 2040; y++) {
      const seen = new Set<string>();
      for (let d = 0; d < 366; d++) {
        const date = new Date(Date.UTC(y, 0, 1 + d));
        if (date.getUTCFullYear() !== y) break;
        for (const h of holidaysOn(y, date.getUTCMonth() + 1, date.getUTCDate())) seen.add(h.id);
      }
      expect([...seen].sort(), String(y)).toEqual([...HOLIDAY_IDS].sort());
    }
  });
});
