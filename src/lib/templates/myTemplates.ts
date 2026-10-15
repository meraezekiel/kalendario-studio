import { assetInUse, clonePage } from '@/lib/calendar/document';
import type { Asset, CalendarDoc, Page } from '@/lib/calendar/types';
import { clone, uid } from '@/lib/calendar/utils';

/** A design the user saved to reuse; kept in this browser only. */
export interface MyTemplate {
  id: string;
  name: string;
  savedAt: string;
  pages: Page[];
  /** Only the photos the pages use. */
  assets: Record<string, Asset>;
}

export const MY_TEMPLATES_KEY = 'kalendaryo-templates-v1';
export const NAME_MAX = 60;

export const isMyTemplate = (t: unknown): t is MyTemplate =>
  !!t && typeof t === 'object' && typeof (t as MyTemplate).id === 'string' && typeof (t as MyTemplate).name === 'string' &&
  Array.isArray((t as MyTemplate).pages) && (t as MyTemplate).pages.length > 0;

/** Snapshot of the whole calendar (every page and the photos on them) as a template. */
export function makeMyTemplate(doc: CalendarDoc, name: string, now = new Date()): MyTemplate {
  const assets: Record<string, Asset> = {};
  for (const id in doc.assets) if (assetInUse(doc, id)) assets[id] = doc.assets[id];
  return { id: uid(), name: name.trim().slice(0, NAME_MAX) || 'My template', savedAt: now.toISOString(), pages: clone(doc.pages), assets: clone(assets) };
}

/** Replaces the calendar's pages with fresh copies of the template's; its photos join the Photos tray. */
export function applyMyTemplate(doc: CalendarDoc, t: MyTemplate) {
  doc.pages = t.pages.map(clonePage);
  doc.cur = 0;
  for (const id in t.assets) {
    if (!doc.assets[id]) doc.assets[id] = clone(t.assets[id]);
    if (!doc.tray.includes(id)) doc.tray.push(id);
  }
}
