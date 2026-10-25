import { UNIT_MM } from '@/lib/calendar/constants';
import type { SizeUnit } from '@/lib/calendar/types';
import { setCustomSide, setPaperUnit } from '@/store/actions';
import { curPage, useStudioStore } from '@/store/useStudioStore';

export const UNIT_OPTIONS = [['in', 'inches'], ['cm', 'cm'], ['mm', 'mm'], ['px', 'pixels']] as const;

/** Rounds a size for display: whole numbers for mm and px, two decimals otherwise. */
const shown = (mm: number, u: SizeUnit) => +(mm / UNIT_MM[u]).toFixed(u === 'mm' || u === 'px' ? 0 : 2);

export function useCustomSizeHandler() {
  const paper = useStudioStore((s) => curPage(s.doc).paper);
  const unit = paper.unit ?? 'in';
  return {
    unit,
    sides: [
      { side: 'cw', label: 'Width', value: shown(paper.cw ?? 0, unit) },
      { side: 'ch', label: 'Height', value: shown(paper.ch ?? 0, unit) },
    ] as const,
    /** Applies the typed size, or puts the old one back when it is out of range. */
    commit: (side: 'cw' | 'ch', input: HTMLInputElement) => {
      const v = +input.value;
      if (v === shown(paper[side] ?? 0, unit)) return;
      if (!setCustomSide(side, v)) input.value = String(shown(paper[side] ?? 0, unit));
    },
    setUnit: setPaperUnit,
  };
}
