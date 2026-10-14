'use client';

import type { RenderCtx } from '@/lib/calendar/render';
import type { ImageEl, Page } from '@/lib/calendar/types';
import { useImageElementHandler } from './useImageElementHandler';

interface Props {
  el: ImageEl;
  page: Page;
  ctx: RenderCtx;
}

export default function ImageElement({ el, page, ctx }: Props) {
  const { frame, photo } = useImageElementHandler(el, page, ctx);
  if (photo) return <div className="im" style={photo} />;
  if (!ctx.edit) return null;
  return (
    <div className="ph-empty" style={frame}>
      Drop a photo
      <br />
      or double-click
    </div>
  );
}
