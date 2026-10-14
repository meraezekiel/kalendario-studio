'use client';

import type { RenderCtx } from '@/lib/calendar/render';
import type { Page, TextEl } from '@/lib/calendar/types';
import { useTextElementHandler } from './useTextElementHandler';

interface Props {
  el: TextEl;
  page: Page;
  ctx: RenderCtx;
  editing: boolean;
}

export default function TextElement({ el, page, ctx, editing }: Props) {
  const { ref, style, display, commit, onKeyDown } = useTextElementHandler(el, page, ctx, editing);
  // Separate keys: while editing, the browser owns the text nodes, so React must not reuse them afterwards.
  if (editing) {
    return <div key="edit" ref={ref} className="tx" style={style} contentEditable suppressContentEditableWarning onBlur={commit} onKeyDown={onKeyDown} data-testid="text-editor" />;
  }
  return <div key="view" className="tx" style={style}>{display}</div>;
}
