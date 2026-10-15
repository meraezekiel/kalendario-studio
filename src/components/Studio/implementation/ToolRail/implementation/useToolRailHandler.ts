import { useMemo } from 'react';
import { hasSupport } from '@/lib/support/support';
import { type DrawerTab, useStudioStore } from '@/store/useStudioStore';

export function useToolRailHandler() {
  const tab = useStudioStore((s) => s.tab);
  const showSupport = useMemo(() => hasSupport(), []);
  const setTab = (t: DrawerTab) => useStudioStore.getState().set({ tab: t });
  return { tab, setTab, showSupport };
}
