import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { admin, as, cleanup, makeUser, type TestUser } from './helpers';

// Account photo library: photos with no design, linked to the designs that use them.
let pool: Record<'o' | 'v' | 'e' | 's', TestUser>;
beforeAll(async () => {
  const [o, v, e, s] = await Promise.all([makeUser(), makeUser(), makeUser(), makeUser()]);
  pool = { o, v, e, s };
});
/** Library photos don't go with a design, so each test's are removed here (file, then row). */
const made: string[] = [];
afterEach(async () => {
  const ids = Object.values(pool).map((u) => u.id);
  const paths = made.splice(0);
  if (paths.length) await admin.storage.from('photos').remove(paths);
  await admin.from('photos').delete().in('owner', ids);
  const { error } = await admin.from('designs').delete().in('owner', ids);
  if (error) throw error;
});
afterAll(cleanup);

const png = (n: number) => new Blob([new Uint8Array(n).fill(7)], { type: 'image/png' });

async function newDesign(c: SupabaseClient) {
  const { data, error } = await c.from('designs').insert({ name: 'Test' }).select().single();
  if (error) throw error;
  return data as { id: string };
}

/** A library photo of `c`'s: the row (no design), then its file. */
async function libraryPhoto(c: SupabaseClient, uid: string, bytes = 100, hash: string | null = null) {
  const path = `lib/${uid}/${randomUUID()}.png`;
  const row = await c.from('photos').insert({ path, bytes, hash, w: 10, h: 10 });
  if (row.error) throw row.error;
  made.push(path);
  const up = await c.storage.from('photos').upload(path, png(bytes), { contentType: 'image/png' });
  if (up.error) throw up.error;
  return path;
}

async function cast() {
  const { o, v, e, s } = pool;
  const owner = await as(o);
  const design = await newDesign(owner);
  for (const [u, role] of [[v, 'viewer'], [e, 'editor']] as const) {
    const { error } = await owner.from('design_members').insert({ design_id: design.id, email: u.email, role });
    if (error) throw error;
  }
  const [viewer, editor, stranger] = await Promise.all([as(v), as(e), as(s)]);
  return { owner, viewer, editor, stranger, design };
}

describe('photo library', () => {
  it('a library photo is its owner\'s, counts once, and others see it only through a design that links it', async () => {
    const { owner, viewer, editor, stranger, design } = await cast();
    const path = await libraryPhoto(owner, pool.o.id, 100);
    const { data: row } = await admin.from('photos').select('owner, design_id, template_id').eq('path', path).single();
    expect(row).toEqual({ owner: pool.o.id, design_id: null, template_id: null });
    expect((await owner.rpc('photo_usage')).data).toBe(100);

    for (const c of [viewer, editor, stranger]) expect((await c.storage.from('photos').download(path)).error).not.toBeNull();
    expect((await owner.from('design_photos').insert({ design_id: design.id, path })).error).toBeNull();
    // A second design using it adds nothing to the space used.
    const other = await newDesign(owner);
    expect((await owner.from('design_photos').insert({ design_id: other.id, path })).error).toBeNull();
    expect((await owner.rpc('photo_usage')).data).toBe(100);

    for (const c of [viewer, editor]) expect((await c.storage.from('photos').download(path)).error).toBeNull();
    expect((await stranger.storage.from('photos').download(path)).error).not.toBeNull();
    expect((await stranger.from('photos').select('path').eq('path', path)).data ?? []).toHaveLength(0);
  });

  it("only a photo's owner can link it, and only to a design they own or edit", async () => {
    const { owner, viewer, editor, stranger, design } = await cast();
    const mine = await libraryPhoto(owner, pool.o.id);
    const theirs = await libraryPhoto(editor, pool.e.id);
    // The editor can link their own photo, but not the owner's (it isn't theirs to spend).
    expect((await editor.from('design_photos').insert({ design_id: design.id, path: theirs })).error).toBeNull();
    const own = await owner.from('design_photos').insert({ design_id: design.id, path: mine });
    expect(own.error).toBeNull();
    const other = await newDesign(owner);
    expect((await editor.from('design_photos').insert({ design_id: other.id, path: theirs })).error).not.toBeNull();
    const viewerPhoto = await libraryPhoto(viewer, pool.v.id);
    expect((await viewer.from('design_photos').insert({ design_id: design.id, path: viewerPhoto })).error).not.toBeNull();
    const strangerPhoto = await libraryPhoto(stranger, pool.s.id);
    expect((await stranger.from('design_photos').insert({ design_id: design.id, path: strangerPhoto })).error).not.toBeNull();
    // The editor's photo counts against the editor.
    expect((await editor.rpc('photo_usage')).data).toBe(100);
    expect((await owner.rpc('photo_usage')).data).toBe(100);
  });

  it('a photo a design uses cannot be deleted; once unlinked it can, and its space comes back', async () => {
    const { owner, editor, design } = await cast();
    const path = await libraryPhoto(owner, pool.o.id, 300);
    await owner.from('design_photos').insert({ design_id: design.id, path });

    const obj = await owner.storage.from('photos').remove([path]);
    expect(obj.data ?? []).toHaveLength(0);
    expect((await owner.storage.from('photos').download(path)).error).toBeNull();
    expect((await owner.from('photos').delete().eq('path', path).select()).data ?? []).toHaveLength(0);

    // An editor may unlink it from the design; the owner can then delete it.
    expect((await editor.from('design_photos').delete().eq('design_id', design.id).eq('path', path).select()).data).toHaveLength(1);
    expect((await editor.storage.from('photos').remove([path])).data ?? []).toHaveLength(0);
    expect((await owner.storage.from('photos').remove([path])).data).toHaveLength(1);
    expect((await owner.from('photos').delete().eq('path', path).select()).data).toHaveLength(1);
    expect((await owner.rpc('photo_usage')).data).toBe(0);
  });

  it('deleting a design keeps its photos in the library', async () => {
    const { owner, viewer, design } = await cast();
    const path = await libraryPhoto(owner, pool.o.id);
    await owner.from('design_photos').insert({ design_id: design.id, path });
    expect((await owner.from('designs').delete().eq('id', design.id).select()).data).toHaveLength(1);
    expect((await owner.storage.from('photos').download(path)).error).toBeNull();
    expect((await viewer.storage.from('photos').download(path)).error).not.toBeNull();
    const { count } = await admin.from('design_photos').select('*', { count: 'exact', head: true }).eq('path', path);
    expect(count).toBe(0);
  });

  it('the same file (hash) is stored once per account', async () => {
    const { owner, editor } = await cast();
    const hash = randomUUID();
    await libraryPhoto(owner, pool.o.id, 100, hash);
    const again = await owner.from('photos').insert({ path: `lib/${pool.o.id}/${randomUUID()}.png`, bytes: 100, hash });
    expect(again.error?.code).toBe('23505');
    // Another account may have the same file.
    await libraryPhoto(editor, pool.e.id, 100, hash);
    const found = await owner.from('photos').select('path').eq('owner', pool.o.id).eq('hash', hash);
    expect(found.data).toHaveLength(1);
  });
});
