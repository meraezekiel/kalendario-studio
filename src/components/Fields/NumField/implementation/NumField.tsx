'use client';

import { useNumFieldHandler } from './useNumFieldHandler';

interface Props {
  label: string;
  value: number;
  step?: number;
  /** Decimal places shown (default 1). */
  decimals?: number;
  onChange: (v: number) => void;
}

export default function NumField({ label, value, step = 1, decimals = 1, onChange }: Props) {
  const h = useNumFieldHandler(value, onChange, decimals);
  return (
    <label className="f">
      {label}
      <input type="number" step={step} value={h.shown} onChange={h.onChange} onBlur={h.onBlur} />
    </label>
  );
}
