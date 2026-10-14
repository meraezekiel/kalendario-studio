import { MONTHS } from '@/lib/calendar/constants';
import { curPage, useStudioStore } from '@/store/useStudioStore';

export const MONTH_OPTIONS = MONTHS.map((m, i) => [i, m] as const);

export function usePageSectionHandler() {
  const page = useStudioStore((s) => curPage(s.doc));
  const mutate = useStudioStore((s) => s.mutate);
  return {
    month: page.month,
    bg: page.bg,
    setMonth: (m: number) => mutate((d) => void (curPage(d).month = m), { key: `pg:${page.id}:month` }),
    setBg: (bg: string) => mutate((d) => void (curPage(d).bg = bg), { key: `pg:${page.id}:bg` }),
  };
}
