import { MONTHS } from '@/lib/calendar/constants';
import { monthOf } from '@/lib/calendar/document';
import { applyDesignToAll, exportPNG, goToPage, printPages } from '@/store/actions';
import { curPage, useStudioStore } from '@/store/useStudioStore';

export function useTopBarHandler() {
  const label = useStudioStore((s) => {
    const pg = curPage(s.doc);
    const { m } = monthOf(s.doc.year, pg);
    const role = pg.role === 'photo' ? ' photo' : pg.role === 'cal' ? ' calendar' : '';
    return `Page ${s.doc.cur + 1} of ${s.doc.pages.length} · ${MONTHS[m]}${role}`;
  });
  const canUndo = useStudioStore((s) => s.past.length > 0);
  const canRedo = useStudioStore((s) => s.future.length > 0);
  const st = useStudioStore.getState;
  return {
    label,
    canUndo,
    canRedo,
    undo: () => st().undo(),
    redo: () => st().redo(),
    prev: () => goToPage(st().doc.cur - 1),
    next: () => goToPage(st().doc.cur + 1),
    sync: applyDesignToAll,
    printOne: () => printPages(false),
    printAll: () => printPages(true),
    png: exportPNG,
  };
}
