'use client';

import { usePresenceHandler } from './usePresenceHandler';

/** Avatars of the other people in this design: an initial in their colour, the name on hover. */
export default function Presence() {
  const h = usePresenceHandler();
  if (!h.shown.length) return null;
  return (
    <div className="presence" data-testid="presence" aria-label="Also here">
      {h.shown.map((p) => (
        <span key={p.uid} className="who" style={{ background: p.color }} title={p.name} aria-label={p.name} data-testid="presence-avatar">
          {p.initial}
        </span>
      ))}
      {h.more > 0 && <span className="who more" title={h.moreNames}>+{h.more}</span>}
    </div>
  );
}
