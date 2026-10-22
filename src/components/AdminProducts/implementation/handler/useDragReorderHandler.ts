import { useRef, useState } from 'react';

type Drag = { from: number; to: number; dy: number; size: number };

/**
 * Drag-to-reorder for a vertical list, by a handle, with mouse or touch (pointer events, so phones
 * work too). The dragged row follows the pointer and the rows it passes slide out of its way;
 * letting go calls `onMove(from, to)`. Arrow keys on the handle move a row one place.
 */
export function useDragReorderHandler(count: number, onMove: (from: number, to: number) => void) {
  const rows = useRef<(HTMLElement | null)[]>([]);
  const start = useRef<{ y: number; mids: number[] } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const onPointerDown = (index: number) => (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const el = rows.current[index];
    if (!el) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rects = rows.current.slice(0, count).map((r) => r?.getBoundingClientRect());
    const mids = rects.map((r) => (r ? r.top + r.height / 2 : 0));
    // One row's height plus the gap to the next: how far the others slide.
    const own = rects[index]!;
    const below = rects[index + 1];
    const above = rects[index - 1];
    const gap = below ? below.top - own.bottom : above ? own.top - above.bottom : 0;
    const size = own.height + gap;
    start.current = { y: e.clientY, mids };
    setDrag({ from: index, to: index, dy: 0, size });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s || !drag) return;
    const dy = e.clientY - s.y;
    const y = s.mids[drag.from] + dy;
    let to = drag.from;
    while (to < count - 1 && y > s.mids[to + 1]) to++;
    while (to > 0 && y < s.mids[to - 1]) to--;
    setDrag({ ...drag, dy, to });
  };

  const onPointerUp = () => {
    if (drag && drag.to !== drag.from) onMove(drag.from, drag.to);
    start.current = null;
    setDrag(null);
  };

  const onKeyDown = (index: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && index > 0) onMove(index, index - 1);
    else if (e.key === 'ArrowDown' && index < count - 1) onMove(index, index + 1);
    else return;
    e.preventDefault();
  };

  /** Where row `index` sits while something is being dragged. */
  const styleOf = (index: number): React.CSSProperties | undefined => {
    if (!drag) return undefined;
    if (index === drag.from) return { transform: `translateY(${drag.dy}px)`, zIndex: 2, position: 'relative' };
    if (drag.from < index && index <= drag.to) return { transform: `translateY(${-drag.size}px)` };
    if (drag.to <= index && index < drag.from) return { transform: `translateY(${drag.size}px)` };
    return undefined;
  };

  return {
    dragging: drag ? drag.from : null,
    rowRef: (index: number) => (el: HTMLElement | null) => {
      rows.current[index] = el;
    },
    styleOf,
    handle: (index: number) => ({
      onPointerDown: onPointerDown(index),
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown: onKeyDown(index),
    }),
  };
}
