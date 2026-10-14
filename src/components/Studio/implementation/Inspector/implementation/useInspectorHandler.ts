import { elName } from '@/lib/calendar/names';
import { curPage, useSelEl, useStudioStore } from '@/store/useStudioStore';

export function useInspectorHandler() {
  const el = useSelEl();
  const selDay = useStudioStore((s) => s.selDay);
  const cur = useStudioStore((s) => s.doc.cur);
  const title = useStudioStore((s) => {
    const e = el;
    return e ? elName(e, s.doc.year, curPage(s.doc)) : `Page ${s.doc.cur + 1}`;
  });
  return { el, selDay, cur, title };
}
