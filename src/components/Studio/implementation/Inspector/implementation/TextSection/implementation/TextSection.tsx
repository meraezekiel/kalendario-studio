'use client';

import AreaField from '@/components/Fields/AreaField/implementation/AreaField';
import CheckField from '@/components/Fields/CheckField/implementation/CheckField';
import ColorField from '@/components/Fields/ColorField/implementation/ColorField';
import FontField from '@/components/Fields/FontField/implementation/FontField';
import NumField from '@/components/Fields/NumField/implementation/NumField';
import RangeField from '@/components/Fields/RangeField/implementation/RangeField';
import Section from '@/components/Fields/Section/implementation/Section';
import SegField from '@/components/Fields/SegField/implementation/SegField';
import type { TextEl } from '@/lib/calendar/types';
import { useTextSectionHandler } from './useTextSectionHandler';

export default function TextSection({ el }: { el: TextEl }) {
  const { bind, clearBg } = useTextSectionHandler(el);
  return (
    <>
      <Section title="Text">
        <AreaField label="Text" {...bind('text')} />
        <p className="hint" style={{ margin: '-4px 0 10px' }}>
          Type {'{MONTH}'}, {'{Month}'} or {'{YEAR}'} to fill in the page&apos;s month. {'{MONTH+1}'} shows the next month.
        </p>
        <FontField label="Font" {...bind('font')} />
        <div className="g2">
          <NumField label="Size" step={0.5} {...bind('size')} />
          <ColorField label="Color" {...bind('color')} />
        </div>
        <div className="g3">
          <CheckField label="Bold" {...bind('bold')} />
          <CheckField label="Italic" {...bind('italic')} />
          <CheckField label="ABC" {...bind('upper')} />
        </div>
        <SegField label="Align" options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']] as const} {...bind('align')} />
        <SegField options={[['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom']] as const} {...bind('valign')} />
        <RangeField label="Letter spacing" min={-3} max={20} step={0.5} {...bind('ls')} />
        <RangeField label="Line height" min={0.7} max={2.5} step={0.05} {...bind('lh')} />
      </Section>
      <Section title="Effects" open={false}>
        <RangeField label="Outline" min={0} max={8} step={0.5} {...bind('outline')} />
        <ColorField label="Outline color" {...bind('outlineColor')} />
        <CheckField label="Shadow" {...bind('shadow')} />
        <ColorField label="Background" {...bind('bg')} onClear={clearBg} />
      </Section>
    </>
  );
}
