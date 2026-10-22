import { SUPPORT, type SupportConfig } from './config';
import type { Product } from './products';

/** Remembers that the one-time thank-you note was shown in this browser. */
const SEEN_KEY = 'kalendaryo-thanks-seen';

declare global {
  interface Window {
    /** Lets the browser tests preview the support UI with a coffee page and sample products. */
    __KS_SUPPORT__?: Partial<SupportConfig> & { products?: Product[] };
  }
}

/** The support settings. */
export function getSupport(): SupportConfig {
  const c = { ...SUPPORT, ...(typeof window !== 'undefined' ? window.__KS_SUPPORT__ : undefined) };
  return { coffeeUrl: c.coffeeUrl.trim() };
}

/** Sample products from the browser tests, or undefined to read the real ones. */
export function previewProducts(): Product[] | undefined {
  return typeof window !== 'undefined' ? window.__KS_SUPPORT__?.products : undefined;
}

/** Whether there's anything to show in the Print Kit tab. */
export function hasSupport(c: SupportConfig, products: Product[]) {
  return Boolean(c.coffeeUrl || products.length);
}

export function thanksSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // storage blocked: never risk showing the note again and again
  }
}

export function markThanksSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage blocked */
  }
}
