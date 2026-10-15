'use client';

import type { RenderCtx } from '@/lib/calendar/render';
import type { EventsEl, Page } from '@/lib/calendar/types';
import { useEventsElementHandler } from './useEventsElementHandler';

interface Props {
  el: EventsEl;
  page: Page;
  ctx: RenderCtx;
}

export default function EventsElement({ el, page, ctx }: Props) {
  const { title, rows, year } = useEventsElementHandler(el, page, ctx);
  return (
    <div className={`evs${year ? ' evs-year' : ''}`} style={{ fontFamily: `'${el.font}',sans-serif`, fontSize: el.size, color: el.color }}>
      {el.title && <b style={{ fontFamily: `'${el.titleFont}',sans-serif`, color: el.titleColor }}>{title}</b>}
      <div style={{ columnCount: el.cols, columnGap: 12 }}>
        {rows.map((r) =>
          r.holiday ? (
            <div key={r.key} className="ev" style={{ color: el.hiColor }}><i>{r.date ?? r.day}</i><span>{r.text}</span></div>
          ) : (
            <div key={r.key} className="ev"><i style={{ color: el.titleColor }}>{r.day}</i><span>{r.text}</span></div>
          ),
        )}
        {!rows.length && ctx.edit && <div className="ev" style={{ opacity: 0.5 }}>{year ? 'Holidays are turned off (Pages → Show Philippine holidays)' : 'No holidays or events this month'}</div>}
      </div>
    </div>
  );
}
