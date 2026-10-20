import { describe, expect, it } from 'vitest';
import { clock, heightText, type TideStation, tideTurns } from './tide';
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
    // And the gauge's heights that day (m, gauge zero): about 2.25, 3.83, 2.21, 3.53.
    [2.25, 3.83, 2.21, 3.53].forEach((seen, i) => expect(Math.abs(day[i].h - seen)).toBeLessThan(0.12));
  });

  it('matches a printed Cebu tide calendar for September 2026', () => {
    // Day: [high?, minutes after midnight, metres above MLLW], as printed.
    const printed: Record<number, [boolean, number, number][]> = {
      1: [[true, 67, 1.5], [false, 439, 0.1], [true, 809, 1.4], [false, 1161, 0.3]],
      6: [[true, 260, 1.6], [false, 877, 0.2]],
      7: [[true, 371, 1.6], [false, 949, 0]],
      8: [[true, 486, 1.6], [false, 989, -0.1], [true, 1409, 0.8]],
      13: [[true, 4, 1.4], [false, 364, 0], [true, 739, 1.6], [false, 1104, 0.1]],
      14: [[true, 26, 1.5], [false, 403, 0], [true, 773, 1.4], [false, 1120, 0.2]],
      20: [[true, 197, 1.4], [false, 868, 0.4]],
      27: [[false, 316, 0.1], [true, 692, 1.5], [false, 1059, 0.1], [true, 1418, 1.5]],
      28: [[false, 353, -0.1], [true, 728, 1.5], [false, 1077, 0.2]],
      // We put this 12:00 AM high at 11:55 PM on the 28th: compared by time, not by box.
      29: [[true, 0, 1.6], [false, 392, -0.2], [true, 765, 1.3], [false, 1094, 0.3]],
    };
    const cebu = tidePlace('cebu')!;
    const ours = Object.entries(tideTurns(cebu, 2026, 8)).flatMap(([d, ts]) => ts.map((t) => ({ ...t, at: +d * 1440 + t.min })));
    const off: number[] = [];
    for (const [day, list] of Object.entries(printed)) {
      for (const [high, min, h] of list) {
        const at = +day * 1440 + min;
        const near = ours.filter((t) => t.high === high).reduce((a, b) => (Math.abs(a.at - at) < Math.abs(b.at - at) ? a : b));
        off.push(Math.abs(near.at - at));
        expect(Math.abs(near.h - cebu.datum - h), `Sep ${day} ${min}`).toBeLessThan(0.15);
      }
    }
    off.sort((a, b) => a - b);
    expect(off[off.length >> 1]).toBeLessThan(10);
    expect(off[off.length - 1]).toBeLessThan(45);
  });

  it('measures heights from mean lower low water: most lows near zero, some a little below', () => {
    for (const st of TIDE_PLACES) {
      const lows = Object.values(tideTurns(st, 2027, 0)).flat().filter((t) => !t.high).map((t) => t.h - st.datum);
      expect(Math.min(...lows), st.name).toBeLessThan(0.05);
      expect(Math.min(...lows), st.name).toBeGreaterThan(-0.6);
    }
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

describe('heightText', () => {
  const st = { datum: 2 } as TideStation;
  it('rounds to 10 cm above the datum, without a minus zero', () => {
    expect([3.64, 2, 1.97, 1.84].map((h) => heightText(st, h))).toEqual(['1.6m', '0.0m', '0.0m', '-0.2m']);
  });
});
