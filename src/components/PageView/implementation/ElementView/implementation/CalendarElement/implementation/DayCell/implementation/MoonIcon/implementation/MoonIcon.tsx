'use client';

import type { MoonView } from '../../../../useCalendarElementHandler';
import { useMoonIconHandler } from './useMoonIconHandler';

/** A moon phase: big in an empty box (name, picture, date) or a small corner icon on its day. */
export default function MoonIcon({ moon }: { moon: MoonView }) {
  const { dark } = useMoonIconHandler(moon.phase);
  const pic = (
    <svg viewBox="0 0 40 40" width={moon.size} height={moon.size} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#ffffff" stroke={moon.color} strokeWidth="2.5" />
      {dark && <path d={dark} fill={moon.color} />}
    </svg>
  );
  if (!moon.big) {
    return <span className="moon-sm" title={`${moon.name} · ${moon.date}`} data-moon={moon.phase}>{pic}</span>;
  }
  return (
    <span className="moon" style={{ color: moon.color, fontSize: moon.textSize }} data-moon={moon.phase}>
      <b>{moon.name}</b>
      {pic}
      <i>{moon.date}</i>
    </span>
  );
}
