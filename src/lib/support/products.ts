/** One affiliate product in the editor's Print Kit tab (managed at /admin/products). */
export interface Product {
  id: string;
  name: string;
  note: string;
  /** In pesos; null when not set. */
  price: number | null;
  /** When the price was last checked (ISO); set by the database whenever the price changes. */
  price_checked_at: string | null;
  url: string;
  /** Storage path in the public 'products' bucket, or a full image URL. */
  image: string | null;
  position: number;
  hidden: boolean;
}

/** "₱249" for whole pesos, "₱1,249.50" otherwise; '' when there's no price. */
export function formatPrice(price: number | null): string {
  if (price == null || !Number.isFinite(price)) return '';
  const whole = Number.isInteger(price);
  return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** Reads a typed price: "₱1,249.50", "1249.5", "249" → number; '' → null; anything else → NaN. */
export function parsePrice(text: string): number | null {
  const t = text.replace(/[₱,\s]|php/gi, '');
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Number(t);
}

/** "Price as of Oct 22" (adds the year when it isn't this year); '' when never checked. */
export function priceAsOf(checkedAt: string | null, now = new Date()): string {
  if (!checkedAt) return '';
  const d = new Date(checkedAt);
  if (Number.isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) };
  return `Price as of ${d.toLocaleDateString('en-US', opts)}`;
}

/** Whether a link is one the Print Kit may open: https only. */
export const isProductUrl = (url: string) => /^https:\/\/[^\s]+$/i.test(url.trim());

/** Products visitors see: not hidden, and with a name and a link, in the admin's order. */
export function visibleProducts(list: Product[]): Product[] {
  return list.filter((p) => !p.hidden && p.name.trim() && isProductUrl(p.url)).sort((a, b) => a.position - b.position);
}

/** The list with the item at `from` moved to `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const out = list.slice();
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
}
