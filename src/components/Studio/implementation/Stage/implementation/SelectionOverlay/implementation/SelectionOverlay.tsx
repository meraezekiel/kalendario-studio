'use client';

import { HANDLES, useSelectionOverlayHandler } from './useSelectionOverlayHandler';

/** Selection box with resize/rotate handles, plus snap guides. Drawn above the page. */
export default function SelectionOverlay() {
  const { box, guides } = useSelectionOverlayHandler();
  return (
    <div id="ov">
      {box && (
        <div className={`sbox${box.locked ? ' locked' : ''}`} style={box.style} data-testid="selection">
          {box.locked ? (
            <span className="lockbadge">Locked</span>
          ) : (
            <>
              {HANDLES.map((k) => <i key={k} className={`hd ${k}`} data-h={k} />)}
              <i className="hd rot" data-h="rot">⟳</i>
            </>
          )}
        </div>
      )}
      {guides.map((g, i) =>
        g.v != null ? <div key={i} className="guide v" style={{ left: g.v }} /> : <div key={i} className="guide h" style={{ top: g.h }} />,
      )}
    </div>
  );
}
