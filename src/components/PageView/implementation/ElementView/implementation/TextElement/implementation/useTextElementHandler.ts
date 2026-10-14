import { type CSSProperties, type KeyboardEvent, useLayoutEffect, useRef } from 'react';
import { tok } from '@/lib/calendar/document';
import { outlineShadow, type RenderCtx } from '@/lib/calendar/render';
import type { Page, TextEl } from '@/lib/calendar/types';
import { useStudioStore } from '@/store/useStudioStore';

const JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

export function useTextElementHandler(el: TextEl, page: Page, ctx: RenderCtx, editing: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  // Entering edit mode: show the raw text (with tokens) and select it all.
  useLayoutEffect(() => {
    const n = ref.current;
    if (!editing || !n) return;
    n.innerText = el.text;
    n.focus();
    document.getSelection()?.selectAllChildren(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = () => {
    const n = ref.current;
    if (!n) return;
    const text = n.innerText.replace(/\n$/, '');
    const st = useStudioStore.getState();
    st.set({ editing: null });
    if (text !== el.text) {
      st.mutate((d) => {
        const e = d.pages[d.cur].els.find((x) => x.id === el.id);
        if (e && e.type === 'text') e.text = text;
      });
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  const shadows = [el.outline ? outlineShadow(el.outline, el.outlineColor) : '', el.shadow ? '0 4px 14px rgba(0,0,0,.35)' : ''].filter(Boolean).join(',');
  const style: CSSProperties = {
    fontFamily: `'${el.font}',sans-serif`,
    fontSize: el.size,
    color: el.color,
    fontWeight: el.bold ? 700 : 400,
    fontStyle: el.italic ? 'italic' : 'normal',
    textTransform: el.upper ? 'uppercase' : 'none',
    textAlign: el.align,
    justifyContent: JUSTIFY[el.valign] || 'center',
    letterSpacing: el.ls,
    lineHeight: el.lh,
    textShadow: shadows || undefined,
    background: el.bg || undefined,
  };
  const display = tok(el.text, ctx.year, page);
  return { ref, style, display, commit, onKeyDown };
}
