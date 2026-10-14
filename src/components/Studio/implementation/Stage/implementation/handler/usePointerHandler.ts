import { type PointerEvent as RPointerEvent, type RefObject, useRef } from 'react';
import { ASPECT_SHAPES } from '@/lib/calendar/constants';
import { dims } from '@/lib/calendar/document';
import { assetFor, imageScale } from '@/lib/calendar/render';
import type { El } from '@/lib/calendar/types';
import { clamp, r1 } from '@/lib/calendar/utils';
import { placeAsset } from '@/store/actions';
import { curPage, findEl, type Guide, type PickTarget, useStudioStore } from '@/store/useStudioStore';
import { useDoubleClickHandler } from './useDoubleClickHandler';

type Drag =
  | { mode: 'move'; id: string; sx: number; sy: number; x0: number; y0: number; moved: boolean; cell: number | null; started: boolean }
  | { mode: 'rs'; id: string; h: string; sx: number; sy: number; x0: number; y0: number; w0: number; h0: number; size0: number; started: boolean }
  | { mode: 'rot'; id: string; started: boolean }
  | { mode: 'pan'; id: string; sx: number; sy: number; px: number; py: number; iw: number; ih: number; bw: number; bh: number; started: boolean };

const S = () => useStudioStore.getState();

/** Photo frame or calendar day under a DOM node, used for dropping/placing photos. */
export function dropTarget(t: Element | null): PickTarget {
  const elN = t?.closest<HTMLElement>('.el');
  if (!t || !elN) return null;
  const el = findEl(S().doc, elN.dataset.id ?? null);
  if (!el || el.locked) return null;
  const cellN = t.closest<HTMLElement>('.cell[data-day]');
  if (el.type === 'cal' && cellN) return { cal: el.id, day: +cellN.dataset.day! };
  if (el.type === 'image') return { img: el.id };
  return null;
}

/** Snaps a moving element's edges/centre to the page and other elements' edges/centres. */
function snapMove(el: El, nx: number, ny: number, scale: number): [number, number, Guide[]] {
  const pg = curPage(S().doc);
  const D = dims(pg), T = Math.min(10, 6 / scale);
  const xs = [0, D.W / 2, D.W], ys = [0, D.H / 2, D.H];
  pg.els.forEach((o) => {
    if (o.id === el.id || o.hidden) return;
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  });
  type Hit = { d: number; t: number } | null;
  let bx = null as Hit, by = null as Hit, b = T;
  for (const off of [0, el.w / 2, el.w]) for (const t of xs) { const d = t - (nx + off); if (Math.abs(d) < b) { b = Math.abs(d); bx = { d, t }; } }
  b = T;
  for (const off of [0, el.h / 2, el.h]) for (const t of ys) { const d = t - (ny + off); if (Math.abs(d) < b) { b = Math.abs(d); by = { d, t }; } }
  const guides: Guide[] = [];
  if (bx) { nx += bx.d; guides.push({ v: bx.t }); }
  if (by) { ny += by.d; guides.push({ h: by.t }); }
  return [nx, ny, guides];
}

export function usePointerHandler(wrapRef: RefObject<HTMLDivElement | null>, phRef: RefObject<HTMLDivElement | null>, scale: number) {
  const drag = useRef<Drag | null>(null);
  const lastDown = useRef({ t: 0, x: 0, y: 0 });
  const dblAt = useDoubleClickHandler();

  const pageRect = () => phRef.current!.querySelector('.page')!.getBoundingClientRect();
  const pagePt = (e: { clientX: number; clientY: number }) => {
    const r = pageRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };
  /** Changes during a drag share one undo step, recorded on the first real change. */
  const live = (d: Drag, recipe: (el: El) => void) => {
    const st = S();
    if (!d.started) { st.checkpoint(); d.started = true; }
    st.mutate((doc) => { const el = findEl(doc, d.id); if (el) recipe(el); }, { history: false });
  };

  const onPointerDown = (e: RPointerEvent) => {
    const target = e.target as HTMLElement;
    if (e.button > 0 || target.isContentEditable) return;
    // Finish any inline edit first so its text is saved before the selection change unmounts the editor.
    const active = document.activeElement as HTMLElement | null;
    if (active?.isContentEditable) active.blur();
    const st = S();
    const wrap = wrapRef.current!;
    if (!target.closest('.ph')) {
      if (target === wrap || target.classList.contains('scaler')) st.select(null);
      return;
    }

    const hd = target.closest<HTMLElement>('[data-h]');
    const el0 = findEl(st.doc, st.sel);
    const now = performance.now();
    const dbl = !hd && st.armed === null && now - lastDown.current.t < 450 && Math.hypot(e.clientX - lastDown.current.x, e.clientY - lastDown.current.y) < 8;
    lastDown.current = { t: dbl ? 0 : now, x: e.clientX, y: e.clientY };
    if (dbl && dblAt(e.clientX, e.clientY)) { e.preventDefault(); drag.current = null; return; }

    if (hd && el0) {
      e.preventDefault();
      wrap.setPointerCapture(e.pointerId);
      drag.current = hd.dataset.h === 'rot'
        ? { mode: 'rot', id: el0.id, started: false }
        : { mode: 'rs', id: el0.id, h: hd.dataset.h!, sx: e.clientX, sy: e.clientY, x0: el0.x, y0: el0.y, w0: el0.w, h0: el0.h, size0: el0.type === 'text' ? el0.size : 0, started: false };
      return;
    }

    const elN = target.closest<HTMLElement>('.el');
    if (st.armed !== null) {
      const id = st.doc.tray[st.armed];
      placeAsset(id, dropTarget(target), pagePt(e));
      return;
    }
    if (!elN) { st.select(null); return; }
    const el = findEl(st.doc, elN.dataset.id ?? null);
    if (!el) return;
    const wasSel = st.sel === el.id;
    if (!wasSel) st.select(el.id);
    if (el.locked) return;
    e.preventDefault();
    wrap.setPointerCapture(e.pointerId);
    const cellN = target.closest<HTMLElement>('.cell[data-day]');

    if (st.cropId === el.id && el.type === 'image') {
      const a = assetFor(el.src, curPage(st.doc), st.doc.assets);
      if (a) {
        const { bw, bh, iw, ih } = imageScale(el, a);
        drag.current = { mode: 'pan', id: el.id, sx: e.clientX, sy: e.clientY, px: el.px, py: el.py, iw, ih, bw, bh, started: false };
      }
      return;
    }
    drag.current = { mode: 'move', id: el.id, sx: e.clientX, sy: e.clientY, x0: el.x, y0: el.y, moved: false, cell: wasSel && el.type === 'cal' && cellN ? +cellN.dataset.day! : null, started: false };
  };

  const onPointerMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const el = findEl(S().doc, d.id);
    if (!el) return;

    if (d.mode === 'move') {
      const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      d.moved = true;
      let nx = d.x0 + dx, ny = d.y0 + dy, guides: Guide[] = [];
      if (!e.altKey && !(el.rot % 360)) [nx, ny, guides] = snapMove(el, nx, ny, scale);
      live(d, (x) => { x.x = Math.round(nx); x.y = Math.round(ny); });
      S().set({ guides });
    } else if (d.mode === 'rs') {
      const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
      const a = ((el.rot || 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
      const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
      const hx = d.h.includes('e') ? 1 : d.h.includes('w') ? -1 : 0, hy = d.h.includes('s') ? 1 : d.h.includes('n') ? -1 : 0;
      let nw = Math.max(12, d.w0 + hx * lx), nh = Math.max(6, d.h0 + hy * ly);
      const corner = !!(hx && hy);
      const keep = corner && (e.shiftKey || el.type === 'image' || el.type === 'text' || (el.type === 'shape' && ASPECT_SHAPES.includes(el.shape)));
      if (keep) { const k = Math.max(nw / d.w0, nh / d.h0); nw = Math.max(12, d.w0 * k); nh = Math.max(6, d.h0 * k); }
      const dw = nw - d.w0, dh = nh - d.h0, clx = (hx * dw) / 2, cly = (hy * dh) / 2;
      const cx = d.x0 + d.w0 / 2 + clx * cos - cly * sin, cy = d.y0 + d.h0 / 2 + clx * sin + cly * cos;
      live(d, (x) => {
        x.w = Math.round(nw); x.h = Math.round(nh); x.x = Math.round(cx - nw / 2); x.y = Math.round(cy - nh / 2);
        if (x.type === 'text' && corner) x.size = Math.max(5, r1((d.size0 * nw) / d.w0));
      });
    } else if (d.mode === 'rot') {
      const r = pageRect();
      const cx = r.left + (el.x + el.w / 2) * scale, cy = r.top + (el.y + el.h / 2) * scale;
      let ang = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
      if (ang > 180) ang -= 360;
      if (e.shiftKey) ang = Math.round(ang / 15) * 15;
      else { const n = Math.round(ang / 90) * 90; if (Math.abs(ang - n) < 4) ang = n; }
      live(d, (x) => { x.rot = Math.round(ang); });
    } else if (d.mode === 'pan' && el.type === 'image') {
      const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
      live(d, (x) => {
        if (x.type !== 'image') return;
        if (Math.abs(d.iw - d.bw) > 0.5) x.px = r1(clamp(d.px + (dx * 100) / (d.bw - d.iw), 0, 100));
        if (Math.abs(d.ih - d.bh) > 0.5) x.py = r1(clamp(d.py + (dy * 100) / (d.bh - d.ih), 0, 100));
      });
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const st = S();
    if (st.guides.length) st.set({ guides: [] });
    // A plain click on a day of the already-selected calendar selects that day.
    if (d.mode === 'move' && !d.moved && d.cell != null) st.select(d.id, d.cell);
  };

  return { onPointerDown, onPointerMove, onPointerUp, pagePt };
}
