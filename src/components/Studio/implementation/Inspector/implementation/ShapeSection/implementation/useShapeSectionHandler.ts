import type { ShapeEl } from '@/lib/calendar/types';
import { updateEl } from '@/store/useStudioStore';
import { useBindHandler } from '../../handler/useBindHandler';

export function useShapeSectionHandler(el: ShapeEl) {
  const bind = useBindHandler(el);
  return {
    bind,
    isLine: el.shape === 'line',
    hasCorners: el.shape === 'rect' || el.shape === 'rounded',
    clearFill: () => updateEl<ShapeEl>(el.id, { fill: '' }),
  };
}
