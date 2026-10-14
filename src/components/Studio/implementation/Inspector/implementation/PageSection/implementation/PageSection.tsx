'use client';

import ColorField from '@/components/Fields/ColorField/implementation/ColorField';
import Section from '@/components/Fields/Section/implementation/Section';
import SelectField from '@/components/Fields/SelectField/implementation/SelectField';
import { MONTH_OPTIONS, usePageSectionHandler } from './usePageSectionHandler';

export default function PageSection() {
  const h = usePageSectionHandler();
  return (
    <Section title="Page">
      <SelectField label="Month shown on this page" value={h.month} options={MONTH_OPTIONS} onChange={h.setMonth} />
      <ColorField label="Background" value={h.bg} onChange={h.setBg} />
      <p className="hint">
        Click anything on the page to edit it. Double-click text or a day number to type. Drag the corners to resize, the round handle to rotate.
      </p>
    </Section>
  );
}
