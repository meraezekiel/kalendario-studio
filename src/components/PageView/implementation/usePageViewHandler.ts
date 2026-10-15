import { useMemo } from 'react';
import { dims } from '@/lib/calendar/document';
import type { RenderCtx } from '@/lib/calendar/render';
import type { Asset, Page } from '@/lib/calendar/types';
import { useStudioStore } from '@/store/useStudioStore';

export function usePageViewHandler(page: Page, edit: boolean, own?: Record<string, Asset>) {
  const year = useStudioStore((s) => s.doc.year);
  const holidays = useStudioStore((s) => s.doc.holidays);
  const docAssets = useStudioStore((s) => s.doc.assets);
  const assets = own ?? docAssets;
  const armed = useStudioStore((s) => (edit ? s.armed : null));
  const sel = useStudioStore((s) => (edit ? s.sel : null));
  const selDay = useStudioStore((s) => (edit ? s.selDay : null));
  const cropId = useStudioStore((s) => (edit ? s.cropId : null));
  const editing = useStudioStore((s) => (edit ? s.editing : null));

  const ctx = useMemo<RenderCtx>(() => ({ year, holidays, assets, edit }), [year, holidays, assets, edit]);
  const D = dims(page);
  const className = `page${edit ? ' edit' : ''}${edit && armed !== null ? ' armed' : ''}`;
  return { ctx, D, className, sel, selDay, cropId, editing };
}
