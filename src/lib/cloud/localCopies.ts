/** Offline copies of cloud designs are IndexedDB databases with this prefix (y-indexeddb). */
export const DB_PREFIX = 'kal-design-';
/** Ids of the copies opened in this browser, for browsers without `indexedDB.databases()`. */
export const TRACK_KEY = 'kal-design-dbs';

/** How long sign-out waits for the copies to go (one still open in another tab waits for that tab). */
const DELETE_WAIT_MS = 3000;

export const dbName = (designId: string) => `${DB_PREFIX}${designId}`;

function tracked(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(TRACK_KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Notes that design `designId` now has an offline copy here. */
export function rememberLocalCopy(designId: string): void {
  const ids = tracked();
  if (ids.includes(designId)) return;
  try {
    localStorage.setItem(TRACK_KEY, JSON.stringify([...ids, designId]));
  } catch {
    // blocked storage: indexedDB.databases() still finds it
  }
}

function remove(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      // A copy still open (the editor closing, another tab) goes once it's closed; 'blocked' just means waiting.
      req.onsuccess = req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Deletes every offline design copy in this browser (on sign-out: they belong to the account).
 * Never throws; resolves once they're gone, or after a few seconds when one is still in use.
 */
export async function forgetLocalCopies(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const names = new Set(tracked().map(dbName));
  try {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name?.startsWith(DB_PREFIX)) names.add(d.name);
  } catch {
    // not supported: the tracked ids are all there is
  }
  try {
    localStorage.removeItem(TRACK_KEY);
  } catch {
    // nothing to forget
  }
  if (!names.size) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all([...names].map(remove)),
    new Promise<void>((r) => { timer = setTimeout(r, DELETE_WAIT_MS); }),
  ]);
  clearTimeout(timer);
}
