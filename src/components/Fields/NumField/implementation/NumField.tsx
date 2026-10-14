'use client';

import { r1 } from '@/lib/calendar/utils';

interface Props {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}

export default function NumField({ label, value, step = 1, onChange }: Props) {
  return (
    <label className="f">
      {label}
      <input type="number" step={step} value={r1(+value || 0)} onChange={(e) => onChange(e.target.value === '' ? 0 : +e.target.value)} />
    </label>
  );
}
