import { PAPERS } from '@/lib/calendar/constants';
import { dims } from '@/lib/calendar/document';
import { DEFAULT_SHEET, SHEET_PAPERS, sheetLayout } from '@/lib/calendar/sheet';
import type { SheetPaper } from '@/lib/calendar/types';
import { setSheet } from '@/store/actions';
import { curPage, useStudioStore } from '@/store/useStudioStore';

export const SHEET_OPTIONS = SHEET_PAPERS.map((k) => [k, PAPERS[k][0]] as const);
export const GAP_OPTIONS = [[0, 'None (one cut between)'], [4, '4 mm'], [8, '8 mm']] as const;
export const FILL_OPTIONS = [['copies', 'Copies of each page'], ['order', 'Pages in order']] as const;

export function useSheetSectionHandler() {
  const sheet = useStudioStore((s) => s.doc.sheet) ?? DEFAULT_SHEET;
  const page = useStudioStore((s) => curPage(s.doc));
  const D = dims(page);
  const layout = sheetLayout(D, sheet);
  const sheetName = PAPERS[sheet.paper][0];
  return {
    sheet,
    layout,
    summary: layout
      ? `${layout.per} per sheet · ${layout.cols} across × ${layout.rows} down · ${sheetName}, ${layout.landscape ? 'landscape' : 'portrait'}`
      : `This page (${D.label}) is too big for ${sheetName}.`,
    setOn: (on: boolean) => setSheet({ on }),
    setPaper: (paper: SheetPaper) => setSheet({ paper }),
    setGap: (gap: number) => setSheet({ gap }),
    setMarks: (marks: boolean) => setSheet({ marks }),
    setFill: (v: 'copies' | 'order') => setSheet({ fill: v === 'copies' }),
  };
}
