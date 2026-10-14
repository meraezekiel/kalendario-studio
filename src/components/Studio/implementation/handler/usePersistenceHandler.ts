import { useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { migrateDoc } from '@/lib/calendar/document';
import type { CalendarDoc } from '@/lib/calendar/types';
import { STORAGE_KEY, toast, useStudioStore } from '@/store/useStudioStore';

const isDoc = (d: unknown): d is CalendarDoc =>
  !!d && typeof d === 'object' && (d as CalendarDoc).v === 3 && Array.isArray((d as CalendarDoc).pages) && (d as CalendarDoc).pages.length > 0;

/** Loads the saved calendar from IndexedDB on start, then autosaves every change (debounced). */
export function usePersistenceHandler() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsub: (() => void) | undefined;

    get(STORAGE_KEY)
      .catch(() => null)
      .then((saved) => {
        if (cancelled) return;
        const st = useStudioStore.getState();
        st.hydrate(isDoc(saved) ? migrateDoc({ ...saved, cur: Math.min(saved.cur, saved.pages.length - 1) }) : null);
        unsub = useStudioStore.subscribe((s, prev) => {
          if (s.doc === prev.doc) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            set(STORAGE_KEY, useStudioStore.getState().doc).catch(() =>
              toast('Could not save to this browser. Your work stays while this tab is open.'),
            );
          }, 400);
        });
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub?.();
    };
  }, []);
}
