'use client';

import { memo } from 'react';
import type { RenderCtx } from '@/lib/calendar/render';
import type { El, Page } from '@/lib/calendar/types';
import CalendarElement from './CalendarElement/implementation/CalendarElement';
import EventsElement from './EventsElement/implementation/EventsElement';
import ImageElement from './ImageElement/implementation/ImageElement';
import ShapeElement from './ShapeElement/implementation/ShapeElement';
import TextElement from './TextElement/implementation/TextElement';
import { useElementViewHandler } from './useElementViewHandler';

interface Props {
  el: El;
  page: Page;
  ctx: RenderCtx;
  crop: boolean;
  selDay: number | null;
  editDay: number | null;
  editText: boolean;
}

/** Positioned wrapper for one element; picks the renderer for its type. */
function ElementView({ el, page, ctx, crop, selDay, editDay, editText }: Props) {
  const { style, className } = useElementViewHandler(el, crop);
  if (el.hidden) return null;
  return (
    <div className={className} data-id={el.id} style={style}>
      {el.type === 'text' && <TextElement el={el} page={page} ctx={ctx} editing={editText} />}
      {el.type === 'image' && <ImageElement el={el} page={page} ctx={ctx} />}
      {el.type === 'shape' && <ShapeElement el={el} />}
      {el.type === 'cal' && <CalendarElement el={el} page={page} ctx={ctx} selDay={selDay} editDay={editDay} />}
      {el.type === 'events' && <EventsElement el={el} page={page} ctx={ctx} />}
    </div>
  );
}

export default memo(ElementView);
