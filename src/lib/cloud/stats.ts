import { supabase, cloudEnabled } from './supabase';
import { toCloudError } from './transport';

/** What the app counts (supabase/migrations/…_stats.sql keeps the same list). */
export type StatEvent = 'open' | 'print' | 'export_png' | 'print_kit_open' | 'product_click' | 'design_service_click' | 'gcash_open' | 'order_open' | 'print_order' | `template:${string}`;

declare global {
  interface Window {
    /** Lets a browser test count against the TEST project (automated browsers aren't counted otherwise). */
    __KS_COUNT__?: boolean;
  }
}

/** Adds one to today's count of `event`. Fire and forget: counting never gets in anyone's way. */
export function countEvent(event: StatEvent) {
  // Automated browsers (our own tests) would inflate the real numbers.
  if (!cloudEnabled() || typeof navigator === 'undefined' || (navigator.webdriver && !window.__KS_COUNT__)) return;
  try {
    void supabase().rpc('count_event', { e: event }).then(() => {}, () => {});
  } catch {
    /* ignore */
  }
}

const OPENED_KEY = 'kalendaryo-opened';

/** Counts the editor being opened, once per browser tab session. */
export function countOpen() {
  try {
    if (sessionStorage.getItem(OPENED_KEY)) return;
    sessionStorage.setItem(OPENED_KEY, '1');
  } catch {
    return;
  }
  countEvent('open');
}

/** One day's count of one event. */
export type StatRow = { day: string; event: string; n: number };

/** Admin only: the daily counts since `from` (YYYY-MM-DD). */
export async function listStats(from: string): Promise<StatRow[]> {
  const res = await supabase().from('stats').select('day, event, n').gte('day', from).order('day');
  if (res.error) throw toCloudError(res.error);
  return (res.data ?? []) as StatRow[];
}
