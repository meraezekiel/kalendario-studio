import { monthOffsetOptions } from '@/lib/calendar/names';
import type { EventsEl } from '@/lib/calendar/types';
import { curPage, useStudioStore } from '@/store/useStudioStore';
import { useBindHandler } from '../../handler/useBindHandler';

export function useEventsSectionHandler(el: EventsEl) {
  const bind = useBindHandler(el);
  const year = useStudioStore((s) => s.doc.year);
  const page = useStudioStore((s) => curPage(s.doc));
  const moOptions = monthOffsetOptions(year, page);
  return { bind, moOptions };
}
