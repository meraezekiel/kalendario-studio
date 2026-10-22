import { describe, expect, it } from 'vitest';
import { daysBefore, manilaDay, percent, summarize } from './statsSummary';

describe('manilaDay', () => {
  it('uses Philippine time', () => {
    expect(manilaDay(new Date('2026-10-22T17:00:00Z'))).toBe('2026-10-23');
    expect(manilaDay(new Date('2026-10-22T15:00:00Z'))).toBe('2026-10-22');
  });
});

describe('daysBefore', () => {
  it('crosses months', () => {
    expect(daysBefore('2026-11-02', 6)).toBe('2026-10-27');
  });
});

describe('summarize', () => {
  it('adds up today, the last 7 days and the last 30 days', () => {
    const rows = [
      { day: '2026-10-22', event: 'open', n: 5 },
      { day: '2026-10-20', event: 'open', n: 3 },
      { day: '2026-10-10', event: 'open', n: 2 },
      { day: '2026-09-01', event: 'open', n: 100 }, // too old
      { day: '2026-10-21', event: 'print', n: 1 },
    ];
    expect(summarize(rows, '2026-10-22')).toEqual({
      open: { today: 5, week: 8, month: 10 },
      print: { today: 0, week: 1, month: 1 },
    });
  });
});

describe('percent', () => {
  it('rounds, and shows a dash with nothing to compare', () => {
    expect(percent(1, 3)).toBe('33%');
    expect(percent(1, 0)).toBe('–');
  });
});
