'use client';

import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import { useTopBarHandler } from './useTopBarHandler';

export default function TopBar() {
  const h = useTopBarHandler();
  return (
    <header className="top">
      <div className="brand">Kalendaryo Studio</div>
      <button className="btn icon" onClick={h.undo} disabled={!h.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
      <button className="btn icon" onClick={h.redo} disabled={!h.canRedo} title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>
      <div className="grow" />
      <div className="pnav">
        <button className="btn icon" onClick={h.prev} aria-label="Previous page">‹</button>
        <div className="plabel" data-testid="page-label">{h.label}</div>
        <button className="btn icon" onClick={h.next} aria-label="Next page">›</button>
      </div>
      <div className="grow" />
      <ConfirmButton onConfirm={h.sync} title="Copy this page's layout, text and stickers to the other months">Apply design to all months</ConfirmButton>
      <span style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={h.printOne}>Print page</button>
        <button className="btn" onClick={h.printAll}>Print all</button>
        <button className="btn" onClick={h.png}>PNG</button>
      </span>
    </header>
  );
}
