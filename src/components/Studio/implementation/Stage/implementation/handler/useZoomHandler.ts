import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;
const STEP = 1.25;

/** Zoom factor (relative to the fitted scale) that keeps `fit * z` within the allowed scale range. */
export function clampZoom(fit: number, z: number): number {
  return Math.min(MAX_SCALE / fit, Math.max(MIN_SCALE / fit, z));
}

/**
 * Zoom on top of the fitted scale. The point under the cursor (Ctrl/⌘ + wheel or trackpad pinch) or the
 * middle of the view (buttons, Ctrl/⌘ + plus/minus) stays put while zooming; Ctrl/⌘ + 0 fits the page again.
 */
export function useZoomHandler(wrapRef: RefObject<HTMLDivElement | null>, phRef: RefObject<HTMLDivElement | null>, fit: number) {
  const [zoom, setZoom] = useState(1);
  const scale = fit * clampZoom(fit, zoom);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  // Page point to keep under a client point once the new scale has rendered.
  const anchor = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null);

  const zoomAt = useCallback((next: (z: number) => number, cx?: number, cy?: number) => {
    const wrap = wrapRef.current, ph = phRef.current;
    if (wrap && ph) {
      const w = wrap.getBoundingClientRect(), r = ph.getBoundingClientRect(), s = scaleRef.current;
      const x = cx ?? w.left + w.width / 2, y = cy ?? w.top + w.height / 2;
      anchor.current = { px: (x - r.left) / s, py: (y - r.top) / s, cx: x, cy: y };
    }
    setZoom((z) => clampZoom(fit, next(clampZoom(fit, z))));
  }, [wrapRef, phRef, fit]);

  useLayoutEffect(() => {
    const a = anchor.current, wrap = wrapRef.current, ph = phRef.current;
    anchor.current = null;
    if (!a || !wrap || !ph) return;
    const r = ph.getBoundingClientRect();
    wrap.scrollLeft += r.left + a.px * scale - a.cx;
    wrap.scrollTop += r.top + a.py * scale - a.cy;
  }, [scale, wrapRef, phRef]);

  const zoomIn = useCallback(() => zoomAt((z) => z * STEP), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt((z) => z / STEP), [zoomAt]);
  const fitPage = useCallback(() => { anchor.current = null; setZoom(1); }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // Trackpad pinches arrive as wheel events with ctrlKey set.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt((z) => z * Math.exp(-Math.max(-50, Math.min(50, dy)) * 0.01), e.clientX, e.clientY);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '=' || e.key === '+') zoomIn();
      else if (e.key === '-' || e.key === '_') zoomOut();
      else if (e.key === '0') fitPage();
      else return;
      e.preventDefault();
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      wrap.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [wrapRef, zoomAt, zoomIn, zoomOut, fitPage]);

  return { scale, percent: Math.round(scale * 100), fitted: zoom === 1, zoomIn, zoomOut, fitPage, canZoomIn: scale < MAX_SCALE - 1e-6, canZoomOut: scale > MIN_SCALE + 1e-6 };
}
