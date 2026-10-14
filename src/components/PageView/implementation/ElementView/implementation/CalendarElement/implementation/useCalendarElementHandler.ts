import type { CSSProperties } from 'react';
import { calendarLayout } from '@/lib/calendar/calendarLayout';
import { PILLS } from '@/lib/calendar/constants';
import { monthOf, tok } from '@/lib/calendar/document';
import { holidays } from '@/lib/calendar/holidays';
import type { RenderCtx } from '@/lib/calendar/render';
import type { CalEl, Page } from '@/lib/calendar/types';

export interface CellView {
  key: number;
  day: number | null;
  className: string;
  style: CSSProperties;
  num: string | null;
  numStyle: CSSProperties;
  label: string;
  labelStyle: CSSProperties;
  img: string | null;
}

const H_ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;
const NUM_POS = { center: ['center', 'center'], tl: ['flex-start', 'flex-start'], tr: ['flex-start', 'flex-end'] } as const;

export function useCalendarElementHandler(el: CalEl, page: Page, ctx: RenderCtx, selDay: number | null) {
  const { y, m } = monthOf(ctx.year, page, el.mo);
  const hol = ctx.holidays && el.labels ? holidays(y, m) : {};
  const L = calendarLayout(el, y, m);
  const g = L.gap;

  const outer: CSSProperties = L.border ? { border: `${L.border}px solid ${el.borderColor}` } : {};

  let head: { style: CSSProperties; parts: string[] } | null = null;
  if (el.head) {
    const parts = tok(el.headText, ctx.year, page, el.mo).split('|');
    head = {
      parts,
      style: {
        height: L.headH,
        fontFamily: `'${el.headFont}',sans-serif`,
        fontSize: Math.round(L.headH * 0.62),
        color: el.headColor,
        background: el.headBg || 'transparent',
        justifyContent: parts.length > 1 ? 'space-between' : H_ALIGN[el.headAlign],
      },
    };
  }

  let week: { style: CSSProperties; days: { key: number; name: string; style: CSSProperties }[] } | null = null;
  if (el.wk) {
    const pills = el.wkStyle === 'pills';
    const lineB = el.lines && !g && el.wkStyle === 'plain' ? `1px solid ${L.border ? el.borderColor : el.lineColor}` : undefined;
    week = {
      style: {
        height: L.wkH,
        gap: pills ? Math.max(g, 4) : 0,
        marginBottom: g,
        fontFamily: `'${el.wkFont}',sans-serif`,
        fontWeight: 600,
        fontSize: Math.round(L.wkH * (el.wkLen === 'long' ? 0.4 : 0.55)),
        borderBottom: lineB,
      },
      days: L.weekdays.map(({ dow, name, hi }) => ({
        key: dow,
        name,
        style: pills
          ? { background: el.rainbow ? PILLS[dow] : hi ? el.hiColor : el.wkBg, color: el.wkColor, borderRadius: 999 }
          : el.wkStyle === 'bar'
            ? { background: hi ? el.hiColor : el.wkBg, color: el.wkColor }
            : { color: hi ? el.hiColor : el.wkColor },
      })),
    };
  }

  const ln = el.lines && !g, lc = el.lineColor;
  const [ai, jc] = NUM_POS[el.numPos] || NUM_POS.center;
  const pad = el.numPos === 'center' ? '0' : `${Math.round(L.ch * 0.08)}px ${Math.round(L.cw * 0.1)}px`;
  const numBase: CSSProperties = { fontFamily: `'${el.numFont}',sans-serif`, fontSize: L.numSize, fontWeight: el.numBold ? 700 : 400 };

  const cells: CellView[] = L.cells.map((c, i) => {
    const bord: CSSProperties = ln
      ? { borderBottom: `1px solid ${lc}`, borderRight: c.col < 6 ? `1px solid ${lc}` : undefined }
      : el.lines ? { border: `1px solid ${lc}` } : {};
    const rad: CSSProperties = el.radius ? { borderRadius: el.radius } : {};
    const align: CSSProperties = { alignItems: ai, justifyContent: jc, padding: pad };

    if (c.day == null) {
      if (el.adjacent) {
        return { key: i, day: null, className: 'cell', style: { ...bord, ...rad, background: el.cellBg, ...align }, num: String(c.adj), numStyle: { ...numBase, color: '#c8c8c8' }, label: '', labelStyle: {}, img: null };
      }
      return { key: i, day: null, className: 'cell', style: g ? {} : { ...bord, background: el.cellBg }, num: null, numStyle: {}, label: '', labelStyle: {}, img: null };
    }
    const n = c.day;
    const info = el.days[n] || {};
    const h = hol[n] && !info.hideHol ? hol[n] : '';
    const hi = el.hiDays.includes(c.dow) || !!h;
    const lbl = info.label || h;
    const img = info.img && ctx.assets[info.img] ? ctx.assets[info.img].src : null;
    const dsel = ctx.edit && selDay === n;
    return {
      key: i,
      day: n,
      className: `cell${img ? ' hasimg' : ''}${dsel ? ' dsel' : ''}`,
      style: { ...bord, ...rad, background: info.bg || el.cellBg, ...align },
      num: info.num ?? String(n),
      numStyle: { ...numBase, color: hi ? el.hiColor : el.numColor },
      label: lbl && L.ch > 22 ? lbl : '',
      labelStyle: { fontSize: L.labelSize, color: el.hiColor },
      img,
    };
  });

  const gridStyle: CSSProperties = {
    gap: g,
    gridTemplateRows: `repeat(${L.rows},minmax(0,1fr))`,
    borderTop: ln ? `${el.wk && el.wkStyle === 'plain' ? 0 : 1}px solid ${lc}` : undefined,
  };

  return { outer, head, week, cells, gridStyle };
}
