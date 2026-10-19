import type { SyncStatus } from './sync';

/**
 * Cloud designs with edits that haven't reached the account yet (kept in their offline copy), as
 * `{ [designId]: name }`. It outlives the tab, so sign-out can ask about them from any page.
 */
export const DIRTY_KEY = 'kal-design-dirty';

export type DirtyDesign = { id: string; name: string };

function read(): Record<string, string> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(DIRTY_KEY) ?? '{}');
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [id, name] of Object.entries(v)) out[id] = typeof name === 'string' ? name : '';
    return out;
  } catch {
    return {};
  }
}

function write(m: Record<string, string>) {
  try {
    if (Object.keys(m).length) localStorage.setItem(DIRTY_KEY, JSON.stringify(m));
    else localStorage.removeItem(DIRTY_KEY);
  } catch {
    // blocked storage: only the open design's own status can tell
  }
}

/** Every design with unsent edits here, oldest first. */
export function dirtyDesigns(): DirtyDesign[] {
  return Object.entries(read()).map(([id, name]) => ({ id, name }));
}

export const isDirty = (designId: string) => designId in read();

/** Notes unsent edits to `designId`; an empty `name` keeps the one already known. */
export function markDirty(designId: string, name: string): void {
  const m = read();
  if (designId in m && (!name || m[designId] === name)) return;
  m[designId] = name || m[designId] || '';
  write(m);
}

/** Every edit to `designId` reached the account (or the person let them go). */
export function markClean(designId: string): void {
  const m = read();
  if (!(designId in m)) return;
  delete m[designId];
  write(m);
}

/** Forgets them all (on sign-out, with the offline copies). */
export function forgetDirty(): void {
  try {
    localStorage.removeItem(DIRTY_KEY);
  } catch {
    // nothing to forget
  }
}

/** Keeps the set in step with an open design's sync status: pending edits mark it, saved while live clears it. */
export function followDirty(designId: string, name: string, s: SyncStatus): void {
  if (s.pending) markDirty(designId, name);
  else if (s.state === 'live') markClean(designId);
}
