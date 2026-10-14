'use client';

import { HANDLES, useSelectionOverlayHandler } from './useSelectionOverlayHandler';

/** Selection box with resize/rotate handles, multi-selection outlines, the selection rectangle and snap guides. Drawn above the page. */
export default function SelectionOverlay() {
  const { box, guides, members, group, band } = useSelectionOverlayHandler();
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
      {members.map((m) => <div key={m.id} className={`sbox member${m.locked ? ' locked' : ''}`} style={m.style} />)}
      {group && (
        <div className="gbox" style={group.style} data-testid="group-selection">
          <span className="lockbadge gbadge">{group.count} selected</span>
        </div>
      )}
      {band && <div className="marquee" style={band} data-testid="marquee" />}
      {guides.map((g, i) =>
        g.v != null ? <div key={i} className="guide v" style={{ left: g.v }} /> : <div key={i} className="guide h" style={{ top: g.h }} />,
      )}
    </div>
  );
}
