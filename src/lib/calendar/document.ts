import { DW, MONTHS, PAPERS } from './constants';
import { mkImage } from './factories';
import type { CalendarDoc, ImageEl, Page, PageDims } from './types';
import { clone, uid } from './utils';

export function dims(pg: Page): PageDims {
  const p = pg.paper;
  const [n, a, b] = PAPERS[p.size] || PAPERS.A4;
  const land = p.o === 'l';
  const wmm = land ? Math.max(a, b) : Math.min(a, b);
  const hmm = land ? Math.min(a, b) : Math.max(a, b);
  return { wmm, hmm, W: DW, H: Math.round((DW * hmm) / wmm), label: `${n}, ${land ? 'landscape' : 'portrait'}` };
}

/** Calendar year and month shown by a page, optionally offset by `mo` months. */
export function monthOf(year: number, pg: Page, mo = 0) {
  const a = pg.month + mo;
  return { y: year + Math.floor(a / 12), m: ((a % 12) + 12) % 12 };
}

/** Replaces {MONTH}, {Month}, {month}, {MON}, {Mon}, {YEAR} and offsets like {MONTH+1}. */
export function tok(s: string, year: number, pg: Page, base = 0): string {
  return String(s).replace(/\{(MONTH|Month|month|MON|Mon|YEAR)([+-]\d+)?\}/g, (_, k: string, o?: string) => {
    const { y, m } = monthOf(year, pg, base + +(o || 0));
    switch (k) {
      case 'MONTH': return MONTHS[m].toUpperCase();
      case 'Month': return MONTHS[m];
      case 'month': return MONTHS[m].toLowerCase();
      case 'MON': return MONTHS[m].slice(0, 3).toUpperCase();
      case 'Mon': return MONTHS[m].slice(0, 3);
      default: return String(y);
    }
  });
}

export function clonePage(p: Page): Page {
  const c = clone(p);
  c.id = uid();
  c.els.forEach((e) => (e.id = uid()));
  return c;
}

/**
 * Builds the rest of the year from the pages sharing the current page's month.
 * A page with three calendars (mo 0..2) steps three months at a time.
 * Mutates `doc` and returns the number of pages produced.
 */
export function makeYear(doc: CalendarDoc): number {
  const cur = doc.pages[doc.cur];
  const b = cur.month;
  const set = doc.pages.filter((p) => p.month === b);
  const step = Math.max(1, ...set.flatMap((p) => p.els.flatMap((e) => (e.type === 'cal' || e.type === 'events' ? [e.mo + 1] : []))));
  const out: Page[] = [];
  for (let m = b; m < 12; m += step) {
    if (m === b) {
      out.push(...set);
      continue;
    }
    set.forEach((p) => {
      const c = clonePage(p);
      c.month = m;
      c.els.forEach((e) => {
        if (e.type === 'cal') e.days = {};
      });
      out.push(c);
    });
  }
  doc.pages = out;
  doc.cur = 0;
  return out.length;
}

/**
 * Copies the current page's layout onto every other page with the same role.
 * Each page keeps its own month, uploaded photos, background images and per-day details.
 * Mutates `doc` and returns how many pages changed.
 */
export function syncDesign(doc: CalendarDoc): number {
  const cur = doc.pages[doc.cur];
  let n = 0;
  doc.pages.forEach((p) => {
    if (p === cur || p.role !== cur.role) return;
    n++;
    const oc = p.els.filter((e) => e.type === 'cal');
    // Backgrounds and ordinary photos are matched separately, so a month's photo never lands in its background.
    const oi = p.els.filter((e) => e.type === 'image' && !e.isBg);
    const ob = p.els.filter((e) => e.type === 'image' && e.isBg);
    let ci = 0, ii = 0, bi = 0;
    p.els = clone(cur.els).map((e) => {
      e.id = uid();
      if (e.type === 'cal') {
        const o = oc[ci++];
        e.days = o && o.type === 'cal' ? clone(o.days) : {};
      }
      if (e.type === 'image') {
        const o = e.isBg ? ob[bi++] : oi[ii++];
        if (o && o.type === 'image' && o.src && o.src !== '@sample') {
          e.src = o.src;
          e.zoom = o.zoom;
          e.px = o.px;
          e.py = o.py;
        }
      }
      return e;
    });
    p.bg = cur.bg;
    p.paper = clone(cur.paper);
  });
  return n;
}

/** Whether any page still references an asset id (as photo or day picture). */
export function assetInUse(doc: CalendarDoc, id: string): boolean {
  return doc.pages.some((p) =>
    p.els.some((e) => (e.type === 'image' && e.src === id) || (e.type === 'cal' && Object.values(e.days).some((d) => d.img === id))),
  );
}

/** A full-page background image, to be put behind everything on `pg`. */
export function mkBackground(pg: Page, src = ''): ImageEl {
  const D = dims(pg);
  return mkImage({ name: 'Background', isBg: true, x: 0, y: 0, w: D.W, h: D.H, src });
}

/** The page's first background image, created full-page at the back when there is none. */
export function ensureBackground(pg: Page): ImageEl {
  const found = pg.els.find((e): e is ImageEl => e.type === 'image' && !!e.isBg);
  if (found) return found;
  const b = mkBackground(pg);
  pg.els.unshift(b);
  return b;
}

type LegacyPage = Page & { bgImg?: string; bgFit?: 'cover' | 'contain'; bgOp?: number };

/** Turns an older page-wide background photo into a background image element. Mutates `doc`. */
export function migrateDoc(doc: CalendarDoc): CalendarDoc {
  for (const p of doc.pages as LegacyPage[]) {
    if (p.bgImg) p.els.unshift({ ...mkBackground(p, p.bgImg), fit: p.bgFit ?? 'cover', op: p.bgOp ?? 1 });
    delete p.bgImg;
    delete p.bgFit;
    delete p.bgOp;
  }
  return doc;
}