'use client';

type Props = {
  percent: number;
  fitted: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  fitPage: () => void;
};

export default function ZoomBar({ percent, fitted, canZoomIn, canZoomOut, zoomIn, zoomOut, fitPage }: Props) {
  return (
    <div className="zoombar" data-testid="zoombar">
      <button onClick={zoomOut} disabled={!canZoomOut} title="Zoom out (Ctrl −)" aria-label="Zoom out">−</button>
      <span className="zoom-pct" aria-live="polite" data-testid="zoom-pct">{percent}%</span>
      <button onClick={zoomIn} disabled={!canZoomIn} title="Zoom in (Ctrl +)" aria-label="Zoom in">+</button>
      <button onClick={fitPage} disabled={fitted} title="Show the whole page (Ctrl 0)">Fit</button>
    </div>
  );
}
