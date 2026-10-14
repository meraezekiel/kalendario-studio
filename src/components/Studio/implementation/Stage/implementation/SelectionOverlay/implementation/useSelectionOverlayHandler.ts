import { boundsOf } from '@/store/actions';
import { curPage, useSelEl, useStudioStore } from '@/store/useStudioStore';

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

export function useSelectionOverlayHandler() {
  const el = useSelEl();
  const guides = useStudioStore((s) => s.guides);
  const marquee = useStudioStore((s) => s.marquee);
  const multi = useStudioStore((s) => s.multi);
  const page = useStudioStore((s) => curPage(s.doc));
  const box = el && !el.hidden
    ? { locked: el.locked, style: { left: el.x, top: el.y, width: el.w, height: el.h, transform: `rotate(${el.rot || 0}deg)` } }
    : null;

  // Multi-selection: a thin outline per element plus one box around the group.
  const picked = multi.length ? page.els.filter((e) => multi.includes(e.id) && !e.hidden) : [];
  const members = picked.map((e) => ({
    id: e.id,
    locked: e.locked,
    style: { left: e.x, top: e.y, width: e.w, height: e.h, transform: `rotate(${e.rot || 0}deg)` },
  }));
  const B = picked.length ? boundsOf(picked) : null;
  const group = B ? { count: picked.length, style: { left: B.x, top: B.y, width: B.w, height: B.h } } : null;
  const band = marquee ? { left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h } : null;

  return { box, guides, members, group, band };
}
