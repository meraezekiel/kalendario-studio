import { samplePhoto } from './samplePhoto';
import type { Asset, CalendarDoc, ImageEl, Page } from './types';
import { r1 } from './utils';

/** Everything an element needs from outside itself to render. */
export interface RenderCtx {
  year: number;
  holidays: boolean;
  assets: CalendarDoc['assets'];
  edit: boolean;
}

export const assetFor = (src: string, pg: Page, assets: CalendarDoc['assets']): Asset | undefined =>
  src === '@sample' ? samplePhoto(pg.month) : assets[src];

/** 16-direction text-shadow that fakes a text outline. */
export function outlineShadow(w: number, c: string) {
  const o: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    o.push(`${r1(Math.cos(a) * w)}px ${r1(Math.sin(a) * w)}px 0 ${c}`);
  }
  return o.join(',');
}

/** Rendered size of a photo inside its frame for the current fit and zoom. */
export function imageScale(el: ImageEl, a: Asset) {
  const bw = el.w - 2 * (el.bw || 0), bh = el.h - 2 * (el.bw || 0);
  const s = (el.fit === 'contain' ? Math.min(bw / a.w, bh / a.h) : Math.max(bw / a.w, bh / a.h)) * el.zoom;
  return { bw, bh, iw: a.w * s, ih: a.h * s };
}
