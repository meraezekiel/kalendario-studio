'use client';

import type { RenderCtx } from '@/lib/calendar/render';
import type { CalEl, Page } from '@/lib/calendar/types';
import DayCell from './DayCell/implementation/DayCell';
import { useCalendarElementHandler } from './useCalendarElementHandler';

interface Props {
  el: CalEl;
  page: Page;
  ctx: RenderCtx;
  selDay: number | null;
  editDay: number | null;
}

export default function CalendarElement({ el, page, ctx, selDay, editDay }: Props) {
  const { outer, head, week, cells, gridStyle } = useCalendarElementHandler(el, page, ctx, selDay);
  return (
    <div className="cal" style={outer}>
      {head && (
        <div className="chead" style={head.style}>
          {head.parts.map((p, i) => <span key={i}>{p}</span>)}
        </div>
      )}
      {week && (
        <div className="cwk" style={week.style}>
          {week.days.map((d) => <div key={d.key} style={d.style}>{d.name}</div>)}
        </div>
      )}
      <div className="cgrid" style={gridStyle}>
        {cells.map((c) => <DayCell key={c.key} cell={c} calId={el.id} editing={c.day != null && c.day === editDay} />)}
      </div>
    </div>
  );
}
