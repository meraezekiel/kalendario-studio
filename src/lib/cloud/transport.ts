import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Moves a design's Yjs updates to and from the server log. */
export interface SyncTransport {
  load(): Promise<{ state: string; through: number; updates: { id: number; data: string }[] }>;
  push(data: string): Promise<{ id: number }>;
  subscribe(onUpdate: (u: { id: number; data: string; author: string }) => void, onStatus: (s: 'live' | 'offline') => void): () => void;
  compact(state: string, through: number): Promise<boolean>;
}

/** A failed cloud call, by cause. */
export class CloudError extends Error {
  constructor(public code: 'denied' | 'offline' | 'auth' | 'limit', message?: string) {
    super(message ?? code);
    this.name = 'CloudError';
  }
}

type ErrLike = { code?: unknown; message?: unknown; status?: unknown; name?: unknown };

/**
 * Classifies a Supabase/Postgres/network failure. Known causes become a CloudError; anything else
 * comes back as a plain Error (the sync engine treats those as transient and retries).
 */
export function toCloudError(e: unknown): Error {
  if (e instanceof CloudError) return e;
  const err = (e && typeof e === 'object' ? e : {}) as ErrLike;
  const code = typeof err.code === 'string' ? err.code : '';
  const message = typeof err.message === 'string' ? err.message : String(e);
  if (code === '42501' || /row-level security/i.test(message)) return new CloudError('denied', message);
  if (code === 'PGRST301' || code === 'PGRST303' || /\bJWT\b|JWSError/.test(message)) return new CloudError('auth', message);
  // supabase-js reports a failed fetch as status 0 with "TypeError: …" / "FetchError: …".
  if (e instanceof TypeError || err.status === 0 || /^(TypeError|FetchError|AbortError)\b/.test(message)) {
    return new CloudError('offline', message);
  }
  if (/limit reached/.test(message)) return new CloudError('limit', message);
  return e instanceof Error ? e : new Error(message, { cause: e });
}

/** Runs a Supabase call and throws its error, classified. */
async function run<T>(call: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let res: { data: T; error: unknown };
  try {
    res = await call;
  } catch (e) {
    throw toCloudError(e);
  }
  if (res.error) throw toCloudError(res.error);
  return res.data;
}

/** Sync transport over Supabase: RPCs for load/compact, a table insert per push, a private realtime channel. */
export class SupabaseTransport implements SyncTransport {
  private ch: RealtimeChannel | null = null;
  private pres: { key: string; onSync: (state: Record<string, unknown[]>) => void } | null = null;

  constructor(readonly designId: string, readonly userId: string, private client: SupabaseClient = supabase()) {}

  async load() {
    const rows = await run(this.client.rpc('load_design', { d: this.designId }));
    const row = (rows as { state: string; through: number | string; updates: { id: number | string; data: string }[] }[] | null)?.[0];
    // RLS hides designs the user can't see, so no row means no access (or no such design).
    if (!row) throw new CloudError('denied', 'design not found');
    return {
      state: row.state ?? '',
      through: Number(row.through),
      updates: (row.updates ?? []).map((u) => ({ id: Number(u.id), data: u.data })),
    };
  }

  async push(data: string) {
    const row = await run(this.client.from('design_updates').insert({ design_id: this.designId, data }).select('id').single());
    return { id: Number((row as { id: number | string }).id) };
  }

  async compact(state: string, through: number) {
    return (await run(this.client.rpc('compact_design', { d: this.designId, new_state: state, through }))) === true;
  }

  /**
   * Takes part in the design channel's presence as `key` (one per tab); call before `subscribe`. `onSync`
   * gets the whole presence state whenever anyone joins, leaves or changes what they track.
   */
  presence(key: string, onSync: (state: Record<string, unknown[]>) => void): void {
    this.pres = { key, onSync };
  }

  subscribe(onUpdate: (u: { id: number; data: string; author: string }) => void, onStatus: (s: 'live' | 'offline') => void) {
    const pres = this.pres;
    const ch = this.client.channel(`design:${this.designId}`, { config: { private: true, ...(pres ? { presence: { key: pres.key } } : {}) } });
    this.ch = ch;
    let closed = false;
    if (pres) {
      ch.on('presence', { event: 'sync' }, () => {
        if (!closed) pres.onSync(ch.presenceState() as Record<string, unknown[]>);
      });
    }
    // SUBSCRIBED arrives before the server is listening to Postgres; an insert in that gap would be
    // missed, and the engine reloads on 'live', so 'live' waits for the "Subscribed to PostgreSQL" notice.
    let joined = false;
    let listening = false;
    let fallback: ReturnType<typeof setTimeout> | null = null;
    let reported: 'live' | 'offline' | null = null;
    const report = (s: 'live' | 'offline') => {
      if (closed || s === reported) return;
      reported = s;
      onStatus(s);
    };
    // An update we couldn't deliver: blip offline -> live, so the engine reloads it via load().
    // When not live yet, the coming 'live' reloads anyway.
    const resync = () => {
      if (reported !== 'live') return;
      report('offline');
      report('live');
    };
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'design_updates', filter: `design_id=eq.${this.designId}` }, (p) => {
      if (closed) return;
      // Realtime drops columns from oversized records (~1 MB), so `data` may be missing.
      const r = (p?.new ?? {}) as { id?: unknown; data?: unknown; author?: unknown };
      const id = Number(r.id);
      if (typeof r.data !== 'string' || r.id == null || !Number.isFinite(id)) return resync();
      try {
        onUpdate({ id, data: r.data, author: typeof r.author === 'string' ? r.author : '' });
      } catch {
        resync();
      }
    });
    const settle = () => {
      if (joined && listening) {
        if (fallback) clearTimeout(fallback);
        fallback = null;
        report('live');
      }
    };
    ch.on('system', {}, (p: { extension?: string; status?: string }) => {
      if (p?.extension !== 'postgres_changes') return;
      listening = p.status === 'ok';
      if (listening) settle();
      else report('offline');
    });
    // Private channels authorize with the user's JWT; make sure realtime has the current one before joining.
    void Promise.resolve()
      .then(() => this.client.realtime.setAuth())
      .catch(() => {})
      .then(() => {
        if (closed) return;
        ch.subscribe((status) => {
          if (closed) return;
          if (status === 'SUBSCRIBED') {
            joined = true;
            settle();
            // In case this server never sends the notice, go live anyway after a while.
            fallback ??= setTimeout(() => { fallback = null; listening = true; settle(); }, 5000);
          } else {
            // CHANNEL_ERROR, TIMED_OUT, CLOSED; realtime-js keeps rejoining.
            joined = listening = false;
            if (fallback) clearTimeout(fallback);
            fallback = null;
            report('offline');
          }
        });
      });
    return () => {
      if (closed) return;
      closed = true;
      if (fallback) clearTimeout(fallback);
      if (this.ch === ch) this.ch = null;
      void this.client.removeChannel(ch);
    };
  }

  /** The live design channel, for presence; null when not subscribed. */
  channel(): RealtimeChannel | null {
    return this.ch;
  }
}
