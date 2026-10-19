import { MONTHS, PAPERS } from '@/lib/calendar/constants';
import type { PaperKey } from '@/lib/calendar/types';
import { addPage, applyDesignToAll, deletePage, fillYear, movePage, openDesignFile, pickMonthBackgrounds, saveDesignFile, setPaper, setYear } from '@/store/actions';
import { curPage, useStudioStore } from '@/store/useStudioStore';

export const MONTH_OPTIONS = MONTHS.map((m, i) => [i, m] as const);
export const PAPER_OPTIONS = (Object.keys(PAPERS) as PaperKey[]).map((k) => [k, PAPERS[k][0]] as const);

export function usePagesPanelHandler() {
  const page = useStudioStore((s) => curPage(s.doc));
  const year = useStudioStore((s) => s.doc.year);
  const showHolidays = useStudioStore((s) => s.doc.holidays);
  const mutate = useStudioStore((s) => s.mutate);
  const readOnly = useStudioStore((s) => s.readOnly);

  return {
    page,
    readOnly,
    /** Square papers have no orientation to choose. */
    square: page.paper.size !== 'Custom' && PAPERS[page.paper.size][1] === PAPERS[page.paper.size][2],
    year,
    showHolidays,
    setMonth: (m: number) => mutate((d) => void (curPage(d).month = m), { key: `pg:${page.id}:month` }),
    setBg: (bg: string) => mutate((d) => void (curPage(d).bg = bg), { key: `pg:${page.id}:bg` }),
    setPaperSize: (size: PaperKey) => setPaper({ size }),
    setOrientation: (o: 'p' | 'l') => setPaper({ o }),
    setYear: (y: number) => void setYear(y),
    setHolidays: (v: boolean) => mutate((d) => void (d.holidays = v)),
    addBlank: () => addPage(false),
    duplicatePage: () => addPage(true),
    moveEarlier: () => movePage(-1),
    moveLater: () => movePage(1),
    deletePage,
    fillYear: () => void fillYear(),
    applyDesignToAll: () => void applyDesignToAll(),
    monthBackgrounds: pickMonthBackgrounds,
    saveFile: saveDesignFile,
    openFile: openDesignFile,
  };
}
