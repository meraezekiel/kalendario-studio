'use client';

import type { CSSProperties } from 'react';
import type { TideSlot } from '../../../../useCalendarElementHandler';

/** One row of tide times: morning on the left, afternoon on the right. Empty rows keep their height. */
export default function TideRow({ slots, style, kind }: { slots: TideSlot[]; style: CSSProperties; kind: 'high' | 'low' }) {
  return (
    <div className={`tt tt-${kind}`} style={style}>
      {slots.map((s) => (
        <span key={s.key} className={s.right ? 'r' : undefined} style={s.style}>{s.text}</span>
      ))}
    </div>
  );
}
