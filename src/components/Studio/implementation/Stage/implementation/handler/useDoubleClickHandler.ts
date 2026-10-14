import { useCallback } from 'react';
import { assetFor } from '@/lib/calendar/render';
import { pickFiles } from '@/store/actions';
import { curPage, findEl, toast, useStudioStore } from '@/store/useStudioStore';

/**
 * Double-click behaviour at a screen point. Returns true when it handled the gesture:
 * day number → edit number, text → edit text, empty frame → upload, photo → reposition inside frame.
 */
export function useDoubleClickHandler() {
  return useCallback((cx: number, cy: number): boolean => {
    const T = document.elementFromPoint(cx, cy);
    const elN = T?.closest<HTMLElement>('.ph .el');
    if (!T || !elN) return false;
    const st = useStudioStore.getState();
    const el = findEl(st.doc, elN.dataset.id ?? null);
    if (!el) return false;

    const num = T.closest('.cell[data-day] .num');
    if (el.type === 'cal' && num) {
      const n = +(num.parentElement as HTMLElement).dataset.day!;
      st.select(el.id, n);
      st.set({ editing: { id: el.id, day: n } });
      return true;
    }
    if (el.locked) return false;
    if (el.type === 'text') {
      st.select(el.id);
      st.set({ editing: { id: el.id } });
      return true;
    }
    if (el.type === 'image') {
      if (!el.src || !assetFor(el.src, curPage(st.doc), st.doc.assets)) {
        pickFiles({ img: el.id }, false);
        return true;
      }
      const on = st.cropId !== el.id;
      st.select(el.id);
      st.set({ cropId: on ? el.id : null });
      if (on) toast('Drag to move the photo inside its frame. Double-click again when done.');
      return true;
    }
    return false;
  }, []);
}
