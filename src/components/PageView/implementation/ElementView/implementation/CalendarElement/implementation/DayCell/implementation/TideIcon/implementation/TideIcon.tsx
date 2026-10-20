'use client';

import type { TideView } from '../../../../useCalendarElementHandler';
import { useTideIconHandler } from './useTideIconHandler';

/** A spring or neap tide mark in the corner of its day. */
export default function TideIcon({ tide }: { tide: TideView }) {
  const { d, solid } = useTideIconHandler(tide.kind);
  return (
    <span className="tide" title={tide.name} data-tide={tide.kind}>
      <svg viewBox="0 0 40 40" width={tide.size} height={tide.size} aria-hidden="true">
        <path d={d} fill={solid ? tide.color : '#ffffff'} stroke={tide.color} strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
