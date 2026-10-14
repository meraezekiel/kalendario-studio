import { elName, TYPE_LABEL } from '@/lib/calendar/names';
import { toggleFlag } from '@/store/actions';
import { curPage, selIds, useStudioStore } from '@/store/useStudioStore';

export function useLayersSectionHandler() {
  const page = useStudioStore((s) => curPage(s.doc));
  const year = useStudioStore((s) => s.doc.year);
  const sel = useStudioStore((s) => s.sel);
  const multi = useStudioStore((s) => s.multi);
  // Top-most first, like most design tools.
  const layers = [...page.els].reverse().map((e) => ({
    id: e.id,
    type: TYPE_LABEL[e.type],
    name: elName(e, year, page),
    hidden: e.hidden,
    locked: e.locked,
    on: sel === e.id || multi.includes(e.id),
  }));
  return {
    layers,
    /** Shift/Ctrl-click adds or removes a layer from the selection. */
    pick: (id: string, additive = false) => {
      const st = useStudioStore.getState();
      if (!additive) return st.select(id);
      const cur = selIds(st);
      st.selectMany(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    },
    toggleHidden: (id: string) => toggleFlag(id, 'hidden'),
    toggleLocked: (id: string) => toggleFlag(id, 'locked'),
  };
}
