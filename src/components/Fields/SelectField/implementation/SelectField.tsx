'use client';

interface Props<T extends string | number> {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}

export default function SelectField<T extends string | number>({ label, value, options, onChange }: Props<T>) {
  const numeric = typeof options[0]?.[0] === 'number';
  return (
    <label className="f">
      {label}
      <select value={String(value)} onChange={(e) => onChange((numeric ? +e.target.value : e.target.value) as T)}>
        {options.map(([v, l]) => (
          <option key={String(v)} value={String(v)}>{l}</option>
        ))}
      </select>
    </label>
  );
}
