'use client';

import SelectField from '@/components/Fields/SelectField/implementation/SelectField';
import { UNIT_OPTIONS, useCustomSizeHandler } from './useCustomSizeHandler';

/** Width, height and unit of a custom-size page. Sizes apply on Enter or when the field loses focus. */
export default function CustomSize() {
  const h = useCustomSizeHandler();
  return (
    <div data-testid="custom-size">
      <div className="g2">
        {h.sides.map((s) => (
          <label className="f" key={s.side}>
            {s.label}
            <input
              key={s.value}
              type="number"
              step="any"
              min={0}
              defaultValue={s.value}
              aria-label={`${s.label} (${h.unit})`}
              onBlur={(e) => h.commit(s.side, e.currentTarget)}
              onKeyDown={(e) => e.key === 'Enter' && h.commit(s.side, e.currentTarget)}
            />
          </label>
        ))}
      </div>
      <SelectField label="Unit" value={h.unit} options={UNIT_OPTIONS} onChange={h.setUnit} />
      <p className="hint">Any size from 2 cm to 1.5 m. For small calendars like 3×3 in, print several on one sheet and cut them out.</p>
    </div>
  );
}
