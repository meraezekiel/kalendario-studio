'use client';

import { useOthersOverlayHandler } from './useOthersOverlayHandler';

/** What other people on this page have selected: a 2px outline in their colour, with their name. */
export default function OthersOverlay() {
  const boxes = useOthersOverlayHandler();
  if (!boxes.length) return null;
  return (
    <div className="others-ov" aria-hidden="true">
      {boxes.map((b) => (
        <div key={b.key} className="obox" style={b.style} data-testid="other-selection" data-el={b.id}>
          {b.name && <span className="otag">{b.name}</span>}
        </div>
      ))}
    </div>
  );
}
