import { MONTHS } from '@/lib/calendar/constants';
import { monthOf } from '@/lib/calendar/document';
import { addPage, goToPage } from '@/store/actions';
import { useStudioStore } from '@/store/useStudioStore';

export function usePageBarHandler() {
  const pages = useStudioStore((s) => s.doc.pages);
  const year = useStudioStore((s) => s.doc.year);
  const cur = useStudioStore((s) => s.doc.cur);
  const tabs = pages.map((p, i) => ({
    id: p.id,
    i,
    label: `${i + 1} · ${MONTHS[monthOf(year, p).m].slice(0, 3)}${p.role === 'photo' ? ' photo' : ''}`,
  }));
  return { tabs, cur, goTo: goToPage, add: () => addPage(false) };
}
