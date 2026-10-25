import { type ChangeEvent, useState } from 'react';

/**
 * Keeps what is being typed while the field has focus, so in-between text ("", "-", or a "5" that
 * is below a minimum) is not replaced by the stored value. Only complete numbers are passed on.
 * If the value then changes to something else (the app adjusted it), the field shows that instead.
 */
export function useNumFieldHandler(value: number, onChange: (v: number) => void, decimals = 1) {
  const [draft, setDraft] = useState<{ text: string; base: number } | null>(null);
  const f = 10 ** decimals;
  const round = (v: number) => Math.round(v * f) / f;
  // Rounded compare: a converted value (e.g. px → inches) rarely equals the typed text exactly.
  const keep = draft && (value === draft.base || round(value) === round(+draft.text));
  return {
    shown: keep ? draft.text : String(round(+value || 0)),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const t = e.target.value;
      setDraft({ text: t, base: value });
      if (t.trim() !== '' && Number.isFinite(+t)) onChange(+t);
    },
    onBlur: () => setDraft(null),
  };
}
