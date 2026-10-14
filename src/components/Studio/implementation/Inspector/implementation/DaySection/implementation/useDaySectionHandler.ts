import { MONTHS } from '@/lib/calendar/constants';
import { monthOf } from '@/lib/calendar/document';
import { holidays } from '@/lib/calendar/holidays';
import type { CalEl, DayInfo } from '@/lib/calendar/types';
import { pickFiles } from '@/store/actions';
import { curPage, findEl, useStudioStore } from '@/store/useStudioStore';

/** Settings for one day box of a calendar. */
export function useDaySectionHandler(el: CalEl, day: number) {
  const year = useStudioStore((s) => s.doc.year);
  const page = useStudioStore((s) => curPage(s.doc));
  const mutate = useStudioStore((s) => s.mutate);
  const { y, m } = monthOf(year, page, el.mo);
  const hol = holidays(y, m)[day];
  const info: DayInfo = el.days[day] || {};

  const setDay = (patch: Partial<DayInfo>, field: string, remove = false) =>
    mutate((d) => {
      const c = findEl(d, el.id);
      if (!c || c.type !== 'cal') return;
      const di = (c.days[day] = c.days[day] || {});
      if (remove) for (const k of Object.keys(patch) as (keyof DayInfo)[]) delete di[k];
      else Object.assign(di, patch);
    }, { key: `day:${el.id}:${day}:${field}` });

  return {
    title: `Day · ${MONTHS[m]} ${day}`,
    hol,
    info,
    setNum: (v: string) => (v === String(day) || v === '' ? setDay({ num: '' }, 'num', true) : setDay({ num: v }, 'num')),
    setLabel: (v: string) => setDay({ label: v }, 'label'),
    setHideHol: (v: boolean) => setDay({ hideHol: v }, 'hideHol'),
    setBg: (v: string) => setDay({ bg: v }, 'bg'),
    clearBg: () => setDay({ bg: '' }, 'bg-clear', true),
    addPicture: () => pickFiles({ cal: el.id, day }, false),
    removePicture: () => setDay({ img: '' }, 'img', true),
    done: () => useStudioStore.getState().select(el.id),
  };
}
