import { DL, DS } from './constants';
import type { CalEl } from './types';
import { clamp, r1 } from './utils';

export interface CalCell {
  /** Day of month, or null for a padding cell. */
  day: number | null;
  /** Day number of the previous/next month shown in a padding cell. */
  adj: number | null;
  dow: number;
  col: number;
}

export interface CalLayout {
  y: number;
  m: number;
  border: number;
  gap: number;
  headH: number;
  wkH: number;
  rows: number;
  cw: number;
  ch: number;
  numSize: number;
  labelSize: number;
  weekdays: { dow: number; name: string; hi: boolean }[];
  cells: CalCell[];
}

/** Sizes and cell list for a month table of `el` showing month `m` of year `y`. */
export function calendarLayout(el: CalEl, y: number, m: number): CalLayout {
  const B = el.border || 0, W = el.w - 2 * B, H = el.h - 2 * B, g = +el.gap || 0;
  const headH = el.head ? Math.round(clamp(H * 0.12, 14, 120) * el.headScale) : 0;
  const wkH = el.wk ? Math.round(clamp(H * 0.075, 10, 48)) : 0;
  const off = (new Date(y, m, 1).getDay() - el.startDay + 7) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const pdim = new Date(y, m, 0).getDate();
  const rows = Math.ceil((off + dim) / 7);
  const gridH = H - headH - wkH - (el.wk ? g : 0);
  const cw = (W - 6 * g) / 7, ch = (gridH - (rows - 1) * g) / rows;
  const numSize = Math.max(6, Math.round(Math.min(ch * 0.55, cw * 0.5) * el.numScale));
  const labelSize = r1(clamp(Math.min(ch * 0.12, cw * 0.13), 5, 12));

  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const dow = (el.startDay + i) % 7;
    const name = (el.wkLen === 'long' ? DL[dow] : el.wkLen === 'letter' ? DS[dow][0] : DS[dow]).toUpperCase();
    return { dow, name, hi: el.hiDays.includes(dow) };
  });

  const cells: CalCell[] = [];
  for (let i = 0; i < rows * 7; i++) {
    const n = i - off + 1;
    const inMonth = n >= 1 && n <= dim;
    cells.push({ day: inMonth ? n : null, adj: inMonth ? null : n < 1 ? pdim + n : n - dim, dow: (el.startDay + i) % 7, col: i % 7 });
  }
  return { y, m, border: B, gap: g, headH, wkH, rows, cw, ch, numSize, labelSize, weekdays, cells };
}
