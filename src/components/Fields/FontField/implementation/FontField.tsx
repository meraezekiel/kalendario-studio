'use client';

import { FONTS } from '@/lib/calendar/constants';
import SelectField from '../../SelectField/implementation/SelectField';

const OPTIONS = FONTS.map((f) => [f, f] as const);

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export default function FontField({ label, value, onChange }: Props) {
  return <SelectField label={label} value={value} options={OPTIONS} onChange={onChange} />;
}
