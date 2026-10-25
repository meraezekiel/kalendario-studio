import { type CSSProperties, type KeyboardEvent, useLayoutEffect, useRef } from 'react';
import { tok } from '@/lib/calendar/document';
import { outlineShadow, type RenderCtx } from '@/lib/calendar/render';
import type { Page, TextEl } from '@/lib/calendar/types';
import { findEl, useStudioStore } from '@/store/useStudioStore';

const JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

/** Height the text needs at the box's current width, in page px (the stage zoom does not affect it). */
export function textHeight(tx: HTMLElement) {
  tx.style.height = 'auto';
  // scrollHeight also counts lines that spill out of a tight line-height.
  const h = Math.max(tx.offsetHeight, tx.scrollHeight);
  tx.style.height = '';
  return Math.ceil(h);
}

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

  // On the stage, a box shorter than its text grows, so the selection and Height match what is seen.
  const display = tok(el.text, ctx.year, page);
  useLayoutEffect(() => {
    const n = ref.current;
    if (!ctx.edit || editing || !n) return;
    const fit = () => {
      const need = textHeight(n);
      if (need <= el.h) return;
      useStudioStore.getState().mutate((d) => {
        const e = findEl(d, el.id);
        if (e) e.h = need;
      }, { history: false });
    };
    fit();
    // Web fonts can arrive after the first layout and change the text's size.
    document.fonts.addEventListener('loadingdone', fit);
    return () => document.fonts.removeEventListener('loadingdone', fit);
  }, [ctx.edit, editing, display, el]);

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
  return { ref, style, display, commit, onKeyDown };
}
