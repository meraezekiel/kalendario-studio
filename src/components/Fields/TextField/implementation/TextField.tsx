'use client';

interface Props {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}

export default function TextField({ label, value, placeholder, onChange }: Props) {
  return (
    <label className="f">
      {label}
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
