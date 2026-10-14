'use client';

import { r1 } from '@/lib/calendar/utils';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

export default function RangeField({ label, value, min, max, step = 1, onChange }: Props) {
  return (
    <label className="f">
      <span className="rl">
        {label}
        <em>{r1(+value)}</em>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}
