import { useMemo } from 'react';
import { DW } from '@/lib/calendar/constants';
import { dims } from '@/lib/calendar/document';
import { TEMPLATES } from '@/lib/calendar/templates';
import { applyTemplate } from '@/store/actions';

const THUMB_W = 118;

export function useTemplatesPanelHandler() {
  // Built once: each thumbnail is the template's first page rendered at a tiny scale.
  const items = useMemo(
    () =>
      Object.entries(TEMPLATES).map(([key, t]) => {
        const page = t.make()[0];
        const s = THUMB_W / DW;
        return { key, name: t.name, page, scale: s, height: Math.round(dims(page).H * s) };
      }),
    [],
  );
  return { items, choose: (key: string) => void applyTemplate(key) };
}
