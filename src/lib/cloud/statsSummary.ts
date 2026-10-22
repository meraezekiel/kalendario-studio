import type { StatRow } from './stats';

/** A day (YYYY-MM-DD) in Philippine time, like the database's counts. */
export function manilaDay(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/** The day `n` days before `day` (both YYYY-MM-DD). */
export function daysBefore(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** One event's totals: today, the last 7 days and the last 30 days (today included). */
export type Totals = { today: number; week: number; month: number };

/** Totals per event from the daily counts. */
export function summarize(rows: StatRow[], today: string): Record<string, Totals> {
  const weekFrom = daysBefore(today, 6);
  const monthFrom = daysBefore(today, 29);
  const out: Record<string, Totals> = {};
  for (const r of rows) {
    if (r.day < monthFrom || r.day > today) continue;
    const t = (out[r.event] ??= { today: 0, week: 0, month: 0 });
    t.month += r.n;
    if (r.day >= weekFrom) t.week += r.n;
    if (r.day === today) t.today += r.n;
  }
  return out;
}

/** "42%" of `part` in `whole`, or '–' when there's nothing to compare. */
export const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');
