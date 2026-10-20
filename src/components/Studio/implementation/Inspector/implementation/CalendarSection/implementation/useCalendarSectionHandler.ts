import { DS } from '@/lib/calendar/constants';
import { monthOffsetOptions } from '@/lib/calendar/names';
import { TIDE_PLACES } from '@/lib/calendar/tidePlaces';
import type { CalEl } from '@/lib/calendar/types';
import { curPage, updateEl, useStudioStore } from '@/store/useStudioStore';
import { useBindHandler } from '../../handler/useBindHandler';

export function useCalendarSectionHandler(el: CalEl) {
  const bind = useBindHandler(el);
  const year = useStudioStore((s) => s.doc.year);
  const page = useStudioStore((s) => curPage(s.doc));
  const moOptions = monthOffsetOptions(year, page);
  return {
    bind,
    moOptions,
    tideOptions: [['', 'Off'], ...TIDE_PLACES.map((p) => [p.id, p.name] as const)] as const,
    // Heights come on with the first place picked; after that the checkbox decides.
    setTidePlace: (id: string) => updateEl<CalEl>(el.id, { tidePlace: id || undefined, tideHeights: el.tideHeights ?? (id ? true : undefined) }),
    weekdays: DS.map((d, i) => ({ i, label: d.slice(0, 2), on: el.hiDays.includes(i) })),
    toggleHiDay: (d: number) =>
      updateEl<CalEl>(el.id, { hiDays: el.hiDays.includes(d) ? el.hiDays.filter((x) => x !== d) : [...el.hiDays, d] }),
    clearHeadBg: () => updateEl<CalEl>(el.id, { headBg: '' }),
    clearCellBg: () => updateEl<CalEl>(el.id, { cellBg: '' }),
  };
}
