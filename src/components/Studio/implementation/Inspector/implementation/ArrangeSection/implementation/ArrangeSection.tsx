'use client';

import NumField from '@/components/Fields/NumField/implementation/NumField';
import RangeField from '@/components/Fields/RangeField/implementation/RangeField';
import Section from '@/components/Fields/Section/implementation/Section';
import type { El } from '@/lib/calendar/types';
import { useArrangeSectionHandler } from './useArrangeSectionHandler';

export default function ArrangeSection({ el }: { el: El }) {
  const h = useArrangeSectionHandler(el);
  return (
    <Section title="Position & arrange" open={el.type !== 'cal'}>
      <div className="g2">
        <NumField label="X" {...h.bind('x')} />
        <NumField label="Y" {...h.bind('y')} />
        <NumField label="Width" {...h.size('w')} />
        <NumField label="Height" {...h.size('h')} />
      </div>
      <RangeField label="Rotate" min={-180} max={180} {...h.bind('rot')} />
      <RangeField label="Transparency" min={0.05} max={1} step={0.05} {...h.bind('op')} />
      <div className="g2">
        <button className="btn" onClick={() => h.arrange('front')}>Bring to front</button>
        <button className="btn" onClick={() => h.arrange('back')}>Send to back</button>
        <button className="btn" onClick={() => h.arrange('fwd')}>Forward</button>
        <button className="btn" onClick={() => h.arrange('bwd')}>Backward</button>
      </div>
      <div className="g2" style={{ marginTop: 8 }}>
        <button className="btn" onClick={h.centerH}>Center on page</button>
        <button className="btn" onClick={h.toggleLock}>{el.locked ? 'Unlock' : 'Lock'}</button>
        <button className="btn" onClick={h.duplicate}>Duplicate</button>
        <button className="btn danger" onClick={h.remove}>Delete</button>
      </div>
    </Section>
  );
}
