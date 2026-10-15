/** Philippine regular and special holidays: fixed dates, Holy Week (from Easter) and National Heroes Day. */

export function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}

const FIXED: Record<string, string> = {
  '0-1': "New Year's Day", '1-25': 'EDSA Anniversary', '3-9': 'Araw ng Kagitingan', '4-1': 'Labor Day',
  '5-12': 'Independence Day', '7-21': 'Ninoy Aquino Day', '10-1': "All Saints' Day", '10-2': "All Souls' Day",
  '10-30': 'Bonifacio Day', '11-8': 'Immaculate Conception', '11-24': 'Christmas Eve', '11-25': 'Christmas Day',
  '11-30': 'Rizal Day', '11-31': "New Year's Eve",
};

/** Regular holidays (RA 9492); the rest are special non-working days. */
const REGULAR = new Set(["New Year's Day", 'Maundy Thursday', 'Good Friday', 'Araw ng Kagitingan', 'Labor Day', 'Independence Day', 'National Heroes Day', 'Bonifacio Day', 'Christmas Day', 'Rizal Day']);

/** Keeps only the regular holidays of a holiday name like "A · B"; empty when none are regular. */
export const regularOnly = (name: string) => name.split(' · ').filter((n) => REGULAR.has(n)).join(' · ');

const cache: Record<string, Record<number, string>> = {};

/** Holidays for month `m` (0-11) of year `y`, keyed by day of month. */
export function holidays(y: number, m: number): Record<number, string> {
  const key = `${y}-${m}`;
  if (cache[key]) return cache[key];
  const o: Record<number, string> = {};
  for (const k in FIXED) {
    const [a, b] = k.split('-').map(Number);
    if (a === m) o[b] = FIXED[k];
  }
  if (m === 7) {
    // Last Monday of August
    let d = 31;
    while (new Date(y, 7, d).getDay() !== 1) d--;
    o[d] = (o[d] ? o[d] + ' · ' : '') + 'National Heroes Day';
  }
  const e = easter(y);
  ([[-3, 'Maundy Thursday'], [-2, 'Good Friday'], [-1, 'Black Saturday'], [0, 'Easter Sunday']] as const).forEach(([off, n]) => {
    const dt = new Date(y, e.getMonth(), e.getDate() + off);
    if (dt.getMonth() === m) o[dt.getDate()] = n;
  });
  return (cache[key] = o);
}
