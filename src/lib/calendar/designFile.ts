import { migrateDoc } from './document';
import type { CalendarDoc } from './types';

/** A design file is the whole calendar (photos included) wrapped with a small header. */
export const DESIGN_EXT = '.kalendaryo';
const APP = 'kalendaryo-studio';
const FORMAT = 1;

export const isDoc = (d: unknown): d is CalendarDoc =>
  !!d && typeof d === 'object' && (d as CalendarDoc).v === 3 && Array.isArray((d as CalendarDoc).pages) && (d as CalendarDoc).pages.length > 0;

export function serializeDesign(doc: CalendarDoc, savedAt = new Date()): string {
  return JSON.stringify({ app: APP, format: FORMAT, savedAt: savedAt.toISOString(), doc });
}

/** Reads a design file; also accepts a bare calendar document. Throws a message people can read. */
export function parseDesign(text: string): CalendarDoc {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This is not a Kalendaryo design file.');
  }
  const wrapped = data && typeof data === 'object' && (data as { app?: string }).app === APP;
  if (wrapped && (data as { format: number }).format > FORMAT) throw new Error('This design was saved by a newer version. Reload the page and try again.');
  const doc = wrapped ? (data as { doc: unknown }).doc : data;
  if (!isDoc(doc)) throw new Error('This is not a Kalendaryo design file.');
  return migrateDoc({ ...doc, cur: Math.min(Math.max(0, doc.cur | 0), doc.pages.length - 1), assets: doc.assets ?? {}, tray: doc.tray ?? [] });
}

/** File name like "my-calendar-2027.kalendaryo". */
export const designFileName = (doc: CalendarDoc) => `my-calendar-${doc.year}${DESIGN_EXT}`;
