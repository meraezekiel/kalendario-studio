import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DIRTY_KEY, dirtyDesigns, followDirty, forgetDirty, isDirty, markClean, markDirty } from './dirty';
import type { SyncStatus } from './sync';

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('designs with unsent edits', () => {
  it('starts empty', () => {
    expect(dirtyDesigns()).toEqual([]);
    expect(isDirty('a')).toBe(false);
  });

  it('remembers ids (with their names) until they are clean', () => {
    markDirty('a', 'Family 2027');
    markDirty('b', '');
    expect(dirtyDesigns()).toEqual([{ id: 'a', name: 'Family 2027' }, { id: 'b', name: '' }]);
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY)!)).toEqual({ a: 'Family 2027', b: '' });
    markClean('a');
    expect(dirtyDesigns()).toEqual([{ id: 'b', name: '' }]);
    expect(isDirty('a')).toBe(false);
    expect(isDirty('b')).toBe(true);
  });

  it('keeps a known name when marked again without one, and takes a new one', () => {
    markDirty('a', 'Family');
    markDirty('a', '');
    expect(dirtyDesigns()).toEqual([{ id: 'a', name: 'Family' }]);
    markDirty('a', 'Family 2027');
    expect(dirtyDesigns()).toEqual([{ id: 'a', name: 'Family 2027' }]);
  });

  it('forgets everything (on sign-out)', () => {
    markDirty('a', 'x');
    forgetDirty();
    expect(dirtyDesigns()).toEqual([]);
    expect(localStorage.getItem(DIRTY_KEY)).toBeNull();
  });

  it('survives broken or blocked storage', () => {
    localStorage.setItem(DIRTY_KEY, 'not json');
    expect(dirtyDesigns()).toEqual([]);
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    });
    expect(() => markDirty('a', 'x')).not.toThrow();
    expect(() => markClean('a')).not.toThrow();
    expect(() => forgetDirty()).not.toThrow();
    expect(dirtyDesigns()).toEqual([]);
  });

  it('follows sync status: pending marks dirty, acknowledged while live marks clean', () => {
    const s = (state: SyncStatus['state'], pending: boolean): SyncStatus => ({ state, pending });
    followDirty('a', 'Family', s('connecting', false));
    expect(isDirty('a')).toBe(false);
    followDirty('a', 'Family', s('live', true));
    expect(isDirty('a')).toBe(true);
    // Offline, nothing in flight yet (e.g. opened offline): still unsent.
    followDirty('a', 'Family', s('offline', false));
    expect(isDirty('a')).toBe(true);
    followDirty('a', 'Family', s('denied', false));
    expect(isDirty('a')).toBe(true);
    followDirty('a', 'Family', s('live', false));
    expect(isDirty('a')).toBe(false);
  });
});
