/** Someone in a design, as seen through the realtime channel's presence. */
export type Presence = { key: string; uid: string; name: string; color: string; page: number; sel: string[] };

/** What each tab tracks on the design channel. */
export type PresencePayload = { uid: string; name: string; color: string; page: number; sel: string[] };

/** Six person colours (CSS tokens in globals.css) that read on light and dark pages. */
export const PRESENCE_COLORS = ['var(--who-0)', 'var(--who-1)', 'var(--who-2)', 'var(--who-3)', 'var(--who-4)', 'var(--who-5)'] as const;

/** A person's colour, always the same for the same user id. */
export function colorFor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return PRESENCE_COLORS[h % PRESENCE_COLORS.length];
}

const MAX_SEL = 200;
const MAX_NAME = 80;

/**
 * Everyone in the channel's presence state except this tab (`mine`). Payloads come from other people's
 * browsers, so only well-formed fields are kept, and the colour is worked out here rather than trusted.
 */
export function readOthers(state: Record<string, unknown[]>, mine: string): Presence[] {
  const out: Presence[] = [];
  for (const [key, metas] of Object.entries(state)) {
    if (key === mine || !Array.isArray(metas) || !metas.length) continue;
    const p = metas[metas.length - 1] as Partial<Record<keyof PresencePayload, unknown>> | null;
    if (!p || typeof p.uid !== 'string' || !p.uid) continue;
    const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, MAX_NAME) : 'Someone';
    const page = typeof p.page === 'number' && Number.isInteger(p.page) ? p.page : -1;
    const sel = Array.isArray(p.sel) ? p.sel.filter((s): s is string => typeof s === 'string').slice(0, MAX_SEL) : [];
    out.push({ key, uid: p.uid, name, color: colorFor(p.uid), page, sel });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}

/** One entry per person (several tabs of the same user count once). */
export function people(others: Presence[]): Presence[] {
  const seen = new Set<string>();
  return others.filter((p) => !seen.has(p.uid) && seen.add(p.uid));
}

/** Who the whole-design confirmation names: "Ana", or "Ana and 2 others". */
export function whoElse(others: Presence[]): { who: string; many: boolean } {
  const ps = people(others);
  const n = ps.length - 1;
  if (n <= 0) return { who: ps[0]?.name ?? 'Someone', many: false };
  return { who: `${ps[0].name} and ${n} other${n > 1 ? 's' : ''}`, many: true };
}
