/** "Recently used" graphics for this browser (a convenience; never part of the calendar). */
const KEY = 'kalendaryo-recent-graphics';
const MAX = 12;
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const getRecent = (): string[] => (cache ??= read());
export const getRecentServer = () => EMPTY;

export function subscribeRecent(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function rememberGraphic(key: string) {
  cache = [key, ...getRecent().filter((k) => k !== key)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage blocked: keep the in-memory list */
  }
  listeners.forEach((fn) => fn());
}
