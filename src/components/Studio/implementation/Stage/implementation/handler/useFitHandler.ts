import { type RefObject, useLayoutEffect, useState } from 'react';
import { DW } from '@/lib/calendar/constants';

/** Scale that fits the page into the stage: full width on phones, whole page on desktops. */
export function useFitHandler(wrapRef: RefObject<HTMLDivElement | null>, pageH: number) {
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fit = () => {
      let s = Math.min(1, (wrap.clientWidth - 32) / DW);
      if (innerWidth > 1100) s = Math.min(s, (wrap.clientHeight - 40) / pageH);
      setScale(Math.max(0.15, s));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wrapRef, pageH]);

  return scale;
}
