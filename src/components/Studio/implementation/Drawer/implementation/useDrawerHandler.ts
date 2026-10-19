import { useStudioStore } from '@/store/useStudioStore';

export function useDrawerHandler() {
  const tab = useStudioStore((s) => s.tab);
  const readOnly = useStudioStore((s) => s.readOnly);
  return { tab, readOnly };
}
