import { useEffect } from 'react';
import { copySelected, deleteSelected, duplicate, nudge, openDesignFile, saveDesignFile, selectAll, selectedEls } from '@/store/actions';
import { useStudioStore } from '@/store/useStudioStore';

const NUDGE: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/** Global shortcuts: save/open design file, undo/redo, select all, copy/paste/duplicate, delete, arrow nudging, Esc. All act on the whole selection. */
export function useKeyboardHandler() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 's') { e.preventDefault(); return saveDesignFile(); }
        if (key === 'o') { e.preventDefault(); return openDesignFile(); }
      }
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
      if (mod && k === 'v' && st.clip.length) { e.preventDefault(); return duplicate(st.clip); }
      if (mod && k === 'a') { e.preventDefault(); return selectAll(); }
      const els = selectedEls();
      if (!els.length) return;
      if (mod && k === 'c') return copySelected();
      if (mod && k === 'd') { e.preventDefault(); return duplicate(els); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && st.selDay == null) { e.preventDefault(); return deleteSelected(); }
      const mv = NUDGE[e.key];
      if (mv && els.some((x) => !x.locked)) {
        e.preventDefault();
        const s = e.shiftKey ? 10 : 1;
        nudge(mv[0] * s, mv[1] * s);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
}
