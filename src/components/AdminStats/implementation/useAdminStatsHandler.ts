import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEMPLATES } from '@/lib/calendar/templates';
import { listStats } from '@/lib/cloud/stats';
import { daysBefore, manilaDay, percent, summarize, type Totals } from '@/lib/cloud/statsSummary';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type StatLine = { label: string; totals: Totals };

const NONE: Totals = { today: 0, week: 0, month: 0 };

const USE: [string, string][] = [
  ['open', 'Opened the editor'],
  ['print', 'Printed'],
  ['export_png', 'Saved a PNG'],
];
const KIT: [string, string][] = [
  ['print_kit_open', 'Opened the Print Kit'],
  ['product_click', 'Tapped a product'],
  ['design_service_click', 'Tapped “Message me” (design service)'],
  ['gcash_open', 'Opened the GCash QR'],
];
const ORDERS: [string, string][] = [
  ['order_open', 'Opened “Order prints”'],
  ['print_order', 'Sent an order to Messenger'],
];

/** The /admin/stats page: what people do in the editor, counted per day (no names, no tracking). */
export function useAdminStatsHandler() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const ready = useAuthStore((s) => s.ready);
  const admin = useAuthStore((s) => s.admin);
  const [totals, setTotals] = useState<Record<string, Totals> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => useAuthStore.getState().init(), []);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      if (!useAuthStore.getState().leaving) router.replace(`/login?next=${encodeURIComponent('/admin/stats')}`);
      return;
    }
    if (!admin) return;
    const today = manilaDay(new Date());
    listStats(daysBefore(today, 29)).then(
      (rows) => setTotals(summarize(rows, today)),
      () => {
        setError('Could not load the numbers. Check your connection and try again.');
        setTotals({});
      },
    );
  }, [ready, userId, admin, router]);

  const t = (event: string) => totals?.[event] ?? NONE;
  const lines = (list: [string, string][]): StatLine[] => list.map(([e, label]) => ({ label, totals: t(e) }));
  const made = t('print').month + t('export_png').month;
  return {
    enabled: cloudEnabled(),
    signedIn: !!userId,
    admin,
    loaded: !!totals,
    error,
    use: lines(USE),
    kit: lines(KIT),
    orders: lines(ORDERS),
    templates: Object.entries(TEMPLATES)
      .map(([key, tpl]) => ({ label: tpl.name, totals: t(`template:${key}`) }))
      .sort((a, b) => b.totals.month - a.totals.month || a.label.localeCompare(b.label)),
    insight: totals
      ? `Last 30 days · Visits: ${t('open').month} · Prints and PNGs: ${made} (${percent(made, t('open').month)} of visits) · Product taps: ${t('product_click').month} · Print orders sent: ${t('print_order').month}`
      : '',
  };
}
