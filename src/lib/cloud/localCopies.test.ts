import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetLocalCopies, rememberLocalCopy, TRACK_KEY } from './localCopies';

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

function fakeIdb(names: string[], opts: { databases?: boolean; blocked?: boolean } = {}) {
  const deleted: string[] = [];
  const idb = {
    databases: opts.databases === false ? undefined : async () => names.map((name) => ({ name, version: 1 })),
    deleteDatabase(name: string) {
      const req: { onsuccess: (() => void) | null; onerror: (() => void) | null } = { onsuccess: null, onerror: null };
      deleted.push(name);
      if (!opts.blocked) setTimeout(() => req.onsuccess?.(), 0);
      return req;
    },
  };
  return { idb, deleted };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('forgetLocalCopies', () => {
  it('deletes only kal-design- databases listed by indexedDB.databases()', async () => {
    const { idb, deleted } = fakeIdb(['kal-design-a', 'keyval-store', 'kal-design-b']);
    vi.stubGlobal('indexedDB', idb);
    await forgetLocalCopies();
    expect(deleted.sort()).toEqual(['kal-design-a', 'kal-design-b']);
  });

  it('falls back to the ids tracked in localStorage, then forgets them', async () => {
    const { idb, deleted } = fakeIdb([], { databases: false });
    vi.stubGlobal('indexedDB', idb);
    rememberLocalCopy('x');
    rememberLocalCopy('y');
    rememberLocalCopy('x');
    expect(JSON.parse(localStorage.getItem(TRACK_KEY)!)).toEqual(['x', 'y']);
    await forgetLocalCopies();
    expect(deleted).toEqual(['kal-design-x', 'kal-design-y']);
    expect(localStorage.getItem(TRACK_KEY)).toBeNull();
  });

  it('does not hang when a copy is still open elsewhere', async () => {
    vi.useFakeTimers();
    const { idb, deleted } = fakeIdb(['kal-design-a'], { blocked: true });
    vi.stubGlobal('indexedDB', idb);
    const done = forgetLocalCopies();
    await vi.advanceTimersByTimeAsync(3000);
    await done;
    expect(deleted).toEqual(['kal-design-a']);
  });
});
