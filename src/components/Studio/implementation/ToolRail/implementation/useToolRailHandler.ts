import { useEffect, useMemo } from 'react';
import { getSupport, hasSupport } from '@/lib/support/support';
import { useProductsStore } from '@/store/useProductsStore';
import { type DrawerTab, useStudioStore } from '@/store/useStudioStore';

export function useToolRailHandler() {
  const tab = useStudioStore((s) => s.tab);
  const support = useMemo(getSupport, []);
  const products = useProductsStore((s) => s.products);
  useEffect(() => useProductsStore.getState().load(), []);
  const setTab = (t: DrawerTab) => useStudioStore.getState().set({ tab: t });
  return { tab, setTab, showSupport: hasSupport(support, products) };
}
