import { describe, expect, it } from 'vitest';
import { mkImage, mkPage } from '@/lib/calendar/factories';
import type { CalendarDoc } from '@/lib/calendar/types';
import { applyMyTemplate, isMyTemplate, makeMyTemplate } from './myTemplates';

const photo = { src: 'data:image/png;base64,AAAA', w: 10, h: 10 };
const doc = (): CalendarDoc => ({
  v: 3, year: 2027, holidays: true, cur: 0, tray: ['used', 'unused'],
  assets: { used: photo, unused: photo },
  pages: [mkPage('A4', 'p', '#fff', [mkImage({ src: 'used' })]), mkPage('A4', 'p', '#fff', [])],
});

describe('my templates', () => {
  it('keeps every page and only the photos in use', () => {
    const t = makeMyTemplate(doc(), '  Santos Family  ');
    expect(t.name).toBe('Santos Family');
    expect(t.pages).toHaveLength(2);
    expect(Object.keys(t.assets)).toEqual(['used']);
    expect(isMyTemplate(t)).toBe(true);
    expect(isMyTemplate({ id: 'x', name: 'y', pages: [] })).toBe(false);
    expect(makeMyTemplate(doc(), '   ').name).toBe('My template');
  });

  it('applies as fresh copies and brings its photos along', () => {
    const src = doc();
    const t = makeMyTemplate(src, 'A');
    const target: CalendarDoc = { ...doc(), assets: {}, tray: [], pages: [mkPage('A4', 'p', '#fff', [])], cur: 0 };
    applyMyTemplate(target, t);
    expect(target.pages).toHaveLength(2);
    expect(target.pages[0].id).not.toBe(t.pages[0].id);
    expect(target.pages[0].els[0].id).not.toBe(t.pages[0].els[0].id);
    expect(target.assets.used).toEqual(photo);
    expect(target.tray).toEqual(['used']);
    // The template itself is untouched.
    target.pages[0].bg = '#000';
    expect(t.pages[0].bg).toBe('#fff');
  });
});
