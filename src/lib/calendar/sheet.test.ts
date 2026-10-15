import { describe, expect, it } from 'vitest';
import { DEFAULT_SHEET, sheetLayout, toSheets } from './sheet';
import type { Page } from './types';

const on = { ...DEFAULT_SHEET, on: true };
const sq3 = { wmm: 76.2, hmm: 76.2 };

describe('sheetLayout', () => {
  it('fits six 3×3 in pages on A4 inside the margins, without overlapping', () => {
    const L = sheetLayout(sq3, on)!;
    expect(L.per).toBe(6);
    expect(L.slots).toHaveLength(6);
    L.slots.forEach((t) => {
      expect(t.x).toBeGreaterThanOrEqual(8);
      expect(t.y).toBeGreaterThanOrEqual(8);
      expect(t.x + t.w).toBeLessThanOrEqual(L.wmm - 8);
      expect(t.y + t.h).toBeLessThanOrEqual(L.hmm - 8);
    });
    const [a, b] = L.slots;
    expect(b.x - (a.x + a.w)).toBeCloseTo(4);
  });

  it('turns the sheet when that fits more', () => {
    // 5×3 in on A4: portrait 1×3, landscape 2×2.
    const L = sheetLayout({ wmm: 127, hmm: 76.2 }, { ...on, gap: 0 })!;
    expect([L.landscape, L.per]).toEqual([true, 4]);
    expect(sheetLayout(sq3, on)!.landscape).toBe(false); // a tie keeps portrait
    const W = sheetLayout({ wmm: 120, hmm: 60 }, { ...on, paper: 'A4', gap: 0 })!;
    // 120×60 on A4: portrait 1×4, landscape 2×3.
    expect(W.landscape).toBe(true);
    expect(W.per).toBe(6);
  });

  it('puts one mark per cut line on each side, shared cuts when there is no gap', () => {
    const L = sheetLayout(sq3, { ...on, gap: 0 })!;
    // 2 columns → 3 vertical cuts, 3 rows → 4 horizontal cuts, each marked on both sides.
    expect(L.marks).toHaveLength(3 * 2 + 4 * 2);
    // Marks stay off the design.
    const top = Math.min(...L.slots.map((t) => t.y));
    L.marks.filter((m) => m.h > m.w && m.y < top).forEach((m) => expect(m.y + m.h).toBeLessThan(top));
    expect(sheetLayout(sq3, { ...on, marks: false })!.marks).toHaveLength(0);
  });

  it('returns null when the page is bigger than the sheet', () => {
    expect(sheetLayout({ wmm: 297, hmm: 420 }, on)).toBeNull();
  });
});

describe('toSheets', () => {
  const pages = [1, 2, 3, 4, 5].map((n) => ({ id: String(n) }) as Page);
  it('fills each sheet with copies of one page', () => {
    const s = toSheets(pages, 4, true);
    expect(s).toHaveLength(5);
    expect(s[1].map((p) => p.id)).toEqual(['2', '2', '2', '2']);
  });
  it('or puts pages one after another', () => {
    expect(toSheets(pages, 4, false).map((s) => s.map((p) => p.id))).toEqual([['1', '2', '3', '4'], ['5']]);
  });
});
