'use client';

import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import CheckField from '@/components/Fields/CheckField/implementation/CheckField';
import ColorField from '@/components/Fields/ColorField/implementation/ColorField';
import NumField from '@/components/Fields/NumField/implementation/NumField';
import SegField from '@/components/Fields/SegField/implementation/SegField';
import SelectField from '@/components/Fields/SelectField/implementation/SelectField';
import { MONTH_OPTIONS, PAPER_OPTIONS, usePagesPanelHandler } from './usePagesPanelHandler';

export default function PagesPanel() {
  const h = usePagesPanelHandler();
  return (
    <>
      <section>
        <h3>This page</h3>
        <SelectField label="Month" value={h.page.month} options={MONTH_OPTIONS} onChange={h.setMonth} />
        <SelectField label="Paper" value={h.page.paper.size} options={PAPER_OPTIONS} onChange={h.setPaperSize} />
        <SegField value={h.page.paper.o} options={[['p', 'Portrait'], ['l', 'Landscape']] as const} onChange={h.setOrientation} />
        <ColorField label="Background color" value={h.page.bg} onChange={h.setBg} />
        <div className="g2">
          <button className="btn" onClick={h.addBlank}>Add blank page</button>
          <button className="btn" onClick={h.duplicatePage}>Duplicate page</button>
          <button className="btn" onClick={h.moveEarlier}>Move earlier</button>
          <button className="btn" onClick={h.moveLater}>Move later</button>
        </div>
        <ConfirmButton className="btn danger" style={{ width: '100%', marginTop: 8 }} onConfirm={h.deletePage}>Delete this page</ConfirmButton>
      </section>
      <section>
        <h3>Whole calendar</h3>
        <NumField label="Year" value={h.year} onChange={h.setYear} />
        <CheckField label="Show Philippine holidays" value={h.showHolidays} onChange={h.setHolidays} />
        <ConfirmButton className="btn primary" style={{ width: '100%', marginBottom: 8 }} onConfirm={h.fillYear}>Fill the rest of the year from this design</ConfirmButton>
        <ConfirmButton style={{ width: '100%' }} onConfirm={h.applyDesignToAll}>Copy this page&apos;s design to all months</ConfirmButton>
        <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={h.monthBackgrounds}>Backgrounds for each month</button>
        <p className="hint" style={{ marginTop: 8 }}>
          Fill the rest of the year makes one copy per month and replaces the other pages. Copy design keeps each month&apos;s own photos and day details. Pages marked photo only copy to other photo pages. Backgrounds for each month puts the images you pick into the background of this page and the ones after it, in file-name order (01-jan, 02-feb, …).
        </p>
      </section>
    </>
  );
}
