import { PAPERS } from './constants';
import type { Page, SheetPaper, SheetSettings } from './types';

export const SHEET_PAPERS: SheetPaper[] = ['A4', 'Letter', 'Long', 'Legal', 'A3'];
export const DEFAULT_SHEET: SheetSettings = { on: false, paper: 'A4', gap: 4, marks: true, fill: true };

/** Room around the grid for the printer's blank edge (and the cut marks), in mm. */
export const sheetMargin = (marks: boolean) => (marks ? 8 : 5);
/** The tightest edge used when it fits more pages (an 8 in page across A4), in mm. */
const MIN_EDGE = 3;
/** Cut marks start this far from the design and are this long, in mm. */
const MARK_OFFSET = 1.5;
const MARK_LEN = 4;
const MARK_WIDTH = 0.25;
const MIN_MARK = 1;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SheetLayout {
  wmm: number;
  hmm: number;
  landscape: boolean;
  cols: number;
  rows: number;
  per: number;
  /** Where each page goes, in mm from the sheet's top-left corner. */
  slots: Rect[];
  marks: Rect[];
}

const fit = (room: number, size: number, gap: number) => Math.max(0, Math.floor((room + gap) / (size + gap)));

/**
 * Lays pages of `item` size (mm) in a grid from the sheet's top-left corner,
 * keeping portrait unless landscape fits more. The edge shrinks to MIN_EDGE
 * only when that fits more. Null when not even one fits.
 */
export function sheetLayout(item: { wmm: number; hmm: number }, s: SheetSettings): SheetLayout | null {
  const [, a, b] = PAPERS[s.paper];
  const gap = Math.max(0, s.gap);
  const tries = [sheetMargin(s.marks), MIN_EDGE].flatMap((M) =>
    [false, true].map((landscape) => {
      const W = landscape ? b : a;
      const H = landscape ? a : b;
      const cols = fit(W - 2 * M, item.wmm, gap);
      const rows = fit(H - 2 * M, item.hmm, gap);
      return { M, landscape, W, H, cols, rows, per: cols * rows };
    }),
  );
  const best = tries.reduce((p, t) => (t.per > p.per ? t : p));
  if (!best.per) return null;

  const { M, W, H, cols, rows } = best;
  const gw = cols * item.wmm + (cols - 1) * gap;
  const gh = rows * item.hmm + (rows - 1) * gap;
  const x0 = M;
  const y0 = M;
  const slots: Rect[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) slots.push({ x: x0 + c * (item.wmm + gap), y: y0 + r * (item.hmm + gap), w: item.wmm, h: item.hmm });

  const marks: Rect[] = [];
  if (s.marks) {
    const xs = new Set<number>();
    const ys = new Set<number>();
    slots.forEach((t) => {
      xs.add(round(t.x)).add(round(t.x + t.w));
      ys.add(round(t.y)).add(round(t.y + t.h));
    });
    const half = MARK_WIDTH / 2;
    // Marks shorten to the room left before the sheet's edge, and drop when there is next to none.
    const len = (room: number) => Math.min(MARK_LEN, room - MARK_OFFSET);
    const top = len(y0), bottom = len(H - y0 - gh), left = len(x0), right = len(W - x0 - gw);
    xs.forEach((x) => {
      if (top >= MIN_MARK) marks.push({ x: x - half, y: y0 - MARK_OFFSET - top, w: MARK_WIDTH, h: top });
      if (bottom >= MIN_MARK) marks.push({ x: x - half, y: y0 + gh + MARK_OFFSET, w: MARK_WIDTH, h: bottom });
    });
    ys.forEach((y) => {
      if (left >= MIN_MARK) marks.push({ x: x0 - MARK_OFFSET - left, y: y - half, w: left, h: MARK_WIDTH });
      if (right >= MIN_MARK) marks.push({ x: x0 + gw + MARK_OFFSET, y: y - half, w: right, h: MARK_WIDTH });
    });
  }
  return { wmm: W, hmm: H, landscape: best.landscape, cols, rows, per: best.per, slots, marks };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Groups pages into sheets: copies of each page filling its own sheet, or pages one after another. */
export function toSheets<T extends Page>(pages: T[], per: number, fill: boolean): T[][] {
  if (fill) return pages.map((p) => Array.from({ length: per }, () => p));
  const out: T[][] = [];
  for (let i = 0; i < pages.length; i += per) out.push(pages.slice(i, i + per));
  return out;
}
