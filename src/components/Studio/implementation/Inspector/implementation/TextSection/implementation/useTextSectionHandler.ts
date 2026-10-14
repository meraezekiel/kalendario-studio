import type { TextEl } from '@/lib/calendar/types';
import { updateEl } from '@/store/useStudioStore';
import { useBindHandler } from '../../handler/useBindHandler';

export function useTextSectionHandler(el: TextEl) {
  const bind = useBindHandler(el);
  return { bind, clearBg: () => updateEl<TextEl>(el.id, { bg: '' }) };
}
