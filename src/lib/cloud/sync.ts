import * as Y from 'yjs';
import type { CalendarDoc } from '../calendar/types';
import { CloudError, type SyncTransport } from './transport';
import { applyDiff, fromB64, readDoc, type SharedDoc, toB64 } from './ydoc';

/** Origin of tracked (undoable) local edits. */
export const LOCAL = Symbol('local');
/** Origin of local edits that are not undoable. */
export const LOCAL_UNTRACKED = Symbol('local-untracked');
/** Origin of updates applied from the server. */
export const REMOTE = Symbol('remote');

/** Connection state, and whether local edits are still waiting to reach the server. */
export type SyncStatus = { state: 'connecting' | 'live' | 'offline' | 'auth' | 'denied'; pending: boolean };

type Persist = { whenSynced: Promise<unknown>; clearData(): Promise<void>; destroy(): void };
type Opts = { persist?: (y: Y.Doc) => Persist; batchMs?: number; compactEvery?: number };

const MAX_BACKOFF = 30_000;

/** True when applying `u` on top of `base` would change anything. */
function addsTo(base: Uint8Array | null, u: Uint8Array): boolean {
  const t = new Y.Doc();
  if (base) Y.applyUpdate(t, base);
  let changed = false;
  t.on('update', () => { changed = true; });
  Y.applyUpdate(t, u);
  t.destroy();
  return changed;
}

/** Keeps one design's Y.Doc in sync with the server log: batched pushes, offline replay, compaction. */
export class DesignSync {
  readonly ydoc = new Y.Doc();
  private persist: Persist | null;
  private batchMs: number;
  private compactEvery: number;
  private queue: Uint8Array[] = [];
  private inflight: Promise<void> | null = null;
  private connecting: Promise<number> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 0;
  private mine = new Set<number>();
  private seen = 0;
  private compacting = false;
  private ready = false;
  private started = false;
  private connected = false;
  private stopped = false;
  private subLive = false;
  private unsub: (() => void) | null = null;
  private st: SyncStatus = { state: 'connecting', pending: false };
  private remoteCbs = new Set<(doc: SharedDoc) => void>();
  private statusCbs = new Set<(s: SyncStatus) => void>();

  constructor(readonly designId: string, private t: SyncTransport, opts: Opts = {}) {
    this.batchMs = opts.batchMs ?? 300;
    this.compactEvery = opts.compactEvery ?? 200;
    this.ydoc.on('update', this.onYUpdate);
    this.ydoc.on('afterTransaction', this.onTransaction);
    this.persist = opts.persist?.(this.ydoc) ?? null;
  }

  /** Current status. */
  get status(): SyncStatus {
    return this.st;
  }

  /** Loads local and server copies, uploads offline edits, then follows the server. */
  async start(): Promise<SharedDoc | null> {
    if (this.persist) await this.persist.whenSynced;
    this.ready = true;
    try {
      await this.connect();
      this.setState('live');
    } catch (e) {
      this.fail(e);
    }
    if (this.st.state !== 'denied' && !this.stopped) this.unsub = this.t.subscribe(this.onRemote, this.onStatus);
    this.started = true;
    void this.send();
    return readDoc(this.ydoc);
  }

  /** Writes a local change into the Y.Doc; untracked changes are not undoable. */
  local(prev: CalendarDoc, next: CalendarDoc, tracked: boolean): void {
    applyDiff(this.ydoc, prev, next, tracked ? LOCAL : LOCAL_UNTRACKED);
  }

  /** Subscribes to remote changes or status changes; returns an unsubscribe function. */
  on(ev: 'remote', cb: (doc: SharedDoc) => void): () => void;
  on(ev: 'status', cb: (s: SyncStatus) => void): () => void;
  on(ev: 'remote' | 'status', cb: ((doc: SharedDoc) => void) | ((s: SyncStatus) => void)): () => void {
    const set = (ev === 'remote' ? this.remoteCbs : this.statusCbs) as Set<typeof cb>;
    set.add(cb);
    return () => { set.delete(cb); };
  }

  /** Tries to send pending edits now; resolves after the attempt, whether or not it succeeded. */
  async flush(): Promise<void> {
    if (this.st.state === 'denied') return;
    this.clearTimers();
    if (!this.connected) return this.resync();
    await this.inflight;
    await this.send();
  }

  /** Flushes once, then disconnects and releases local persistence. */
  async stop(): Promise<void> {
    if (this.stopped) return;
    await this.flush();
    this.stopped = true;
    this.clearTimers();
    this.unsub?.();
    this.unsub = null;
    this.ydoc.off('update', this.onYUpdate);
    this.ydoc.off('afterTransaction', this.onTransaction);
    this.persist?.destroy();
  }

  /** Deletes the local offline copy. */
  async clearLocal(): Promise<void> {
    await this.persist?.clearData();
  }

  private onYUpdate = (u: Uint8Array, origin: unknown) => {
    if (origin === REMOTE || !this.ready || this.stopped) return;
    this.queue.push(u);
    this.schedule(this.batchMs);
    this.emitStatus();
  };

  private onTransaction = (tr: Y.Transaction) => {
    if (!this.started || tr.origin === LOCAL || tr.origin === LOCAL_UNTRACKED || !tr.changed.size) return;
    const doc = readDoc(this.ydoc);
    if (doc) this.remoteCbs.forEach((cb) => cb(doc));
  };

  private onRemote = (u: { id: number; data: string }) => {
    if (this.stopped) return;
    if (this.mine.delete(u.id)) return;
    Y.applyUpdate(this.ydoc, fromB64(u.data), REMOTE);
    this.count();
  };

  private onStatus = (s: 'live' | 'offline') => {
    if (this.stopped) return;
    const was = this.subLive;
    this.subLive = s === 'live';
    if (s === 'offline') this.setState('offline');
    else if (!was) void this.resync(); // catch up on anything missed while not listening
  };

  /** Loads the server copy, merges it in and queues whatever the server lacks. Returns the highest server id. */
  private connect(): Promise<number> {
    this.connecting ??= (async () => {
      const { state, through, updates } = await this.t.load();
      const parts = [...(state ? [fromB64(state)] : []), ...updates.map((u) => fromB64(u.data))];
      const server = parts.length ? Y.mergeUpdates(parts) : null;
      if (server) Y.applyUpdate(this.ydoc, server, REMOTE);
      const diff = Y.encodeStateAsUpdate(this.ydoc, server ? Y.encodeStateVectorFromUpdate(server) : undefined);
      // The diff already holds every queued edit.
      this.queue = addsTo(server, diff) ? [diff] : [];
      this.connected = true;
      this.seen = updates.length;
      this.emitStatus();
      return updates.reduce((m, u) => Math.max(m, u.id), through);
    })().finally(() => { this.connecting = null; });
    return this.connecting;
  }

  private async resync(): Promise<void> {
    try {
      await this.connect();
      this.setState('live');
      this.backoff = 0;
      await this.send();
    } catch (e) {
      this.fail(e);
    }
  }

  private send(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.inflight || !this.connected || this.stopped || this.st.state === 'denied' || !this.queue.length) return this.inflight ?? Promise.resolve();
    const batch = this.queue.length === 1 ? this.queue[0] : Y.mergeUpdates(this.queue);
    this.queue = [];
    this.inflight = (async () => {
      try {
        const { id } = await this.t.push(toB64(batch));
        this.mine.add(id);
        this.backoff = 0;
        this.setState('live');
        this.count();
      } catch (e) {
        this.queue.unshift(batch);
        this.fail(e);
      } finally {
        this.inflight = null;
        if (this.queue.length) this.schedule(this.batchMs);
        this.emitStatus();
      }
    })();
    this.emitStatus();
    return this.inflight;
  }

  private schedule(ms: number) {
    if (this.timer || this.retryTimer || this.stopped || this.st.state === 'denied') return;
    this.timer = setTimeout(() => { this.timer = null; void this.send(); }, ms);
  }

  private fail(e: unknown) {
    const code = e instanceof CloudError ? e.code : 'offline';
    if (code === 'denied') {
      this.clearTimers();
      this.setState('denied');
      return;
    }
    this.setState(code === 'auth' ? 'auth' : 'offline');
    if (this.retryTimer || this.stopped) return;
    const delay = Math.min(MAX_BACKOFF, 1000 * 2 ** this.backoff++);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void (this.connected ? this.send() : this.resync());
    }, delay);
  }

  /** Counts an update into the log and compacts every `compactEvery`. */
  private count() {
    if (++this.seen < this.compactEvery || this.compacting) return;
    this.compacting = true;
    void (async () => {
      try {
        // Reload first, so the compacted state covers every update up to `through`, even ones realtime hasn't delivered.
        const through = await this.connect();
        await this.t.compact(toB64(Y.encodeStateAsUpdate(this.ydoc)), through);
        this.seen = 0;
        void this.send();
      } catch {
        // Fire and forget: the next count tries again.
      } finally {
        this.compacting = false;
      }
    })();
  }

  private clearTimers() {
    if (this.timer) clearTimeout(this.timer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.timer = this.retryTimer = null;
  }

  private setState(state: SyncStatus['state']) {
    if (this.st.state === 'denied') return;
    this.emitStatus(state);
  }

  private emitStatus(state = this.st.state) {
    const pending = this.queue.length > 0 || !!this.inflight;
    if (state === this.st.state && pending === this.st.pending) return;
    this.st = { state, pending };
    this.statusCbs.forEach((cb) => cb(this.st));
  }
}
