import { UNIT_MM } from '@/lib/calendar/constants';
import { dims } from '@/lib/calendar/document';
import type { El } from '@/lib/calendar/types';
import { arrange, deleteSelected, duplicate, toggleFlag } from '@/store/actions';
import { curPage, updateEl, useStudioStore } from '@/store/useStudioStore';
import { useBindHandler } from '../../handler/useBindHandler';

export function useArrangeSectionHandler(el: El) {
  const bind = useBindHandler(el);
  const page = useStudioStore((s) => curPage(s.doc));
  const d = dims(page);
  // Elements live in design pixels (page is always DW wide); show real paper units instead.
  // Inches by default; a custom page uses the unit its size was typed in.
  const unit = page.paper.size === 'Custom' ? (page.paper.unit ?? 'in') : 'in';
  const perPx = d.wmm / d.W / UNIT_MM[unit];
  const exact = unit === 'mm' || unit === 'px';
  /** `{...field('w')}` gives a NumField the value in `unit`; width/height below 6px would be impossible to grab. */
  const field = (k: 'x' | 'y' | 'w' | 'h') => ({
    value: el[k] * perPx,
    step: exact ? 1 : 0.1,
    decimals: exact ? 0 : 2,
    onChange: (v: number) => {
      const px = v / perPx;
      if (k === 'x' || k === 'y' || px >= 6) updateEl(el.id, { [k]: px }, `f:${el.id}:${k}`);
    },
  });
  return {
    bind,
    unit,
    field,
    arrange,
    centerH: () => updateEl(el.id, { x: Math.round((d.W - el.w) / 2) }),
    toggleLock: () => toggleFlag(el.id, 'locked'),
    duplicate: () => duplicate(el),
    remove: deleteSelected,
  };
}
