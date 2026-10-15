'use client';

import CheckField from '@/components/Fields/CheckField/implementation/CheckField';
import ColorField from '@/components/Fields/ColorField/implementation/ColorField';
import FontField from '@/components/Fields/FontField/implementation/FontField';
import NumField from '@/components/Fields/NumField/implementation/NumField';
import Section from '@/components/Fields/Section/implementation/Section';
import SegField from '@/components/Fields/SegField/implementation/SegField';
import SelectField from '@/components/Fields/SelectField/implementation/SelectField';
import type { EventsEl } from '@/lib/calendar/types';
import { useEventsSectionHandler } from './useEventsSectionHandler';

export default function EventsSection({ el }: { el: EventsEl }) {
  const { bind, moOptions } = useEventsSectionHandler(el);
  return (
    <Section title="Holiday list">
      <SegField label="Show" options={[['month', 'This month'], ['year', 'Whole year']] as const} value={el.scope ?? 'month'} onChange={(v) => bind('scope').onChange(v)} />
      {el.scope !== 'year' && <SelectField label="Month" options={moOptions} {...bind('mo')} />}
      <p className="hint" style={{ margin: '-4px 0 10px' }}>
        {el.scope === 'year' ? 'Lists every Philippine holiday of the year.' : 'Lists Philippine holidays plus the labels you add to days in the matching calendar.'}
      </p>
      <FontField label="Font" {...bind('font')} />
      <div className="g2">
        <NumField label="Size" step={0.5} {...bind('size')} />
        <ColorField label="Text color" {...bind('color')} />
      </div>
      <div className="g2">
        <ColorField label="Holiday color" {...bind('hiColor')} />
        <ColorField label="Title color" {...bind('titleColor')} />
      </div>
      <CheckField label={el.scope === 'year' ? 'Show title' : 'Show month title'} {...bind('title')} />
      {el.title && <FontField label="Title font" {...bind('titleFont')} />}
      <SegField label="Columns" options={[[1, '1'], [2, '2'], [3, '3']] as const} {...bind('cols')} />
    </Section>
  );
}
