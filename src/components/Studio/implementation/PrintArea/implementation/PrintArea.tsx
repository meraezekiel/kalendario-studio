'use client';

import PageView from '@/components/PageView/implementation/PageView';
import { usePrintAreaHandler } from './usePrintAreaHandler';

/** Hidden on screen; the only thing visible when printing. */
export default function PrintArea() {
  const { list, D, k } = usePrintAreaHandler();
  return (
    <div id="printArea">
      {D &&
        list.map((p) => (
          <div key={p.id} className="sheetp" style={{ width: `${D.wmm}mm`, height: `${D.hmm}mm` }}>
            <div style={{ transform: `scale(${k.toFixed(5)})`, transformOrigin: '0 0' }}>
              <PageView page={p} />
            </div>
          </div>
        ))}
    </div>
  );
}
