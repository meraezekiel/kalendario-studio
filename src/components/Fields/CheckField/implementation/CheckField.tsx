'use client';

interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function CheckField({ label, value, onChange }: Props) {
  return (
    <label className="chk">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
