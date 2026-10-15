import { useEffect } from 'react';
import { DW } from '@/lib/calendar/constants';
import { dims } from '@/lib/calendar/document';
import { offerThanks } from '@/store/actions';
import { useStudioStore } from '@/store/useStudioStore';

/** Renders the requested pages at paper size, sets @page size, then opens the print dialog. */
export function usePrintAreaHandler() {
  const printing = useStudioStore((s) => s.printing);
  const pages = useStudioStore((s) => s.doc.pages);

  const list = printing?.map((i) => pages[i]).filter(Boolean) ?? [];
  const D = list.length ? dims(list[0]) : null;
  const k = D ? (D.wmm * 96) / 25.4 / DW : 1;

  useEffect(() => {
    if (!printing || !D) return;
    const style = document.getElementById('pagesize');
    if (style) style.textContent = `@page{size:${D.wmm}mm ${D.hmm}mm;margin:0}`;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      useStudioStore.getState().set({ printing: null });
      offerThanks();
    };
    addEventListener('afterprint', finish, { once: true });
    const t = setTimeout(() => {
      document.fonts.ready.then(() => {
        window.print();
        // print() blocks until the dialog closes; this covers browsers that skip afterprint.
        setTimeout(finish, 500);
      });
    }, 200);
    return () => {
      clearTimeout(t);
      removeEventListener('afterprint', finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printing]);

  return { list, D, k };
}
