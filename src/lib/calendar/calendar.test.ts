import { describe, expect, it } from 'vitest';
import { calendarLayout } from './calendarLayout';
import { dims, makeYear, monthOf, syncDesign, tok } from './document';
import { mkCal, mkImage, mkPage, mkText } from './factories';
import { easter, holidays } from './holidays';
import { TEMPLATES } from './templates';
import type { CalendarDoc } from './types';

const docWith = (pages = TEMPLATES.pastel.make()): CalendarDoc => ({ v: 3, year: 2027, holidays: true, cur: 0, assets: {}, tray: [], pages });

describe('holidays', () => {
  it('computes Easter Sunday', () => {
    expect(easter(2027).toDateString()).toBe(new Date(2027, 2, 28).toDateString());
    expect(easter(2026).toDateString()).toBe(new Date(2026, 3, 5).toDateString());
  });
  it('lists fixed, Holy Week and National Heroes Day holidays', () => {
    expect(holidays(2027, 0)[1]).toBe("New Year's Day");
    expect(holidays(2027, 2)[26]).toBe('Good Friday');
    expect(holidays(2027, 7)[30]).toBe('National Heroes Day'); // last Monday of Aug 2027
    expect(holidays(2027, 11)[25]).toBe('Christmas Day');
  });
});

describe('tokens', () => {
  const pg = { ...mkPage('A4', 'p', '#fff', []), month: 11 };
  it('fills month and year and handles offsets across the year boundary', () => {
    expect(tok('{MONTH} {YEAR}', 2027, pg)).toBe('DECEMBER 2027');
    expect(tok('{Month+1} {YEAR+1}', 2027, pg)).toBe('January 2028');
    expect(tok('{Mon}/{mon}', 2027, pg)).toBe('Dec/{mon}');
    expect(monthOf(2027, pg, 2)).toEqual({ y: 2028, m: 1 });
  });
});

describe('dims', () => {
  it('keeps width fixed and derives height from paper', () => {
    expect(dims(mkPage('A4', 'p', '', [])).H).toBe(1123);
    expect(dims(mkPage('A4', 'l', '', [])).H).toBe(561);
    expect(dims(mkPage('Legal', 'p', '', [])).H).toBe(1308);
  });
});

describe('calendarLayout', () => {
  it('pads February 2027 (starts Monday) correctly', () => {
    const L = calendarLayout(mkCal(), 2027, 1);
    expect(L.cells.slice(0, 2).map((c) => c.day)).toEqual([null, 1]);
    expect(L.cells.filter((c) => c.day).length).toBe(28);
    expect(L.rows).toBe(5);
  });
  it('honours Monday-first weeks', () => {
    const L = calendarLayout(mkCal({ startDay: 1 }), 2027, 1);
    expect(L.cells[0].day).toBe(1);
    expect(L.weekdays[0].name).toBe('MON');
    expect(L.rows).toBe(4);
  });
});

describe('makeYear / syncDesign', () => {
  it('creates one page per remaining month', () => {
    const d = docWith();
    expect(makeYear(d)).toBe(12);
    expect(d.pages.map((p) => p.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it('steps by three for a three-month sheet', () => {
    const d = docWith(TEMPLATES.give3.make());
    expect(makeYear(d)).toBe(4);
  });
  it('copies layout but keeps each page photo and day details', () => {
    const d = docWith([
      mkPage('A4', 'p', '#fff', [mkText({ text: 'A' }), mkImage({ src: '@sample' }), mkCal()]),
      { ...mkPage('A4', 'p', '#000', [mkImage({ src: 'a1' }), mkCal({ days: { 3: { label: 'Fiesta' } } })]), month: 1 },
    ]);
    expect(syncDesign(d)).toBe(1);
    const p = d.pages[1];
    expect(p.bg).toBe('#fff');
    expect(p.els.map((e) => e.type)).toEqual(['text', 'image', 'cal']);
    const img = p.els[1];
    const cal = p.els[2];
    expect(img.type === 'image' && img.src).toBe('a1');
    expect(cal.type === 'cal' && cal.days[3].label).toBe('Fiesta');
  });
});
