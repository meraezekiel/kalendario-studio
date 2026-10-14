import { dims } from '@/lib/calendar/document';
import type { El } from '@/lib/calendar/types';
import { arrange, deleteSelected, duplicate, toggleFlag } from '@/store/actions';
import { curPage, updateEl, useStudioStore } from '@/store/useStudioStore';
import { useBindHandler } from '../../handler/useBindHandler';

export function useArrangeSectionHandler(el: El) {
  const bind = useBindHandler(el);
  const pageW = useStudioStore((s) => dims(curPage(s.doc)).W);
  /** Width/height below 6px would make the element impossible to grab. */
  const size = (k: 'w' | 'h') => ({
    value: el[k],
    onChange: (v: number) => {
      if (v >= 6) updateEl(el.id, { [k]: v }, `f:${el.id}:${k}`);
    },
  });
  return {
    bind,
    size,
    arrange,
    centerH: () => updateEl(el.id, { x: Math.round((pageW - el.w) / 2) }),
    toggleLock: () => toggleFlag(el.id, 'locked'),
    duplicate: () => duplicate(el),
    remove: deleteSelected,
  };
}
