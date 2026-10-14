'use client';

import CheckField from '@/components/Fields/CheckField/implementation/CheckField';
import ColorField from '@/components/Fields/ColorField/implementation/ColorField';
import RangeField from '@/components/Fields/RangeField/implementation/RangeField';
import Section from '@/components/Fields/Section/implementation/Section';
import SelectField from '@/components/Fields/SelectField/implementation/SelectField';
import { SHAPES } from '@/lib/calendar/constants';
import type { ShapeEl } from '@/lib/calendar/types';
import { useShapeSectionHandler } from './useShapeSectionHandler';

export default function ShapeSection({ el }: { el: ShapeEl }) {
  const { bind, isLine, hasCorners, clearFill } = useShapeSectionHandler(el);
  return (
    <Section title="Shape">
      <SelectField label="Shape" options={SHAPES} {...bind('shape')} />
      {!isLine && <ColorField label="Fill" {...bind('fill')} onClear={clearFill} />}
      <ColorField label={isLine ? 'Line color' : 'Outline color'} {...bind('stroke')} />
      <RangeField label={isLine ? 'Thickness' : 'Outline width'} min={0} max={24} step={0.5} {...bind('sw')} />
      {hasCorners && <RangeField label="Rounded corners" min={0} max={50} {...bind('radius')} />}
      {isLine && <CheckField label="Dashed" {...bind('dash')} />}
    </Section>
  );
}
