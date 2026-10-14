'use client';

import { isHex } from '@/lib/calendar/utils';

interface Props {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  /** Shows a ✕ button that removes the colour (transparent). */
  onClear?: () => void;
}

export default function ColorField({ label, value, onChange, onClear }: Props) {
  const input = (
    <label className="f">
      {label}
      <input type="color" aria-label={label} value={isHex(value) ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
  if (!onClear) return input;
  return (
    <div className="cc">
      {input}
      <button type="button" className="btn" title="No color" aria-label={`Clear ${label}`} onClick={onClear}>✕</button>
    </div>
  );
}
