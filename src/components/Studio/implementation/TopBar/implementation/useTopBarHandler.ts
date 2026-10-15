import { useSyncExternalStore } from 'react';
import { MONTHS } from '@/lib/calendar/constants';
import { monthOf } from '@/lib/calendar/document';
import { applyDesignToAll, exportPNG, goToPage, openDesignFile, printPages, saveDesignFile } from '@/store/actions';
import { curPage, useStudioStore } from '@/store/useStudioStore';

/** Inside a frame (e.g. an embedded preview) printing and downloads are usually blocked. */
const isFramed = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};
const noSubscribe = () => () => {};

export function useTopBarHandler() {
  const framed = useSyncExternalStore(noSubscribe, isFramed, () => false);
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
    framed,
    saveFile: saveDesignFile,
    openFile: openDesignFile,
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
