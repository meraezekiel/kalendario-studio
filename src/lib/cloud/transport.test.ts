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
    realtime: { setAuth: async () => {} },
    removeChannel: async () => 'ok',
  } as unknown as SupabaseClient;
  const goLive = async () => {
    await new Promise((r) => setTimeout(r, 0)); // subscribe() happens after setAuth resolves
    status('SUBSCRIBED');
    handlers.system({ extension: 'postgres_changes', status: 'ok' });
  };
  return { client, goLive, insert: (row: unknown) => handlers.postgres_changes({ new: row }) };
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
