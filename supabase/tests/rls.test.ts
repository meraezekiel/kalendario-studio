import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { admin, as, cleanup, email, makeUser, type TestUser } from './helpers';

// One pool of throwaway users per run (signed in once each: auth rate-limits sign-ins);
// their designs, which cascade to members, updates and photos rows, are wiped after every test.
let pool: Record<'o' | 'v' | 'e' | 's', TestUser>;
beforeAll(async () => {
  const [o, v, e, s] = await Promise.all([makeUser(), makeUser(), makeUser(), makeUser()]);
  pool = { o, v, e, s };
});
afterEach(async () => {
  const { error } = await admin.from('designs').delete().in('owner', Object.values(pool).map((u) => u.id));
  if (error) throw error;
});
afterAll(cleanup);

const FILE_LIMIT = 5242880;

async function newDesign(c: SupabaseClient, name = 'Test') {
  const { data, error } = await c.from('designs').insert({ name }).select().single();
  if (error) throw error;
  return data as { id: string; owner: string; name: string };
}

async function share(c: SupabaseClient, designId: string, address: string, role: 'editor' | 'viewer') {
  const { data, error } = await c.from('design_members').insert({ design_id: designId, email: address, role }).select().single();
  if (error) throw error;
  return data as { user_id: string | null };
}

async function push(c: SupabaseClient, designId: string, data: string) {
  return c.from('design_updates').insert({ design_id: designId, data }).select('id').single();
}

async function count(table: string, column: string, value: string) {
  const { count: n, error } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
  if (error) throw error;
  return n;
}

/** Owner, a design, and clients for a viewer, an editor and a stranger. */
async function cast() {
  const { o, v, e, s } = pool;
  const owner = await as(o);
  const design = await newDesign(owner);
  await share(owner, design.id, v.email, 'viewer');
  await share(owner, design.id, e.email, 'editor');
  const [viewer, editor, stranger] = await Promise.all([as(v), as(e), as(s)]);
  return { owner, viewer, editor, stranger, design, users: { o, v, e, s } };
}

describe('designs RLS', () => {
  it("stranger cannot select, update or append to another user's design", async () => {
    const { owner, stranger, design } = await cast();
    await push(owner, design.id, 'u1');

    const sel = await stranger.from('designs').select().eq('id', design.id);
    expect(sel.data ?? []).toHaveLength(0);

    const upd = await stranger.from('designs').update({ state: 'x' }).eq('id', design.id).select();
    expect(upd.data ?? []).toHaveLength(0);

    const app = await push(stranger, design.id, 'evil');
    expect(app.error).not.toBeNull();

    const load = await stranger.rpc('load_design', { d: design.id });
    expect(load.data ?? []).toHaveLength(0);

    const comp = await stranger.rpc('compact_design', { d: design.id, new_state: 'x', through: 999 });
    expect(comp.error).not.toBeNull();

    const ups = await stranger.from('design_updates').select().eq('design_id', design.id);
    expect(ups.data ?? []).toHaveLength(0);

    const { data } = await admin.from('designs').select('state').eq('id', design.id).single();
    expect(data!.state).toBe('');
  });

  it('viewer can load_design but cannot insert design_updates', async () => {
    const { owner, viewer, design } = await cast();
    const u = await push(owner, design.id, 'u1');
    expect(u.error).toBeNull();

    const load = await viewer.rpc('load_design', { d: design.id });
    expect(load.error).toBeNull();
    expect(load.data).toEqual([{ state: '', through: 0, updates: [{ id: u.data!.id, data: 'u1' }] }]);

    const app = await push(viewer, design.id, 'u2');
    expect(app.error).not.toBeNull();

    const upd = await viewer.from('designs').update({ state: 'x' }).eq('id', design.id).select();
    expect(upd.data ?? []).toHaveLength(0);

    const comp = await viewer.rpc('compact_design', { d: design.id, new_state: 'x', through: u.data!.id });
    expect(comp.error).not.toBeNull();
  });

  it('editor can insert design_updates but cannot rename or delete', async () => {
    const { editor, design } = await cast();
    const app = await push(editor, design.id, 'u1');
    expect(app.error).toBeNull();

    const st = await editor.from('designs').update({ state: 's', thumb: 't' }).eq('id', design.id).select();
    expect(st.error).toBeNull();
    expect(st.data).toHaveLength(1);

    const ren = await editor.from('designs').update({ name: 'Mine now' }).eq('id', design.id).select();
    expect(ren.error).not.toBeNull();

    await editor.from('designs').delete().eq('id', design.id);
    const { data } = await admin.from('designs').select('name').eq('id', design.id).single();
    expect(data!.name).toBe('Test');

    const own = await editor.from('design_members').insert({ design_id: design.id, email: email(), role: 'editor' });
    expect(own.error).not.toBeNull();
  });

  it('owner can rename, share and delete; delete cascades members, updates, photos rows', async () => {
    const { owner, design } = await cast();
    const ren = await owner.from('designs').update({ name: 'Renamed' }).eq('id', design.id).select().single();
    expect(ren.error).toBeNull();
    expect(ren.data!.name).toBe('Renamed');

    await share(owner, design.id, email(), 'viewer');
    expect((await push(owner, design.id, 'u1')).error).toBeNull();
    const ph = await owner.from('photos').insert({ path: `${design.id}/${randomUUID()}.jpg`, design_id: design.id, bytes: 100 });
    expect(ph.error).toBeNull();

    expect(await count('design_members', 'design_id', design.id)).toBe(3);
    expect(await count('design_updates', 'design_id', design.id)).toBe(1);
    expect(await count('photos', 'design_id', design.id)).toBe(1);

    const del = await owner.from('designs').delete().eq('id', design.id).select();
    expect(del.data).toHaveLength(1);
    expect(await count('designs', 'id', design.id)).toBe(0);
    expect(await count('design_members', 'design_id', design.id)).toBe(0);
    expect(await count('design_updates', 'design_id', design.id)).toBe(0);
    expect(await count('photos', 'design_id', design.id)).toBe(0);
  });
});

describe('sharing', () => {
  it('share to existing confirmed user links user_id immediately', async () => {
    const { o, v: m } = pool;
    const owner = await as(o);
    const design = await newDesign(owner);
    const row = await share(owner, design.id, m.email, 'viewer');
    expect(row.user_id).toBe(m.id);

    const member = await as(m);
    const sel = await member.from('designs').select('id').eq('id', design.id);
    expect(sel.data).toHaveLength(1);
    const mine = await member.from('design_members').select('role').eq('design_id', design.id);
    expect(mine.data).toEqual([{ role: 'viewer' }]);
  });

  it('share to unknown email links when that email signs up and confirms, not before', async () => {
    const o = pool.o;
    const owner = await as(o);
    const design = await newDesign(owner);
    const address = email();
    const row = await share(owner, design.id, address, 'editor');
    expect(row.user_id).toBeNull();

    const m = await makeUser(address, { confirmed: false });
    const before = await admin.from('design_members').select('user_id').eq('design_id', design.id).eq('email', address).single();
    expect(before.data!.user_id).toBeNull();
    // With "Confirm email" on, an unconfirmed user cannot sign in at all; if it can, it still sees nothing.
    const early = await as(m).catch(() => null);
    if (early) expect((await early.from('designs').select('id').eq('id', design.id)).data ?? []).toHaveLength(0);

    const { error } = await admin.auth.admin.updateUserById(m.id, { email_confirm: true });
    expect(error).toBeNull();
    const after = await admin.from('design_members').select('user_id').eq('design_id', design.id).eq('email', address).single();
    expect(after.data!.user_id).toBe(m.id);

    const member = await as(m);
    const sel = await member.from('designs').select('id').eq('id', design.id);
    expect(sel.data).toHaveLength(1);
  });
});

describe('limits', () => {
  it('51st design is rejected with "design limit reached"', async () => {
    const owner = await as(pool.o);
    const rows = Array.from({ length: 50 }, (_, i) => ({ name: `D${i}` }));
    const ok = await owner.from('designs').insert(rows);
    expect(ok.error).toBeNull();
    const over = await owner.from('designs').insert({ name: 'D50' });
    expect(over.error?.message).toContain('design limit reached');
  });

  it('photos row over 50 MB total is rejected with "photo storage limit reached"', async () => {
    const owner = await as(pool.o);
    const design = await newDesign(owner);
    const photo = (bytes: number) => ({ path: `${design.id}/${randomUUID()}.jpg`, design_id: design.id, bytes });
    const ok = await owner.from('photos').insert(Array.from({ length: 10 }, () => photo(FILE_LIMIT)));
    expect(ok.error).toBeNull();
    const over = await owner.from('photos').insert(photo(1));
    expect(over.error?.message).toContain('photo storage limit reached');

    const usage = await owner.rpc('photo_usage');
    expect(usage.data).toBe(10 * FILE_LIMIT);
  });

  it('single photos row with bytes > 5242880 is rejected', async () => {
    const owner = await as(pool.o);
    const design = await newDesign(owner);
    const big = await owner.from('photos').insert({ path: `${design.id}/${randomUUID()}.jpg`, design_id: design.id, bytes: FILE_LIMIT + 1 });
    expect(big.error).not.toBeNull();
  });

  it("editor's photos count against the design owner's storage", async () => {
    const { editor, owner, design, users } = await cast();
    const ph = await editor.from('photos').insert({ path: `${design.id}/${randomUUID()}.jpg`, design_id: design.id, bytes: 1000 });
    expect(ph.error).toBeNull();
    const { data } = await admin.from('photos').select('owner').eq('design_id', design.id).single();
    expect(data!.owner).toBe(users.o.id);
    expect((await owner.rpc('photo_usage')).data).toBe(1000);
    expect((await editor.rpc('photo_usage')).data).toBe(0);
  });
});

describe('compaction', () => {
  it('compact_design ignores a stale compaction', async () => {
    const owner = await as(pool.o);
    const design = await newDesign(owner);
    const ids: number[] = [];
    for (const d of ['u1', 'u2', 'u3']) ids.push((await push(owner, design.id, d)).data!.id);

    const first = await owner.rpc('compact_design', { d: design.id, new_state: 's3', through: ids[2] });
    expect(first.data).toBe(true);
    const stale = await owner.rpc('compact_design', { d: design.id, new_state: 's2', through: ids[1] });
    expect(stale.data).toBe(false);

    const load = await owner.rpc('load_design', { d: design.id });
    expect(load.data).toEqual([{ state: 's3', through: ids[2], updates: [] }]);
    expect(await count('design_updates', 'design_id', design.id)).toBe(0);
  });

  it('compact_design refuses to skip past the newest update', async () => {
    const owner = await as(pool.o);
    const design = await newDesign(owner);
    const id = (await push(owner, design.id, 'u1')).data!.id;
    const res = await owner.rpc('compact_design', { d: design.id, new_state: 's', through: id + 1000 });
    expect(res.data).toBe(false);
  });

  it('clients cannot set compacted_through directly', async () => {
    const owner = await as(pool.o);
    const design = await newDesign(owner);
    const res = await owner.from('designs').update({ compacted_through: 99 }).eq('id', design.id);
    expect(res.error).not.toBeNull();
  });

  it('compaction racing parallel appends never drops an update', async () => {
    const o = pool.o;
    const writers = await Promise.all([as(o), as(o), as(o), as(o)]);
    const owner = writers[0];
    const design = await newDesign(owner);
    const sent = writers.flatMap((_, w) => Array.from({ length: 15 }, (_, i) => `w${w}-${i}`));

    // Engine-style compaction: load, fold state + loaded updates, compact through the newest loaded id.
    const items = (l: { state: string; updates: { data: string }[] }) =>
      [...(l.state ? l.state.split(',') : []), ...l.updates.map((u) => u.data)];
    async function compactOnce() {
      const { data, error } = await owner.rpc('load_design', { d: design.id });
      if (error) throw error;
      const l = data[0] as { state: string; through: number; updates: { id: number; data: string }[] };
      const through = l.updates.reduce((m, u) => Math.max(m, u.id), l.through);
      const res = await owner.rpc('compact_design', { d: design.id, new_state: items(l).join(','), through });
      if (res.error) throw res.error;
    }

    let writing = true;
    const appends = Promise.all(writers.map(async (c, w) => {
      for (let i = 0; i < 15; i++) {
        const r = await push(c, design.id, `w${w}-${i}`);
        if (r.error) throw r.error;
      }
    })).finally(() => { writing = false; });
    const compactions = (async () => { while (writing) await compactOnce(); })();
    await Promise.all([appends, compactions]);

    const { data } = await owner.rpc('load_design', { d: design.id });
    expect(new Set(items(data[0]))).toEqual(new Set(sent));
  });
});

describe('storage', () => {
  it('photo objects need a matching photos row the user can see', async () => {
    const { owner, viewer, stranger, design } = await cast();
    const path = `${design.id}/${randomUUID()}.png`;
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });

    const orphan = await owner.storage.from('photos').upload(`${design.id}/${randomUUID()}.png`, blob, { contentType: 'image/png' });
    expect(orphan.error).not.toBeNull();

    expect((await owner.from('photos').insert({ path, design_id: design.id, bytes: 4 })).error).toBeNull();
    const up = await owner.storage.from('photos').upload(path, blob, { contentType: 'image/png' });
    expect(up.error).toBeNull();
    try {
      const seen = await viewer.storage.from('photos').download(path);
      expect(seen.error).toBeNull();
      const hidden = await stranger.storage.from('photos').download(path);
      expect(hidden.error).not.toBeNull();
    } finally {
      await admin.storage.from('photos').remove([path]);
    }
  });

  const png = (n: number) => new Blob([new Uint8Array(n).fill(7)], { type: 'image/png' });

  /** Declares a photos row in `design`, uploads `size` bytes to it as `c`, returns the path. */
  async function addPhoto(c: SupabaseClient, designId: string, declared: number, size = declared) {
    const path = `${designId}/${randomUUID()}.png`;
    const row = await c.from('photos').insert({ path, design_id: designId, bytes: declared });
    if (row.error) throw row.error;
    const up = await c.storage.from('photos').upload(path, png(size), { contentType: 'image/png' });
    return { path, error: up.error };
  }

  it('owner deletes object then row and usage drops; editor can too; viewer and stranger cannot', async () => {
    const { owner, editor, viewer, stranger, design } = await cast();
    const a = await addPhoto(owner, design.id, 100);
    const b = await addPhoto(editor, design.id, 200);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect((await owner.rpc('photo_usage')).data).toBe(300);

    for (const c of [viewer, stranger]) {
      const obj = await c.storage.from('photos').remove([a.path]);
      expect(obj.data ?? []).toHaveLength(0);
      const row = await c.from('photos').delete().eq('path', a.path).select();
      expect(row.data ?? []).toHaveLength(0);
    }
    expect(await count('photos', 'design_id', design.id)).toBe(2);
    expect((await owner.storage.from('photos').download(a.path)).error).toBeNull();

    // The row can't go while its object exists, so the object's bytes stay counted.
    const early = await owner.from('photos').delete().eq('path', a.path).select();
    expect(early.data ?? []).toHaveLength(0);
    expect(await count('photos', 'path', a.path)).toBe(1);

    const objA = await owner.storage.from('photos').remove([a.path]);
    expect(objA.data).toHaveLength(1);
    expect((await owner.from('photos').delete().eq('path', a.path).select()).data).toHaveLength(1);
    expect((await owner.rpc('photo_usage')).data).toBe(200);

    const objB = await editor.storage.from('photos').remove([b.path]);
    expect(objB.data).toHaveLength(1);
    expect((await editor.from('photos').delete().eq('path', b.path).select()).data).toHaveLength(1);
    expect((await owner.rpc('photo_usage')).data).toBe(0);
  });

  it('a photos row cannot be inserted for a path whose object already exists', async () => {
    const { owner, editor, design } = await cast();
    const p = await addPhoto(owner, design.id, 100);
    expect(p.error).toBeNull();
    try {
      // Even with the original row gone (admin), re-inserting at that path is refused.
      expect((await admin.from('photos').delete().eq('path', p.path)).error).toBeNull();
      const again = await owner.from('photos').insert({ path: p.path, design_id: design.id, bytes: 1 });
      expect(again.error?.message).toContain('photo object already exists');
      const claim = await editor.from('photos').insert({ path: p.path, design_id: design.id, bytes: 1 });
      expect(claim.error).not.toBeNull();
      expect((await owner.storage.from('photos').download(p.path)).error).not.toBeNull();
    } finally {
      await admin.storage.from('photos').remove([p.path]);
    }
  });

  it('quota counts the uploaded size, not the declared bytes', async () => {
    const owner = await as(pool.o);
    const design = await newDesign(owner);
    const p = await addPhoto(owner, design.id, 1, 1000);
    try {
      expect(p.error).toBeNull();
      const { data } = await admin.from('photos').select('bytes').eq('path', p.path).single();
      expect(data!.bytes).toBe(1000);
      expect((await owner.rpc('photo_usage')).data).toBe(1000);
    } finally {
      await admin.storage.from('photos').remove([p.path]);
    }
  });

  it('an upload larger than declared is rejected when it would pass the cap', async () => {
    const owner = await as(pool.o);
    const design = await newDesign(owner);
    const rows = Array.from({ length: 10 }, (_, i) => ({
      path: `${design.id}/${randomUUID()}.jpg`, design_id: design.id, bytes: i === 9 ? FILE_LIMIT - 1000 : FILE_LIMIT,
    }));
    expect((await owner.from('photos').insert(rows)).error).toBeNull();
    const p = await addPhoto(owner, design.id, 1, 2000);
    try {
      expect(p.error).not.toBeNull();
      const { data } = await admin.from('photos').select('bytes').eq('path', p.path).single();
      expect(data!.bytes).toBe(1);
      expect((await admin.storage.from('photos').list(design.id)).data ?? []).toHaveLength(0);
    } finally {
      await admin.storage.from('photos').remove([p.path]);
    }
  });
});

describe('realtime', () => {
  function join(c: SupabaseClient, topic: string) {
    return new Promise<string>((resolve) => {
      const ch = c.channel(topic, { config: { private: true } });
      const done = (s: string) => { c.removeChannel(ch); resolve(s); };
      const timer = setTimeout(() => done('TIMEOUT'), 10_000);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') { clearTimeout(timer); done(status); }
      });
    });
  }

  it('private design channel admits members and refuses strangers', async () => {
    const { viewer, stranger, design } = await cast();
    await viewer.realtime.setAuth();
    await stranger.realtime.setAuth();
    expect(await join(viewer, `design:${design.id}`)).toBe('SUBSCRIBED');
    expect(await join(stranger, `design:${design.id}`)).toBe('CHANNEL_ERROR');
  });
});
