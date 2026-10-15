import { useEffect, useMemo } from 'react';
import { getSupport } from '@/lib/support/support';
import { useStudioStore } from '@/store/useStudioStore';

/** How long the note stays before it hides by itself. */
const SHOW_MS = 15000;

export function useThanksNoteHandler() {
  const open = useStudioStore((s) => s.thanks);
  const support = useMemo(getSupport, []);
  const close = () => useStudioStore.getState().set({ thanks: false });

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(close, SHOW_MS);
    return () => clearTimeout(t);
  }, [open]);

  return {
    open,
    coffeeUrl: support.coffeeUrl,
    hasLinks: support.links.length > 0,
    close,
    showSupplies: () => {
      useStudioStore.getState().set({ tab: 'support', thanks: false });
    },
  };
}
