import { useStudioStore } from '@/store/useStudioStore';
import { useKeyboardHandler } from './handler/useKeyboardHandler';
import { usePasteHandler } from './handler/usePasteHandler';
import { usePersistenceHandler } from './handler/usePersistenceHandler';

export function useStudioHandler() {
  usePersistenceHandler();
  useKeyboardHandler();
  usePasteHandler();
  const ready = useStudioStore((s) => s.ready);
  return { ready };
}
