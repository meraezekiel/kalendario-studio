import { useRef } from 'react';
import { DW } from '@/lib/calendar/constants';
import { dims } from '@/lib/calendar/document';
import { curPage, useStudioStore } from '@/store/useStudioStore';
import { useDropHandler } from './handler/useDropHandler';
import { useFitHandler } from './handler/useFitHandler';
import { usePointerHandler } from './handler/usePointerHandler';

export function useStageHandler() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const phRef = useRef<HTMLDivElement>(null);
  const page = useStudioStore((s) => curPage(s.doc));
  const armed = useStudioStore((s) => s.armed);
  const H = dims(page).H;
  const scale = useFitHandler(wrapRef, H);
  const pointer = usePointerHandler(wrapRef, phRef, scale);
  const drop = useDropHandler(pointer.pagePt);

  return {
    wrapRef,
    phRef,
    page,
    armed,
    scale,
    scalerStyle: { width: DW * scale, height: H * scale },
    phStyle: { transform: `scale(${scale})`, '--inv': (1 / scale).toFixed(3) } as React.CSSProperties,
    pointer,
    drop,
  };
}
