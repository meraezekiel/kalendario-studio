import { describe, expect, it } from 'vitest';
import { clock, tideTurns } from './tide';
import { TIDE_PLACES, tidePlace } from './tidePlaces';

describe('clock', () => {
  it('writes am and pm times', () => {
    expect([0, 7, 65, 719, 720, 795, 1439].map(clock)).toEqual(['12:00 am', '12:07 am', '1:05 am', '11:59 am', '12:00 pm', '1:15 pm', '11:59 pm']);
  });
});

describe('tideTurns', () => {
  it('matches the Davao tide gauge on 15 March 2024', () => {
    // UHSLC hourly heights (Philippine time): lowest about 2:30 am, highest about 8:45 am,
    // lowest about 3:10 pm, highest about 9:00 pm.
    const day = tideTurns(tidePlace('davao')!, 2024, 2)[15];
    expect(day.map((t) => t.high)).toEqual([false, true, false, true]);
    [150, 525, 910, 1260].forEach((seen, i) => expect(Math.abs(day[i].min - seen)).toBeLessThan(20));
  });

  it('gives every port alternating highs and lows, one to four a day, all month', () => {
    for (const st of TIDE_PLACES) {
      const days = tideTurns(st, 2027, 0);
      const all = Object.keys(days).sort((a, b) => +a - +b).flatMap((d) => days[+d]);
      expect(Object.keys(days).length, st.name).toBeGreaterThanOrEqual(29);
      for (const d of Object.values(days)) expect(d.length).toBeLessThanOrEqual(4);
      all.forEach((t, i) => i && expect(t.high, `${st.name} turn ${i}`).not.toBe(all[i - 1].high));
    }
  });
});
