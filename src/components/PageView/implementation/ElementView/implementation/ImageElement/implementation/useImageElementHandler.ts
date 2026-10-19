import type { CSSProperties } from 'react';
import { assetFor, imageScale, type RenderCtx } from '@/lib/calendar/render';
import type { ImageEl, Page } from '@/lib/calendar/types';
import { r1 } from '@/lib/calendar/utils';
import { usePhotoUrl } from '@/store/usePhotoUrlStore';

export function useImageElementHandler(el: ImageEl, page: Page, ctx: RenderCtx) {
  const a = el.src ? assetFor(el.src, page, ctx.assets) : undefined;
  // A cloud photo that hasn't arrived yet (or failed to) shows as an empty frame.
  const url = usePhotoUrl(a?.src);
  const rad = ((el.radius || 0) / 100) * Math.min(el.w, el.h);
  const frame: CSSProperties = {
    borderRadius: r1(rad),
    border: el.bw ? `${el.bw}px solid ${el.bc}` : undefined,
    boxShadow: el.shadow ? '0 8px 22px rgba(0,0,0,.25)' : undefined,
  };
  if (!a || !url) return { frame, photo: null };
  const { iw, ih } = imageScale(el, a);
  const photo: CSSProperties = {
    ...frame,
    backgroundImage: `url('${url}')`,
    backgroundSize: `${r1(iw)}px ${r1(ih)}px`,
    backgroundPosition: `${el.px}% ${el.py}%`,
  };
  return { frame, photo };
}
