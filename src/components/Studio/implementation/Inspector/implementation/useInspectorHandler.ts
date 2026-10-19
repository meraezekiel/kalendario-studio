import { elName } from '@/lib/calendar/names';
import { curPage, useSelEl, useStudioStore } from '@/store/useStudioStore';

export function useInspectorHandler() {
  const el = useSelEl();
  const selDay = useStudioStore((s) => s.selDay);
  const cur = useStudioStore((s) => s.doc.cur);
  const count = useStudioStore((s) => s.multi.length);
  const title = useStudioStore((s) => {
    if (s.multi.length) return `${s.multi.length} elements`;
    return el ? elName(el, s.doc.year, curPage(s.doc)) : `Page ${s.doc.cur + 1}`;
  });
  const readOnly = useStudioStore((s) => s.readOnly);
  return { el, selDay, cur, title, multi: count > 0, readOnly };
}
