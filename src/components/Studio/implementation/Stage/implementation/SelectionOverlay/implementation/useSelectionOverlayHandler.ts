import { useSelEl, useStudioStore } from '@/store/useStudioStore';

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

export function useSelectionOverlayHandler() {
  const el = useSelEl();
  const guides = useStudioStore((s) => s.guides);
  const box = el && !el.hidden
    ? { locked: el.locked, style: { left: el.x, top: el.y, width: el.w, height: el.h, transform: `rotate(${el.rot || 0}deg)` } }
    : null;
  return { box, guides };
}
