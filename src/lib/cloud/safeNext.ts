/**
 * The same-origin path a `?next=` value points to, or `fallback`. Resolving it with the URL parser
 * (which also strips tabs and newlines, as browsers do) catches `//evil.com`, `/\evil.com`,
 * `/\t/evil.com`, absolute URLs and `javascript:`.
 */
export function safeNext(next: string | null | undefined, origin: string, fallback: string): string {
  if (!next) return fallback;
  try {
    const u = new URL(next, origin);
    return u.origin === origin ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
