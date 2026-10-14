'use client';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export default function AreaField({ label, value, onChange }: Props) {
  return (
    <label className="f">
      {label}
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
