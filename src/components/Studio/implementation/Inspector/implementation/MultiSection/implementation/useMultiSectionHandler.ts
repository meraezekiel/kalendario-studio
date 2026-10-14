import { type Align, alignSelected, arrange, centerSelectedOnPage, deleteSelected, duplicate, selectedEls, toggleLockSelected } from '@/store/actions';
import { curPage, useStudioStore } from '@/store/useStudioStore';

export const ALIGNS: { key: Align; label: string }[] = [
  { key: 'left', label: 'Left' },
  { key: 'hcenter', label: 'Centre' },
  { key: 'right', label: 'Right' },
  { key: 'top', label: 'Top' },
  { key: 'vcenter', label: 'Middle' },
  { key: 'bottom', label: 'Bottom' },
];

export function useMultiSectionHandler() {
  const multi = useStudioStore((s) => s.multi);
  const page = useStudioStore((s) => curPage(s.doc));
  const allLocked = page.els.filter((e) => multi.includes(e.id)).every((e) => e.locked);
  return {
    allLocked,
    align: alignSelected,
    arrange,
    centerOnPage: centerSelectedOnPage,
    toggleLock: toggleLockSelected,
    duplicate: () => duplicate(selectedEls()),
    remove: deleteSelected,
    deselect: () => useStudioStore.getState().select(null),
  };
}
