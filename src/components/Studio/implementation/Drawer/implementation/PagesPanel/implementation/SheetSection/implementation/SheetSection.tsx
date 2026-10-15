'use client';

import CheckField from '@/components/Fields/CheckField/implementation/CheckField';
import SegField from '@/components/Fields/SegField/implementation/SegField';
import SelectField from '@/components/Fields/SelectField/implementation/SelectField';
import { FILL_OPTIONS, GAP_OPTIONS, SHEET_OPTIONS, useSheetSectionHandler } from './useSheetSectionHandler';

/** Print small calendars several to a sheet, with marks to cut them apart. */
export default function SheetSection() {
  const h = useSheetSectionHandler();
  const { sheet, layout } = h;
  return (
    <section data-testid="sheet-section">
      <h3>Print several per sheet</h3>
      <CheckField label="Print several on one sheet, with cut marks" value={sheet.on} onChange={h.setOn} />
      {sheet.on && (
        <>
          <SelectField label="Sheet" value={sheet.paper} options={SHEET_OPTIONS} onChange={h.setPaper} />
          <SegField label="Fill the sheet with" value={sheet.fill ? 'copies' : 'order'} options={FILL_OPTIONS} onChange={h.setFill} />
          <SelectField label="Space between" value={sheet.gap} options={GAP_OPTIONS} onChange={h.setGap} />
          <CheckField label="Cut marks" value={sheet.marks} onChange={h.setMarks} />
          {layout && (
            <div className="sheetprev" data-testid="sheet-preview" style={{ aspectRatio: `${layout.wmm} / ${layout.hmm}`, width: `min(100%, ${Math.round((240 * layout.wmm) / layout.hmm)}px)` }}>
              {layout.slots.map((t, i) => (
                <i key={i} style={{ left: `${(t.x / layout.wmm) * 100}%`, top: `${(t.y / layout.hmm) * 100}%`, width: `${(t.w / layout.wmm) * 100}%`, height: `${(t.h / layout.hmm) * 100}%` }} />
              ))}
              {layout.marks.map((m, i) => (
                <b key={i} style={{ left: `${(m.x / layout.wmm) * 100}%`, top: `${(m.y / layout.hmm) * 100}%`, width: `max(1px, ${(m.w / layout.wmm) * 100}%)`, height: `max(1px, ${(m.h / layout.hmm) * 100}%)` }} />
              ))}
            </div>
          )}
          <p className="hint" data-testid="sheet-summary" style={{ marginTop: 8 }}>{h.summary}</p>
          <p className="hint" style={{ marginTop: 6 }}>
            Print page and Print all now use this. Copies of each page fills a sheet with one design (great for giveaways); Pages in order puts different months side by side. Print at 100% / Actual size, then cut along the marks.
          </p>
        </>
      )}
    </section>
  );
}
