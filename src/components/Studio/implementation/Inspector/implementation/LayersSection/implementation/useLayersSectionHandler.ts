import { elName, TYPE_LABEL } from '@/lib/calendar/names';
import { toggleFlag } from '@/store/actions';
import { curPage, useStudioStore } from '@/store/useStudioStore';

export function useLayersSectionHandler() {
  const page = useStudioStore((s) => curPage(s.doc));
  const year = useStudioStore((s) => s.doc.year);
  const sel = useStudioStore((s) => s.sel);
  // Top-most first, like most design tools.
  const layers = [...page.els].reverse().map((e) => ({
    id: e.id,
    type: TYPE_LABEL[e.type],
    name: elName(e, year, page),
    hidden: e.hidden,
    locked: e.locked,
    on: sel === e.id,
  }));
  return {
    layers,
    pick: (id: string) => useStudioStore.getState().select(id),
    toggleHidden: (id: string) => toggleFlag(id, 'hidden'),
    toggleLocked: (id: string) => toggleFlag(id, 'locked'),
  };
}
