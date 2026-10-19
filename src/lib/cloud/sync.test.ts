import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { TEMPLATES } from '../calendar/templates';
import type { CalendarDoc } from '../calendar/types';
import { DesignSync, REMOTE, type SyncStatus } from './sync';
import { CloudError, type SyncTransport } from './transport';
import { fromB64, readDoc, type SharedDoc, toB64, writeDoc } from './ydoc';

type Update = { id: number; data: string; author: string };

/** The server: a compacted state plus a log of updates, fanned out to subscribers. */
class Server {
  state = '';
  through = 0;
  updates: Update[] = [];
  nextId = 1;
  subs = new Set<(u: Update) => void>();

  constructor(doc?: CalendarDoc) {
    if (!doc) return;
    const y = new Y.Doc();
    writeDoc(y, doc);
    this.state = toB64(Y.encodeStateAsUpdate(y));
  }

  /** Everything the server holds, as one Y.Doc. */
  doc() {
    const y = new Y.Doc();
    if (this.state) Y.applyUpdate(y, fromB64(this.state));
    for (const u of this.updates) Y.applyUpdate(y, fromB64(u.data));
    return readDoc(y);
  }
}

/** One client's connection to the server; `fail` makes every call throw that CloudError code. */
class InMemoryTransport implements SyncTransport {
  fail: CloudError['code'] | null = null;
  pushes = 0;
  attempts = 0;
  compactDelay = 0;
  constructor(private s: Server, private author = 'u1') {}

  private check() {
    if (this.fail) throw new CloudError(this.fail);
  }

  async load() {
    this.check();
    return { state: this.s.state, through: this.s.through, updates: this.s.updates.map(({ id, data }) => ({ id, data })) };
  }

  async push(data: string) {
    this.attempts++;
    this.check();
    this.pushes++;
    const u = { id: this.s.nextId++, data, author: this.author };
    this.s.updates.push(u);
    // Realtime delivers a moment after the insert returns.
    setTimeout(() => this.s.subs.forEach((f) => f(u)), 0);
    return { id: u.id };
  }

  subscribe(onUpdate: (u: Update) => void, onStatus: (s: 'live' | 'offline') => void) {
    this.s.subs.add(onUpdate);
    onStatus('live');
    return () => { this.s.subs.delete(onUpdate); };
  }

  async compact(state: string, through: number) {
    this.check();
    await new Promise((r) => setTimeout(r, this.compactDelay));
    if (this.s.through >= through) return false; // like the server: only if compacted_through < through
    this.s.state = state;
    this.s.through = through;
    this.s.updates = this.s.updates.filter((u) => u.id > through);
    return true;
  }
}

/** A local store standing in for y-indexeddb. */
const memPersist = () => {
  const store: { data: Uint8Array | null } = { data: null };
  const persist = (y: Y.Doc) => {
    if (store.data) Y.applyUpdate(y, store.data, 'persist');
    const save = () => { store.data = Y.encodeStateAsUpdate(y); };
    y.on('update', save);
    return { whenSynced: Promise.resolve(), clearData: async () => { store.data = null; }, destroy: () => y.off('update', save) };
  };
  return { store, persist };
};

const mkDoc = (): CalendarDoc => ({ v: 3, year: 2027, holidays: true, cur: 0, assets: {}, tray: [], pages: TEMPLATES.pastel.make() });
const withCur = (d: SharedDoc | null): CalendarDoc => ({ ...d!, cur: 0 });
const moved = (doc: CalendarDoc, el: number, x: number): CalendarDoc => {
  const n: CalendarDoc = JSON.parse(JSON.stringify(doc));
  n.pages[0].els[el].x = x;
  return n;
};
const tick = (ms = 1000) => vi.advanceTimersByTimeAsync(ms);

describe('DesignSync', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('two engines converge on concurrent edits to different elements', async () => {
    const s = new Server(mkDoc());
    const a = new DesignSync('d1', new InMemoryTransport(s, 'u1'));
    const b = new DesignSync('d1', new InMemoryTransport(s, 'u2'));
    const docA = withCur(await a.start());
    const docB = withCur(await b.start());
    const remoteB: unknown[] = [];
    b.on('remote', (d) => remoteB.push(d));
    a.local(docA, moved(docA, 0, 111), true);
    b.local(docB, moved(docB, 1, 222), true);
    await tick();
    for (const e of [a, b]) {
      const d = readDoc(e.ydoc)!;
      expect(d.pages[0].els[0].x).toBe(111);
      expect(d.pages[0].els[1].x).toBe(222);
    }
    expect(remoteB.length).toBeGreaterThan(0);
    expect(s.doc()).toEqual(readDoc(a.ydoc));
    await a.stop();
    await b.stop();
  });

  it('edits made while transport is offline are pushed on next start', async () => {
    const s = new Server(mkDoc());
    const { persist } = memPersist();
    const t = new InMemoryTransport(s);
    const a = new DesignSync('d1', t, { persist });
    const doc = withCur(await a.start());
    t.fail = 'offline';
    const statuses: SyncStatus[] = [];
    a.on('status', (st) => statuses.push(st));
    a.local(doc, moved(doc, 0, 333), true);
    await tick();
    expect(statuses.at(-1)).toEqual({ state: 'offline', pending: true });
    await a.stop();
    expect(s.doc()!.pages[0].els[0].x).not.toBe(333);

    t.fail = null;
    const b = new DesignSync('d1', t, { persist });
    expect((await b.start())!.pages[0].els[0].x).toBe(333);
    await b.flush();
    expect(s.doc()!.pages[0].els[0].x).toBe(333);
    expect(b.status).toEqual({ state: 'live', pending: false });
    await b.stop();
  });

  it('starting offline returns the local copy and catches up when the transport is back', async () => {
    const s = new Server(mkDoc());
    const t = new InMemoryTransport(s);
    t.fail = 'offline';
    const a = new DesignSync('d1', t);
    expect(await a.start()).toBeNull();
    expect(a.status.state).toBe('offline');
    t.fail = null;
    await tick(5000);
    expect(a.status.state).toBe('live');
    expect(readDoc(a.ydoc)).toEqual(s.doc());
    await a.stop();
  });

  it('a 2-second drag (120 local diffs, 16ms apart, fake timers) produces at most 8 pushes', async () => {
    const s = new Server(mkDoc());
    const t = new InMemoryTransport(s);
    const a = new DesignSync('d1', t);
    let doc = withCur(await a.start());
    for (let i = 1; i <= 120; i++) {
      const next = moved(doc, 0, i);
      a.local(doc, next, true);
      doc = next;
      await tick(16);
    }
    await tick();
    expect(t.pushes).toBeGreaterThan(0);
    expect(t.pushes).toBeLessThanOrEqual(8);
    expect(s.doc()!.pages[0].els[0].x).toBe(120);
    await a.stop();
  });

  it('auth error keeps the batch and status becomes "auth"; after transport recovers, the batch is pushed', async () => {
    const s = new Server(mkDoc());
    const t = new InMemoryTransport(s);
    const a = new DesignSync('d1', t);
    const doc = withCur(await a.start());
    t.fail = 'auth';
    a.local(doc, moved(doc, 0, 444), true);
    await tick(300);
    expect(a.status).toEqual({ state: 'auth', pending: true });
    await tick(10_000);
    const tries = t.attempts;
    expect(tries).toBeGreaterThan(1);
    t.fail = null;
    await tick(30_000);
    expect(s.doc()!.pages[0].els[0].x).toBe(444);
    expect(a.status).toEqual({ state: 'live', pending: false });
    await a.stop();
  });

  it('denied stops retrying and status becomes "denied"', async () => {
    const s = new Server(mkDoc());
    const t = new InMemoryTransport(s);
    const a = new DesignSync('d1', t);
    const doc = withCur(await a.start());
    t.fail = 'denied';
    a.local(doc, moved(doc, 0, 555), true);
    await tick(300);
    expect(a.status.state).toBe('denied');
    const tries = t.attempts;
    await tick(120_000);
    expect(t.attempts).toBe(tries);
    expect(a.status).toEqual({ state: 'denied', pending: true });
    await a.stop();
  });

  it('compaction race: two engines compacting concurrently lose nothing', async () => {
    const s = new Server(mkDoc());
    const ta = new InMemoryTransport(s, 'u1');
    const tb = new InMemoryTransport(s, 'u2');
    // A's compactions land late, after B has compacted further.
    ta.compactDelay = 120;
    tb.compactDelay = 5;
    const a = new DesignSync('d1', ta, { compactEvery: 3, batchMs: 10 });
    const b = new DesignSync('d1', tb, { compactEvery: 3, batchMs: 10 });
    let da = withCur(await a.start());
    let db = withCur(await b.start());
    const spy = vi.spyOn(ta, 'compact');
    const spyB = vi.spyOn(tb, 'compact');
    for (let i = 1; i <= 15; i++) {
      const na = moved(da, 0, i);
      a.local(da, na, true);
      da = na;
      const nb = moved(db, 1, 100 + i);
      b.local(db, nb, true);
      db = nb;
      await tick(i % 2 ? 5 : 30);
    }
    await tick();
    expect(spy).toHaveBeenCalled();
    expect(spyB).toHaveBeenCalled();
    expect(s.through).toBeGreaterThan(0);
    const c = new DesignSync('d1', new InMemoryTransport(s, 'u3'));
    const d = (await c.start())!;
    expect(d.pages[0].els[0].x).toBe(15);
    expect(d.pages[0].els[1].x).toBe(115);
    for (const e of [a, b, c]) await e.stop();
  });

  it('own pushed updates are not re-applied as remote', async () => {
    const s = new Server(mkDoc());
    const a = new DesignSync('d1', new InMemoryTransport(s, 'u1'));
    const b = new DesignSync('d1', new InMemoryTransport(s, 'u2'));
    const doc = withCur(await a.start());
    const docB = withCur(await b.start());
    await tick();
    const remote = vi.fn();
    a.on('remote', remote);
    let applied = 0;
    a.ydoc.on('afterTransaction', (tr) => { if (tr.origin === REMOTE) applied++; });
    a.local(doc, moved(doc, 0, 666), true);
    await tick();
    expect(remote).not.toHaveBeenCalled();
    expect(applied).toBe(0);
    b.local(docB, moved(docB, 1, 777), true);
    await tick();
    expect(remote).toHaveBeenCalledTimes(1);
    expect(applied).toBe(1);
    await a.stop();
    await b.stop();
  });
});
