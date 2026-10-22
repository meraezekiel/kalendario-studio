import { useMemo, useState, useSyncExternalStore } from 'react';
import { MONTHS } from '@/lib/calendar/constants';
import { monthOf } from '@/lib/calendar/document';
import { getSupport } from '@/lib/support/support';
import { applyDesignToAll, exportPNG, goToPage, openDesignFile, orderPrints, printPages, saveCopy, saveDesignFile } from '@/store/actions';
import { useCloudStore } from '@/store/useCloudStore';
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
  const readOnly = useStudioStore((s) => s.readOnly);
  const driven = useStudioStore((s) => s.historyDriver !== null);
  const undoable = useCloudStore((s) => s.undoable);
  const canUndo = useStudioStore((s) => !s.readOnly && (driven ? undoable.undo : s.past.length > 0));
  const canRedo = useStudioStore((s) => !s.readOnly && (driven ? undoable.redo : s.future.length > 0));
  const designId = useCloudStore((s) => s.designId);
  const role = useCloudStore((s) => (s.designId ? s.role : null));
  // Lost access: the banner offers the copy instead.
  const denied = useCloudStore((s) => s.status.state === 'denied');
  const [sharing, setSharing] = useState(false);
  const support = useMemo(getSupport, []);
  const st = useStudioStore.getState;
  return {
    framed,
    cloud: designId !== null,
    designId,
    readOnly,
    owner: role === 'owner',
    viewer: role === 'viewer' && !denied,
    sharing: sharing && role === 'owner',
    openShare: () => setSharing(true),
    closeShare: () => setSharing(false),
    saveCopy: () => void saveCopy(),
    saveFile: saveDesignFile,
    openFile: openDesignFile,
    label,
    canUndo,
    canRedo,
    undo: () => st().undo(),
    redo: () => st().redo(),
    prev: () => goToPage(st().doc.cur - 1),
    next: () => goToPage(st().doc.cur + 1),
    sync: () => void applyDesignToAll(),
    printOne: () => printPages(false),
    printAll: () => printPages(true),
    png: exportPNG,
    canOrder: !!support.printOrderUrl,
    shop: support.printShop,
    order: orderPrints,
  };
}
