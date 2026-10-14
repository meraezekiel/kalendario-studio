import { useEffect } from 'react';
import { copySelected, deleteSelected, duplicate, nudge } from '@/store/actions';
import { findEl, useStudioStore } from '@/store/useStudioStore';

const NUDGE: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/** Global shortcuts: undo/redo, copy/paste/duplicate, delete, arrow nudging, Esc. */
export function useKeyboardHandler() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = document.activeElement as HTMLElement | null;
      if (a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)) return;
      const st = useStudioStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (mod && k === 'z') { e.preventDefault(); return e.shiftKey ? st.redo() : st.undo(); }
      if (mod && k === 'y') { e.preventDefault(); return st.redo(); }
      if (e.key === 'Escape') {
        if (st.armed !== null) st.set({ armed: null });
        else if (st.cropId) st.set({ cropId: null });
        else st.select(null);
        return;
      }
      if (mod && k === 'v' && st.clip) { e.preventDefault(); return duplicate(st.clip); }
      const el = findEl(st.doc, st.sel);
      if (!el) return;
      if (mod && k === 'c') return copySelected();
      if (mod && k === 'd') { e.preventDefault(); return duplicate(el); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && st.selDay == null) { e.preventDefault(); return deleteSelected(); }
      const mv = NUDGE[e.key];
      if (mv && !el.locked) {
        e.preventDefault();
        const s = e.shiftKey ? 10 : 1;
        nudge(mv[0] * s, mv[1] * s);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
}
