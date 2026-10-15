'use client';

import PageView from '@/components/PageView/implementation/PageView';
import { usePrintAreaHandler } from './usePrintAreaHandler';

/** Hidden on screen; the only thing visible when printing. */
export default function PrintArea() {
  const { list, D, k, sheets, layout } = usePrintAreaHandler();
  if (!D) return <div id="printArea" />;
  if (layout)
    return (
      <div id="printArea">
        {sheets.map((group, s) => (
          <div key={s} className="sheetp" data-testid="print-sheet" style={{ width: `${layout.wmm}mm`, height: `${layout.hmm}mm` }}>
            {group.map((p, i) => {
              const t = layout.slots[i];
              return (
                <div key={i} className="slotp" style={{ left: `${t.x}mm`, top: `${t.y}mm`, width: `${t.w}mm`, height: `${t.h}mm` }}>
                  <div style={{ transform: `scale(${k.toFixed(5)})`, transformOrigin: '0 0' }}>
                    <PageView page={p} />
                  </div>
                </div>
              );
            })}
            {layout.marks.map((m, i) => (
              <i key={i} className="cutmark" style={{ left: `${m.x}mm`, top: `${m.y}mm`, width: `${m.w}mm`, height: `${m.h}mm` }} />
            ))}
          </div>
        ))}
      </div>
    );
  return (
    <div id="printArea">
      {list.map((p) => (
        <div key={p.id} className="sheetp" style={{ width: `${D.wmm}mm`, height: `${D.hmm}mm` }}>
          <div style={{ transform: `scale(${k.toFixed(5)})`, transformOrigin: '0 0' }}>
            <PageView page={p} />
          </div>
        </div>
      ))}
    </div>
  );
}
