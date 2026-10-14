import type { CSSProperties } from 'react';
import { assetFor, imageScale, type RenderCtx } from '@/lib/calendar/render';
import type { ImageEl, Page } from '@/lib/calendar/types';
import { r1 } from '@/lib/calendar/utils';

export function useImageElementHandler(el: ImageEl, page: Page, ctx: RenderCtx) {
  const a = el.src ? assetFor(el.src, page, ctx.assets) : undefined;
  const rad = ((el.radius || 0) / 100) * Math.min(el.w, el.h);
  const frame: CSSProperties = {
    borderRadius: r1(rad),
    border: el.bw ? `${el.bw}px solid ${el.bc}` : undefined,
    boxShadow: el.shadow ? '0 8px 22px rgba(0,0,0,.25)' : undefined,
  };
  if (!a) return { frame, photo: null };
  const { iw, ih } = imageScale(el, a);
  const photo: CSSProperties = {
    ...frame,
    backgroundImage: `url('${a.src}')`,
    backgroundSize: `${r1(iw)}px ${r1(ih)}px`,
    backgroundPosition: `${el.px}% ${el.py}%`,
  };
  return { frame, photo };
}
