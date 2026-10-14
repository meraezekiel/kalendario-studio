'use client';

interface Props<T extends string | number> {
  label?: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}

/** Segmented button group. */
export default function SegField<T extends string | number>({ label, value, options, onChange }: Props<T>) {
  return (
    <>
      {label && <div className="lab">{label}</div>}
      <div className="seg" role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={String(v)} type="button" className={v === value ? 'on' : ''} aria-pressed={v === value} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </>
  );
}
