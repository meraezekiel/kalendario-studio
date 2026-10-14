import { type DrawerTab, useStudioStore } from '@/store/useStudioStore';

export function useToolRailHandler() {
  const tab = useStudioStore((s) => s.tab);
  const setTab = (t: DrawerTab) => useStudioStore.getState().set({ tab: t });
  return { tab, setTab };
}
