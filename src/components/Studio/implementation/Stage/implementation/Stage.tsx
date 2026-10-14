'use client';

import PageView from '@/components/PageView/implementation/PageView';
import PageBar from './PageBar/implementation/PageBar';
import SelectionOverlay from './SelectionOverlay/implementation/SelectionOverlay';
import { useStageHandler } from './useStageHandler';

export default function Stage() {
  const { wrapRef, phRef, page, armed, scalerStyle, phStyle, pointer, drop } = useStageHandler();
  return (
    <main className="stage-col">
      {armed !== null && <div className="armbar">Tap a photo frame, a day, or an empty spot to place the image · Esc to cancel</div>}
      <div
        className="stage"
        ref={wrapRef}
        data-testid="stage"
        onPointerDown={pointer.onPointerDown}
        onPointerMove={pointer.onPointerMove}
        onPointerUp={pointer.onPointerUp}
        onPointerCancel={pointer.onPointerUp}
        onDragOver={drop.onDragOver}
        onDragLeave={drop.onDragLeave}
        onDrop={drop.onDrop}
      >
        <div className="scaler" style={scalerStyle}>
          <div className="ph" ref={phRef} style={phStyle}>
            <PageView page={page} edit />
            <SelectionOverlay />
          </div>
        </div>
      </div>
      <PageBar />
    </main>
  );
}
