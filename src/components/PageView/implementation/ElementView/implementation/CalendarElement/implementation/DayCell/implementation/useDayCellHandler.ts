import { type KeyboardEvent, useLayoutEffect, useRef } from 'react';
import { usePhotoUrl } from '@/store/usePhotoUrlStore';
import { useStudioStore } from '@/store/useStudioStore';

/** Inline editing of a day number (double-click a number in the calendar), and the day's photo to show. */
export function useDayCellHandler(calId: string, day: number | null, num: string | null, editing: boolean, src: string | null) {
  const ref = useRef<HTMLSpanElement>(null);
  /** Null while a cloud photo is on its way: the box shows as it does without one. */
  const img = usePhotoUrl(src);

  useLayoutEffect(() => {
    const n = ref.current;
    if (!editing || !n) return;
    n.innerText = num ?? '';
    n.focus();
    document.getSelection()?.selectAllChildren(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = () => {
    const n = ref.current;
    if (!n || day == null) return;
    const v = n.innerText.trim();
    const st = useStudioStore.getState();
    st.set({ editing: null });
    st.mutate((d) => {
      const el = d.pages[d.cur].els.find((x) => x.id === calId);
      if (!el || el.type !== 'cal') return;
      const c = (el.days[day] = el.days[day] || {});
      if (v === String(day) || v === '') delete c.num;
      else c.num = v;
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  return { ref, commit, onKeyDown, img };
}
