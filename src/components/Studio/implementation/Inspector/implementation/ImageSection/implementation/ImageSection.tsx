'use client';

import CheckField from '@/components/Fields/CheckField/implementation/CheckField';
import ColorField from '@/components/Fields/ColorField/implementation/ColorField';
import NumField from '@/components/Fields/NumField/implementation/NumField';
import RangeField from '@/components/Fields/RangeField/implementation/RangeField';
import Section from '@/components/Fields/Section/implementation/Section';
import SegField from '@/components/Fields/SegField/implementation/SegField';
import type { ImageEl } from '@/lib/calendar/types';
import { useImageSectionHandler } from './useImageSectionHandler';

export default function ImageSection({ el }: { el: ImageEl }) {
  const h = useImageSectionHandler(el);
  return (
    <Section title={el.isBg ? 'Background image' : 'Photo'}>
      <div className="g2">
        <button className="btn primary" onClick={h.upload}>{h.has ? 'Replace' : 'Upload photo'}</button>
        <button className="btn danger" onClick={h.empty} disabled={!el.src}>Empty frame</button>
      </div>
      {el.isBg && <button className="btn" onClick={h.fitToPage} style={{ width: '100%', marginTop: 8 }}>Fit to page</button>}
      {!h.isSample && <button className="btn" onClick={h.useSample} style={{ width: '100%', marginTop: 8 }}>Use a sample photo</button>}
      <div style={{ height: 10 }} />
      <SegField label="Fit" options={[['cover', 'Fill frame'], ['contain', 'Show whole']] as const} {...h.bind('fit')} />
      <RangeField label="Zoom" min={1} max={4} step={0.05} {...h.bind('zoom')} />
      <button className={`btn${h.cropping ? ' primary' : ''}`} onClick={h.toggleCrop} style={{ width: '100%', marginBottom: 10 }}>
        {h.cropping ? 'Done positioning' : 'Move photo inside frame'}
      </button>
      <RangeField label="Rounded corners" min={0} max={50} {...h.bind('radius')} />
      <button className="btn" onClick={h.circle} style={{ width: '100%', marginBottom: 10 }}>Make it a circle</button>
      <div className="g2">
        <NumField label="Border" {...h.bind('bw')} />
        <ColorField label="Border color" {...h.bind('bc')} />
      </div>
      <CheckField label="Shadow" {...h.bind('shadow')} />
    </Section>
  );
}
