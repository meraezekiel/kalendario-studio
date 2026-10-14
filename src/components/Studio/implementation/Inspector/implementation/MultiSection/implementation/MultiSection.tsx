'use client';

import Section from '@/components/Fields/Section/implementation/Section';
import { ALIGNS, useMultiSectionHandler } from './useMultiSectionHandler';

/** Actions for a multi-selection: align, stacking order, duplicate, lock and delete. */
export default function MultiSection() {
  const h = useMultiSectionHandler();
  return (
    <Section title="Selection">
      <p className="hint" style={{ marginBottom: 8 }}>Drag any selected item to move them together. Shift-click to add or remove items.</p>
      <div className="g3" role="group" aria-label="Align">
        {ALIGNS.map((a) => (
          <button key={a.key} className="btn" aria-label={`Align ${a.label.toLowerCase()}`} onClick={() => h.align(a.key)}>{a.label}</button>
        ))}
      </div>
      <div className="g2" style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => h.arrange('front')}>Bring to front</button>
        <button className="btn" onClick={() => h.arrange('back')}>Send to back</button>
        <button className="btn" onClick={h.centerOnPage}>Center on page</button>
        <button className="btn" onClick={h.toggleLock}>{h.allLocked ? 'Unlock all' : 'Lock all'}</button>
        <button className="btn" onClick={h.duplicate}>Duplicate</button>
        <button className="btn danger" onClick={h.remove}>Delete</button>
      </div>
      <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={h.deselect}>Deselect</button>
    </Section>
  );
}
