import { describe, expect, it } from 'vitest';
import { designFileName, parseDesign, serializeDesign } from './designFile';
import { mkImage, mkPage } from './factories';
import type { CalendarDoc } from './types';

const doc = (): CalendarDoc => ({
  v: 3, year: 2027, holidays: true, cur: 0, tray: ['a1'],
  assets: { a1: { src: 'data:image/png;base64,AAAA', w: 10, h: 10 } },
  pages: [mkPage('A4', 'p', '#fff', [mkImage({ src: 'a1' })])],
});

describe('design file', () => {
  it('round-trips the whole calendar, photos included', () => {
    const d = doc();
    const back = parseDesign(serializeDesign(d));
    expect(back).toEqual(d);
    expect(designFileName(d)).toBe('my-calendar-2027.kalendaryo');
  });
  it('accepts a bare document and clamps the current page', () => {
    expect(parseDesign(JSON.stringify({ ...doc(), cur: 9 })).cur).toBe(0);
  });
  it('rejects files that are not designs', () => {
    expect(() => parseDesign('hello')).toThrow(/not a Kalendaryo design/);
    expect(() => parseDesign('{"v":3,"pages":[]}')).toThrow(/not a Kalendaryo design/);
    expect(() => parseDesign(JSON.stringify({ app: 'kalendaryo-studio', format: 99, doc: doc() }))).toThrow(/newer version/);
  });
});
