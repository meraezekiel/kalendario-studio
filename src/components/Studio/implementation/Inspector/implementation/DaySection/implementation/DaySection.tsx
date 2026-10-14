'use client';

import CheckField from '@/components/Fields/CheckField/implementation/CheckField';
import ColorField from '@/components/Fields/ColorField/implementation/ColorField';
import Section from '@/components/Fields/Section/implementation/Section';
import TextField from '@/components/Fields/TextField/implementation/TextField';
import type { CalEl } from '@/lib/calendar/types';
import { useDaySectionHandler } from './useDaySectionHandler';

export default function DaySection({ el, day }: { el: CalEl; day: number }) {
  const h = useDaySectionHandler(el, day);
  return (
    <Section title={h.title}>
      <TextField label="Number shown" value={h.info.num ?? String(day)} onChange={h.setNum} />
      <TextField label="Label" value={h.info.label || ''} placeholder={h.hol || 'e.g. Birthday, Fiesta, Payday'} onChange={h.setLabel} />
      {h.hol && <CheckField label={`Hide “${h.hol}”`} value={!!h.info.hideHol} onChange={h.setHideHol} />}
      <ColorField label="Box color" value={h.info.bg || '#ffffff'} onChange={h.setBg} onClear={h.clearBg} />
      <div className="g2">
        <button className="btn primary" onClick={h.addPicture}>{h.info.img ? 'Replace picture' : 'Add picture'}</button>
        <button className="btn danger" onClick={h.removePicture} disabled={!h.info.img}>Remove</button>
      </div>
      <button className="btn" onClick={h.done} style={{ marginTop: 8, width: '100%' }}>Back to whole calendar</button>
    </Section>
  );
}
