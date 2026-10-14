'use client';

import RangeField from '@/components/Fields/RangeField/implementation/RangeField';
import Section from '@/components/Fields/Section/implementation/Section';
import type { GraphicEl } from '@/lib/calendar/types';
import { PALETTE_SWATCHES, useGraphicSectionHandler } from './useGraphicSectionHandler';

export default function GraphicSection({ el }: { el: GraphicEl }) {
  const h = useGraphicSectionHandler(el);
  return (
    <Section title={h.deco ? 'Decoration' : 'Graphic'}>
      {h.deco && (
        <>
          <div className="lab">Colors</div>
          <div className="palettes" role="group" aria-label="Colors">
            {PALETTE_SWATCHES.map((p) => (
              <button key={p.id} className={`pal${h.palette === p.id ? ' on' : ''}`} title={p.label} aria-label={p.label} aria-pressed={h.palette === p.id} onClick={() => h.setPalette(p.id)}>
                {p.colors.map((c, i) => <i key={i} style={{ background: c }} />)}
              </button>
            ))}
          </div>
          {h.random && <button className="btn" style={{ width: '100%', marginBottom: 10 }} onClick={h.shuffle}>Shuffle</button>}
          {h.density && <RangeField label="Amount" min={0.3} max={2.5} step={0.1} value={h.amount} onChange={h.setAmount} />}
        </>
      )}
      <div className="g2">
        <button className={`btn${el.flipX ? ' primary' : ''}`} aria-pressed={el.flipX} onClick={h.flipX}>Flip ↔</button>
        <button className={`btn${el.flipY ? ' primary' : ''}`} aria-pressed={el.flipY} onClick={h.flipY}>Flip ↕</button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        {h.deco ? 'Drag the corners or sides to any size; it re-draws to fit instead of stretching.' : 'Drag a corner to resize, the round handle to rotate.'} Transparency is under Position &amp; arrange.
      </p>
    </Section>
  );
}
