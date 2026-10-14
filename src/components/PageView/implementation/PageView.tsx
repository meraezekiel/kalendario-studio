'use client';

import type { Page } from '@/lib/calendar/types';
import ElementView from './ElementView/implementation/ElementView';
import { usePageViewHandler } from './usePageViewHandler';

interface Props {
  page: Page;
  /** Editor mode: hover outlines, empty-frame placeholders, inline editing. */
  edit?: boolean;
}

/** Renders one printed page at design size (794px wide). Used by the stage, thumbnails, print and PNG export. */
export default function PageView({ page, edit = false }: Props) {
  const { ctx, D, className, sel, selDay, cropId, editing } = usePageViewHandler(page, edit);
  return (
    <div className={className} data-page-id={page.id} style={{ width: D.W, height: D.H, background: page.bg || '#ffffff' }}>
      {page.els.map((el) => (
        <ElementView
          key={el.id}
          el={el}
          page={page}
          ctx={ctx}
          crop={cropId === el.id}
          selDay={sel === el.id ? selDay : null}
          editDay={editing?.id === el.id ? (editing.day ?? null) : null}
          editText={editing?.id === el.id && editing.day == null}
        />
      ))}
    </div>
  );
}
