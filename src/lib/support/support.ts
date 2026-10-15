import { SUPPORT, type SupportConfig } from './config';

/** Remembers that the one-time thank-you note was shown in this browser. */
const SEEN_KEY = 'kalendaryo-thanks-seen';

declare global {
  interface Window {
    /** Lets the browser tests preview the support UI with sample links. */
    __KS_SUPPORT__?: Partial<SupportConfig>;
  }
}

/** The support settings with empty links removed. */
export function getSupport(): SupportConfig {
  const c = { ...SUPPORT, ...(typeof window !== 'undefined' ? window.__KS_SUPPORT__ : undefined) };
  return { ...c, coffeeUrl: c.coffeeUrl.trim(), links: c.links.filter((l) => l.url.trim()) };
}

export function hasSupport(c = getSupport()) {
  return Boolean(c.coffeeUrl || c.links.length);
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
