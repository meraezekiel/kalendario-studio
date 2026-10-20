import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { CloudError, SupabaseTransport, toCloudError } from './transport';

/** A fake client whose one channel lets the test fire realtime events by hand. */
function fakeClient() {
  const handlers: Record<string, (p: unknown) => void> = {};
  let status: (s: string) => void = () => {};
  const ch = {
    on(type: string, _f: unknown, cb: (p: unknown) => void) { handlers[type] = cb; return ch; },
    subscribe(cb: (s: string) => void) { status = cb; return ch; },
  };
  const client = {
    channel: () => ch,
    getChannels: () => [],
    realtime: { setAuth: async () => {} },
    removeChannel: async () => 'ok',
  } as unknown as SupabaseClient;
  const goLive = async () => {
    await new Promise((r) => setTimeout(r, 0)); // subscribe() happens after setAuth resolves
    status('SUBSCRIBED');
    handlers.system({ extension: 'postgres_changes', status: 'ok' });
  };
  return { client, goLive, insert: (row: unknown) => handlers.postgres_changes({ new: row }), presence: () => handlers.presence({}) };
}

describe('SupabaseTransport.subscribe', () => {
  async function live(onUpdate: (u: { id: number; data: string; author: string }) => void = () => {}) {
    const f = fakeClient();
    const statuses: string[] = [];
    const updates: unknown[] = [];
    new SupabaseTransport('d', 'me', f.client).subscribe((u) => { updates.push(u); onUpdate(u); }, (s) => statuses.push(s));
    await f.goLive();
    expect(statuses).toEqual(['live']);
    return { ...f, statuses, updates };
  }

  it('delivers a well-formed insert', async () => {
    const t = await live();
    t.insert({ id: 7, data: 'AA==', author: 'u' });
    expect(t.updates).toEqual([{ id: 7, data: 'AA==', author: 'u' }]);
    expect(t.statuses).toEqual(['live']);
  });

  it('resyncs (offline then live) when realtime drops data from an oversized record', async () => {
    const t = await live();
    expect(() => t.insert({ id: 8, author: 'u' })).not.toThrow();
    expect(() => t.insert({ data: 'AA==', author: 'u' })).not.toThrow();
    expect(t.updates).toEqual([]);
    expect(t.statuses).toEqual(['live', 'offline', 'live', 'offline', 'live']);
  });

  it('resyncs instead of throwing when applying an update fails', async () => {
    const t = await live(vi.fn(() => { throw new Error('bad update'); }));
    expect(() => t.insert({ id: 9, data: 'AA==', author: 'u' })).not.toThrow();
    expect(t.statuses).toEqual(['live', 'offline', 'live']);
  });

  it('swaps in a fresh channel after the server refuses the join, and goes live on it', async () => {
    vi.useFakeTimers();
    try {
      // Each channel() call makes a new channel; removed ones leave the list, like realtime-js.
      const made: { status: (s: string) => void; system?: (p: unknown) => void; topic: string }[] = [];
      const listed = new Set<unknown>();
      const client = {
        channel: () => {
          const c = {
            topic: 'realtime:design:d',
            status: (_s: string) => {},
            system: undefined as ((p: unknown) => void) | undefined,
            on(type: string, _f: unknown, cb: (p: unknown) => void) { if (type === 'system') c.system = cb; return c; },
            subscribe(cb: (s: string) => void) { c.status = cb; return c; },
          };
          made.push(c);
          listed.add(c);
          return c;
        },
        getChannels: () => [...listed],
        realtime: { setAuth: async () => {} },
        removeChannel: async (c: unknown) => { listed.delete(c); return 'ok'; },
      } as unknown as SupabaseClient;
      const statuses: string[] = [];
      const stop = new SupabaseTransport('d', 'me', client).subscribe(() => {}, (s) => statuses.push(s));
      await vi.advanceTimersByTimeAsync(0);
      made[0].status('CHANNEL_ERROR');
      expect(statuses).toEqual(['offline']);
      expect(made).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(made).toHaveLength(2);
      expect(listed.has(made[0])).toBe(false);
      made[1].status('SUBSCRIBED');
      made[1].system!({ extension: 'postgres_changes', status: 'ok' });
      expect(statuses).toEqual(['offline', 'live']);
      // A late event from the failed channel changes nothing.
      made[0].status('CLOSED');
      expect(statuses).toEqual(['offline', 'live']);
      stop();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(made).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps retrying with growing waits while the server keeps refusing', async () => {
    vi.useFakeTimers();
    try {
      const made: { status: (s: string) => void }[] = [];
      const client = {
        channel: () => {
          const c = { status: (_s: string) => {}, on() { return c; }, subscribe(cb: (s: string) => void) { c.status = cb; return c; } };
          made.push(c);
          return c;
        },
        getChannels: () => [],
        realtime: { setAuth: async () => {} },
        removeChannel: async () => 'ok',
      } as unknown as SupabaseClient;
      const stop = new SupabaseTransport('d', 'me', client).subscribe(() => {}, () => {});
      await vi.advanceTimersByTimeAsync(0);
      made[0].status('CHANNEL_ERROR');
      await vi.advanceTimersByTimeAsync(1000);
      expect(made).toHaveLength(2);
      made[1].status('CHANNEL_ERROR');
      await vi.advanceTimersByTimeAsync(1999);
      expect(made).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(made).toHaveLength(3);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('joins presence on the same channel with the given key and reports the state', async () => {
    const f = fakeClient();
    const state = { k2: [{ uid: 'u2' }] };
    let opts: unknown;
    const ch = f.client.channel('x') as unknown as Record<string, unknown>;
    ch.presenceState = () => state;
    (f.client as unknown as { channel: unknown }).channel = (_n: string, o: unknown) => { opts = o; return ch; };
    const t = new SupabaseTransport('d', 'me', f.client);
    const seen: unknown[] = [];
    t.presence('k1', (s) => seen.push(s));
    t.subscribe(() => {}, () => {});
    expect(opts).toEqual({ config: { private: true, presence: { key: 'k1' } } });
    expect(t.channel()).toBe(ch);
    f.presence();
    expect(seen).toEqual([state]);
  });
});

describe('toCloudError', () => {
  const code = (e: unknown) => {
    const r = toCloudError(e);
    return r instanceof CloudError ? r.code : null;
  };

  it('maps RLS and permission errors to denied', () => {
    expect(code({ code: '42501', message: 'new row violates row-level security policy for table "design_updates"' })).toBe('denied');
    expect(code({ code: '', message: 'new row violates row-level security policy' })).toBe('denied');
    expect(code({ code: '42501', message: 'not allowed' })).toBe('denied');
  });

  it('maps an expired or bad JWT to auth', () => {
    expect(code({ code: 'PGRST303', message: 'JWT expired' })).toBe('auth');
    expect(code({ code: 'PGRST301', message: 'JWSError JWSInvalidSignature' })).toBe('auth');
    expect(code({ code: '', message: 'JWT expired' })).toBe('auth');
  });

  it('maps network failures to offline', () => {
    expect(code(new TypeError('fetch failed'))).toBe('offline');
    expect(code({ code: '', message: 'TypeError: fetch failed', status: 0 })).toBe('offline');
    expect(code({ code: '', message: 'FetchError: network down' })).toBe('offline');
  });

  it('maps limit triggers to limit', () => {
    expect(code({ code: 'P0001', message: 'design limit reached' })).toBe('limit');
    expect(code({ code: 'P0001', message: 'photo storage limit reached' })).toBe('limit');
  });

  it('passes a CloudError through and leaves other errors as plain Errors', () => {
    const c = new CloudError('auth');
    expect(toCloudError(c)).toBe(c);
    const other = toCloudError({ code: '23505', message: 'duplicate key' });
    expect(other).not.toBeInstanceOf(CloudError);
    expect(other).toBeInstanceOf(Error);
    expect(other.message).toBe('duplicate key');
  });
});
