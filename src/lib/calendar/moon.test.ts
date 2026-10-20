import { describe, expect, it } from 'vitest';
import { moonPhases, tideDays } from './moon';

const brief = (y: number, m: number) => moonPhases(y, m).map((p) => [p.phase, p.day]);

describe('moonPhases (Philippine time)', () => {
  it('matches the printed October 2026 calendar', () => {
    // Last quarter Oct 3, new moon Oct 10, first quarter Oct 19, full moon Oct 26.
    expect(brief(2026, 9)).toEqual([[3, 3], [0, 10], [1, 19], [2, 26]]);
  });
  it('matches published January 2025 phases', () => {
    // UTC: FQ Jan 6 23:56, FM Jan 13 22:27, LQ Jan 21 20:31, NM Jan 29 12:36 (all +8h in Manila).
    expect(brief(2025, 0)).toEqual([[1, 7], [2, 14], [3, 22], [0, 29]]);
  });
  it('is within minutes of a known new moon', () => {
    const nm = moonPhases(2024, 3).find((p) => p.phase === 0)!; // 2024-04-08 18:21 UTC, the eclipse
    expect(Math.abs(nm.at.getTime() - Date.UTC(2024, 3, 8, 18, 21))).toBeLessThan(5 * 60000);
  });
  it('has a phase about every 7.4 days all year', () => {
    for (let m = 0; m < 12; m++) {
      const n = moonPhases(2027, m).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});

describe('tideDays', () => {
  it('marks spring tides at new and full moon and neap tides at the quarters, plus the day after', () => {
    // October 2026: LQ 3, NM 10, FQ 19, FM 26.
    expect(tideDays(2026, 9)).toEqual({
      3: 'neap', 4: 'neap', 10: 'spring', 11: 'spring', 19: 'neap', 20: 'neap', 26: 'spring', 27: 'spring',
    });
  });
  it('carries a phase on the last day of a month into the 1st of the next', () => {
    // Find a month whose last phase falls on its last day and check the 1st of the following month.
    for (let y = 2025; y <= 2030; y++) {
      for (let m = 0; m < 12; m++) {
        const p = moonPhases(y, m).at(-1)!;
        if (p.day !== new Date(Date.UTC(y, m + 1, 0)).getUTCDate()) continue;
        const [ny, nm] = m === 11 ? [y + 1, 0] : [y, m + 1];
        expect(tideDays(ny, nm)[1]).toBe(p.phase % 2 ? 'neap' : 'spring');
        return;
      }
    }
    expect.unreachable('no month from 2025 to 2030 ends on a phase');
  });
});
