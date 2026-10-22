import { useEffect, useMemo } from 'react';
import { countEvent } from '@/lib/cloud/stats';
import { getSupport, hasSupport } from '@/lib/support/support';
import { saveDesignFile } from '@/store/actions';
import { useProductsStore } from '@/store/useProductsStore';
import { useStudioStore } from '@/store/useStudioStore';

/** How long the note stays before it hides by itself. */
const SHOW_MS = 15000;

export function useThanksNoteHandler() {
  const open = useStudioStore((s) => s.thanks);
  const support = useMemo(getSupport, []);
  const products = useProductsStore((s) => s.products);
  const close = () => useStudioStore.getState().set({ thanks: false });

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(close, SHOW_MS);
    return () => clearTimeout(t);
  }, [open]);

  return {
    open,
    support: hasSupport(support, products),
    coffeeUrl: support.coffeeUrl,
    gcash: !!support.gcashQr,
    save: () => {
      saveDesignFile();
      close();
    },
    hasLinks: products.length > 0,
    close,
    showSupplies: () => {
      countEvent('print_kit_open');
      useStudioStore.getState().set({ tab: 'support', thanks: false });
    },
  };
}
