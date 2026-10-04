// Holiday skins (spec F-015): which holidays a calendar day belongs to. Pure date arithmetic; the
// app reads the device's local date and passes it in (the engine never reads a clock).
//
// Fixed dates are rules; moving ones (lunar, lunisolar, Easter-based) come from tables or from the
// Easter computus. Tables cover 2025–2040; outside them a moving holiday simply does not appear.

export type HolidayId =
  | 'newyear'
  | 'timkat'
  | 'lunarnewyear'
  | 'holi'
  | 'nowruz'
  | 'eid'
  | 'carnival'
  | 'easter'
  | 'songkran'
  | 'kodomo'
  | 'africaday'
  | 'tanabata'
  | 'enkutatash'
  | 'midautumn'
  | 'halloween'
  | 'muertos'
  | 'diwali'
  | 'hanukkah'
  | 'christmas'
  | 'kwanzaa';

export const HOLIDAY_IDS: readonly HolidayId[] = [
  'newyear', 'timkat', 'lunarnewyear', 'holi', 'nowruz', 'eid', 'carnival', 'easter', 'songkran', 'kodomo',
  'africaday', 'tanabata', 'enkutatash', 'midautumn', 'halloween', 'muertos', 'diwali', 'hanukkah', 'christmas', 'kwanzaa',
];

/** A holiday on a given day: which day of its window it is (0-based) and how long the window is. */
export interface HolidayDay {
  id: HolidayId;
  day: number;
  length: number;
}

/** Days since 1970-01-01 of a Gregorian date (month 1–12). */
export function dayNumber(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Gregorian Easter Sunday (anonymous Gregorian algorithm) as [month, day]. */
export function easter(y: number): [number, number] {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

/** Moving holidays by table (YYYY-MM-DD of the main day). */
const TABLES: Partial<Record<HolidayId, string[]>> = {
  lunarnewyear: ['2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31', '2034-02-19', '2035-02-08', '2036-01-28', '2037-02-15', '2038-02-04', '2039-01-24', '2040-02-12'],
  holi: ['2025-03-14', '2026-03-04', '2027-03-22', '2028-03-11', '2029-03-01', '2030-03-20', '2031-03-09', '2032-03-27', '2033-03-16', '2034-03-05', '2035-03-24', '2036-03-12', '2037-03-02', '2038-03-21', '2039-03-11', '2040-03-29'],
  // Eid al-Fitr and Eid al-Adha share one skin.
  eid: [
    '2025-03-30', '2026-03-20', '2027-03-09', '2028-02-26', '2029-02-14', '2030-02-04', '2031-01-24', '2032-01-14', '2033-01-02', '2033-12-23', '2034-12-12', '2035-12-01', '2036-11-19', '2037-11-08', '2038-10-29', '2039-10-19', '2040-10-07',
    '2025-06-06', '2026-05-27', '2027-05-16', '2028-05-05', '2029-04-24', '2030-04-13', '2031-04-02', '2032-03-22', '2033-03-11', '2034-03-01', '2035-02-18', '2036-02-07', '2037-01-26', '2038-01-16', '2039-01-05', '2039-12-26', '2040-12-14',
  ],
  midautumn: ['2025-10-06', '2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12', '2031-10-01', '2032-09-19', '2033-09-08', '2034-09-27', '2035-09-16', '2036-10-04', '2037-09-24', '2038-09-13', '2039-10-02', '2040-09-20'],
  diwali: ['2025-10-20', '2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26', '2031-11-14', '2032-11-02', '2033-10-22', '2034-11-10', '2035-10-30', '2036-10-18', '2037-11-06', '2038-10-27', '2039-11-15', '2040-11-04'],
  // The evening the first candle is lit.
  hanukkah: ['2025-12-14', '2026-12-04', '2027-12-24', '2028-12-12', '2029-12-01', '2030-12-20', '2031-12-09', '2032-11-27', '2033-12-16', '2034-12-06', '2035-12-25', '2036-12-13', '2037-12-02', '2038-12-21', '2039-12-11', '2040-11-29'],
};

/** Window around each table date: days before and after the main day. */
const TABLE_WINDOW: Partial<Record<HolidayId, [number, number]>> = {
  lunarnewyear: [1, 6],
  holi: [1, 1],
  eid: [0, 2],
  midautumn: [1, 1],
  diwali: [2, 2],
  hanukkah: [0, 7],
};

/** Every window [start, end] (day numbers, inclusive) of a holiday that touches year `y`. */
function windows(id: HolidayId, y: number): [number, number][] {
  const fixed = (m1: number, d1: number, m2: number, d2: number, yy = y): [number, number] => [dayNumber(yy, m1, d1), dayNumber(yy + (m2 < m1 ? 1 : 0), m2, d2)];
  switch (id) {
    case 'newyear':
      return [fixed(12, 31, 1, 1, y - 1), fixed(12, 31, 1, 1)];
    case 'timkat':
      return [fixed(1, 19, 1, 20)];
    case 'nowruz':
      return [fixed(3, 20, 3, 24)];
    case 'songkran':
      return [fixed(4, 13, 4, 15)];
    case 'kodomo':
      return [fixed(5, 3, 5, 5)];
    case 'africaday':
      return [fixed(5, 25, 5, 25)];
    case 'tanabata':
      return [fixed(7, 7, 7, 7)];
    case 'enkutatash':
      return [fixed(9, 11, 9, 12)];
    case 'halloween':
      return [fixed(10, 30, 10, 31)];
    case 'muertos':
      return [fixed(10, 31, 11, 2)];
    case 'christmas':
      // Western Christmas and the Orthodox one on 7 January share a skin.
      return [fixed(12, 24, 12, 26), fixed(1, 6, 1, 7)];
    case 'kwanzaa':
      return [fixed(12, 26, 1, 1, y - 1), fixed(12, 26, 1, 1)];
    case 'easter':
    case 'carnival': {
      const [m, d] = easter(y);
      const e = dayNumber(y, m, d);
      // Easter: Good Friday to Easter Monday. Carnival: the Saturday to Shrove Tuesday before Lent.
      return [id === 'easter' ? [e - 2, e + 1] : [e - 50, e - 47]];
    }
    default: {
      const [before, after] = TABLE_WINDOW[id] ?? [0, 0];
      return (TABLES[id] ?? [])
        .filter((s) => Math.abs(Number(s.slice(0, 4)) - y) <= 1)
        .map((s) => {
          const n = dayNumber(Number(s.slice(0, 4)), Number(s.slice(5, 7)), Number(s.slice(8, 10)));
          return [n - before, n + after] as [number, number];
        });
    }
  }
}

/** The holidays on a Gregorian date (month 1–12), in calendar order of their windows. */
export function holidaysOn(y: number, m: number, d: number): HolidayDay[] {
  const today = dayNumber(y, m, d);
  const out: (HolidayDay & { start: number })[] = [];
  for (const id of HOLIDAY_IDS) {
    for (const [start, end] of windows(id, y)) {
      if (today >= start && today <= end) {
        out.push({ id, day: today - start, length: end - start + 1, start });
        break;
      }
    }
  }
  return out.sort((a, b) => a.start - b.start).map(({ id, day, length }) => ({ id, day, length }));
}

/** When several holidays overlap, levels take turns: level n shows one of them. */
export function holidayForLevel(today: readonly HolidayDay[], level: number): HolidayDay | null {
  if (!today.length) return null;
  return today[((level % today.length) + today.length) % today.length] as HolidayDay;
}
