import type { CSSProperties } from 'react';
import { calendarLayout } from '@/lib/calendar/calendarLayout';
import { MONTHS, PILLS } from '@/lib/calendar/constants';
import { monthOf, tok } from '@/lib/calendar/document';
import { holidays } from '@/lib/calendar/holidays';
import { MOON_NAMES, type MoonPhase, moonPhases, TIDE_NAMES, type TideKind, tideDays } from '@/lib/calendar/moon';
import type { RenderCtx } from '@/lib/calendar/render';
import type { CalEl, Page } from '@/lib/calendar/types';
import { clock, tideTurns } from '@/lib/calendar/tide';
import { TIDE_HI_COLOR, TIDE_LO_COLOR, tidePlace } from '@/lib/calendar/tidePlaces';
import { r1 } from '@/lib/calendar/utils';

export interface CellView {
  key: number;
  day: number | null;
  className: string;
  style: CSSProperties;
  num: string | null;
  numStyle: CSSProperties;
  label: string;
  labelStyle: CSSProperties;
  /** The day's photo source (may be a cloud `sb:` one; DayCell resolves it and adds `hasimg`). */
  img: string | null;
  moon?: MoonView;
  tide?: TideView;
  /** High and low water times, in order. */
  times?: { key: number; text: string; style: CSSProperties }[];
  timesStyle?: CSSProperties;
}

export interface MoonView {
  phase: MoonPhase;
  /** Big = fills an empty box with name and date; small = an icon in the corner of its day. */
  big: boolean;
  name: string;
  date: string;
  size: number;
  color: string;
  textSize: number;
}

export interface TideView {
  kind: TideKind;
  name: string;
  size: number;
  color: string;
}

const H_ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;
const NUM_POS = { center: ['center', 'center'], tl: ['flex-start', 'flex-start'], tr: ['flex-start', 'flex-end'] } as const;

export function useCalendarElementHandler(el: CalEl, page: Page, ctx: RenderCtx, selDay: number | null) {
  const { y, m } = monthOf(ctx.year, page, el.mo);
  // Holidays always colour their day; `labels` only decides whether the name is written in the box.
  const hol = ctx.holidays ? holidays(y, m) : {};
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

  // Tide times take the bottom of every box (room for four, so the numbers line up); the numbers shrink only if they must.
  const place = tidePlace(el.tidePlace);
  const turns = place ? tideTurns(place, y, m) : {};
  const hiColor = el.tideHiColor || TIDE_HI_COLOR, loColor = el.tideLoColor || TIDE_LO_COLOR;
  const timesSize = r1(Math.max(5, L.labelSize * 0.9));
  const timesH = place ? Math.ceil(4 * timesSize * 1.1 + 5) : 0;
  const fitNum = (footH: number) => (footH ? Math.min(L.numSize, Math.round((L.ch - footH) * 0.85)) : L.numSize);
  /** A holiday name above the times needs room too; a rough line count (bold capitals are about 0.7em wide). */
  const footFor = (lbl: string) => timesH + (lbl ? Math.min(3, Math.ceil((lbl.length * L.labelSize * 0.7) / (L.cw - 6))) * L.labelSize * 1.08 + 2 : 0);
  const numBase: CSSProperties = { fontFamily: `'${el.numFont}',sans-serif`, fontSize: fitNum(timesH), fontWeight: el.numBold ? 700 : 400 };

  // Moon phases go into the empty boxes in order; any that don't fit mark their own day instead.
  const phases = el.moon ? moonPhases(y, m) : [];
  const empty = el.adjacent || L.ch < 40 || L.cw < 40 ? [] : L.cells.flatMap((c, i) => (c.day == null ? [i] : []));
  const bigAt = new Map<number, (typeof phases)[number]>();
  const smallOn = new Map<number, MoonPhase>();
  phases.forEach((p, i) => (i < empty.length ? bigAt.set(empty[i], p) : smallOn.set(p.day, p.phase)));
  const mon = MONTHS[m].slice(0, 3).toUpperCase();
  const moonText = r1(Math.max(5, Math.min(L.labelSize * 1.1, L.cw * 0.11)));
  const bigMoon = (p: (typeof phases)[number]): MoonView => ({
    phase: p.phase, big: true, name: MOON_NAMES[p.phase], date: `${mon}. ${p.day}`,
    size: Math.round(Math.min(L.cw, L.ch) * 0.46), color: el.hiColor, textSize: moonText,
  });
  const smallMoon = (phase: MoonPhase, day: number): MoonView => ({
    phase, big: false, name: MOON_NAMES[phase], date: `${mon}. ${day}`,
    size: Math.max(8, Math.round(Math.min(L.cw, L.ch) * 0.22)), color: el.hiColor, textSize: moonText,
  });

  const tides = el.tides ? tideDays(y, m) : {};
  const timesStyle: CSSProperties = { fontSize: timesSize };
  const tideSize = Math.max(8, Math.round(Math.min(L.cw, L.ch) * 0.2));

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
      const mp = bigAt.get(i);
      return { key: i, day: null, className: 'cell', style: g && !mp ? {} : { ...bord, ...rad, background: el.cellBg }, num: null, numStyle: {}, label: '', labelStyle: {}, img: null, moon: mp && bigMoon(mp) };
    }
    const n = c.day;
    const info = el.days[n] || {};
    const h = hol[n] && !info.hideHol ? hol[n] : '';
    const hi = el.hiDays.includes(c.dow) || !!h;
    const lbl = info.label || (el.labels ? h : '');
    const img = info.img && ctx.assets[info.img] ? ctx.assets[info.img].src : null;
    const dsel = ctx.edit && selDay === n;
    const label = lbl && L.ch > 22 ? lbl : '';
    const footH = place ? footFor(label) : 0;
    return {
      key: i,
      day: n,
      className: `cell${dsel ? ' dsel' : ''}`,
      style: { ...bord, ...rad, background: info.bg || el.cellBg, ...align, ...(footH ? { paddingBottom: footH } : {}) },
      num: info.num ?? String(n),
      numStyle: { ...numBase, fontSize: fitNum(footH), color: hi ? el.hiColor : el.numColor },
      label,
      labelStyle: { fontSize: L.labelSize, color: el.hiColor },
      img,
      moon: smallOn.has(n) ? smallMoon(smallOn.get(n)!, n) : undefined,
      times: turns[n]?.map((t, k) => ({ key: k, text: `${t.high ? 'H' : 'L'} ${clock(t.min)}`, style: { color: t.high ? hiColor : loColor } })),
      timesStyle,
      tide: tides[n] && { kind: tides[n], name: TIDE_NAMES[tides[n]], size: tideSize, color: el.hiColor },
    };
  });

  const gridStyle: CSSProperties = {
    gap: g,
    gridTemplateRows: `repeat(${L.rows},minmax(0,1fr))`,
    borderTop: ln ? `${el.wk && el.wkStyle === 'plain' ? 0 : 1}px solid ${lc}` : undefined,
  };

  return { outer, head, week, cells, gridStyle };
}
