import type { ShapeEl } from '@/lib/calendar/types';

/** Derived drawing values for a shape; `kind` decides which SVG the component draws. */
export function useShapeElementHandler(el: ShapeEl) {
  const w = el.w, h = el.h;
  const fill = el.fill || 'none';
  const sw = +el.sw || 0;
  const stroke = sw ? el.stroke : 'none';
  const r = ((el.radius || 0) / 100) * Math.min(w, h);
  const lineW = Math.max(1, sw);
  const holeCount = Math.max(2, Math.round(w / 26));
  const kind: 'box' | 'ellipse' | 'line' | 'holes' | 'flower' | 'path' =
    el.shape === 'rect' || el.shape === 'rounded' ? 'box'
      : el.shape === 'ellipse' || el.shape === 'line' || el.shape === 'holes' || el.shape === 'flower' ? el.shape
        : 'path';
  const petals = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return { cx: Math.round((50 + Math.cos(a) * 27) * 10) / 10, cy: Math.round((50 + Math.sin(a) * 27) * 10) / 10 };
  });
  return { w, h, fill, sw, stroke, r, lineW, holeCount, kind, petals };
}
