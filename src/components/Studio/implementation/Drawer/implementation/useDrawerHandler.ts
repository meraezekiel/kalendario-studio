import { useStudioStore } from '@/store/useStudioStore';

export function useDrawerHandler() {
  const tab = useStudioStore((s) => s.tab);
  return { tab };
}
