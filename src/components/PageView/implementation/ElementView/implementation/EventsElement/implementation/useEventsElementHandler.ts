import { MONTHS } from '@/lib/calendar/constants';
import { monthOf } from '@/lib/calendar/document';
import { holidays } from '@/lib/calendar/holidays';
import type { RenderCtx } from '@/lib/calendar/render';
import type { EventsEl, Page } from '@/lib/calendar/types';

export interface EventRow {
  key: string;
  day: number;
  text: string;
  holiday: boolean;
}

/** Holidays plus the day labels from the calendar showing the same month on this page. */
export function useEventsElementHandler(el: EventsEl, page: Page, ctx: RenderCtx) {
  const { y, m } = monthOf(ctx.year, page, el.mo);
  const hol = ctx.holidays ? holidays(y, m) : {};
  const cal = page.els.find((e) => e.type === 'cal' && e.mo === el.mo);
  const days = cal && cal.type === 'cal' ? cal.days : {};
  const dim = new Date(y, m + 1, 0).getDate();
  const rows: EventRow[] = [];
  for (let n = 1; n <= dim; n++) {
    const c = days[n] || {};
    const h = hol[n] && !c.hideHol ? hol[n] : '';
    if (h) rows.push({ key: `h${n}`, day: n, text: h, holiday: true });
    if (c.label) rows.push({ key: `l${n}`, day: n, text: c.label, holiday: false });
  }
  return { title: MONTHS[m].toUpperCase(), rows };
}
