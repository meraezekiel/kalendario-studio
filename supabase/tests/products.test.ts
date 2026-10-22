import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, as, cleanup, makeUser, setAccount, type TestUser } from './helpers';

// The admin, an ordinary approved member, and a visitor who isn't signed in.
let member: TestUser, boss: TestUser;
const visitor = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const png = () => new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
const made: string[] = [];

beforeAll(async () => {
  [member, boss] = await Promise.all([makeUser(), makeUser()]);
  await setAccount(boss.id, { admin: true });
});
afterAll(async () => {
  if (made.length) await admin.from('products').delete().in('id', made);
  await cleanup();
});

async function addAsAdmin(fields: Record<string, unknown>) {
  const { data, error } = await (await as(boss)).from('products').insert(fields).select().single();
  expect(error).toBeNull();
  made.push(data!.id);
  return data as { id: string; price: number | null; price_checked_at: string | null; position: number };
}

describe('products', () => {
  it('lets the admin add one, and stamps the price date', async () => {
    const p = await addAsAdmin({ name: 'Stand', price: 249, url: 'https://s.shopee.ph/abc' });
    expect(Number(p.price)).toBe(249);
    expect(p.price_checked_at).not.toBeNull();
  });

  it('shows visitors and members the visible ones only', async () => {
    const shown = await addAsAdmin({ name: 'Shown', url: 'https://s.shopee.ph/a' });
    const hidden = await addAsAdmin({ name: 'Hidden', url: 'https://s.shopee.ph/b', hidden: true });
    for (const c of [visitor, await as(member)]) {
      const { data, error } = await c.from('products').select('id').in('id', [shown.id, hidden.id]);
      expect(error).toBeNull();
      expect(data).toEqual([{ id: shown.id }]);
    }
    const { data } = await (await as(boss)).from('products').select('id').in('id', [shown.id, hidden.id]);
    expect(data).toHaveLength(2);
  });

  it('lets no one but the admin add, change, reorder or delete', async () => {
    const p = await addAsAdmin({ name: 'Mine', price: 10, url: 'https://s.shopee.ph/c' });
    for (const c of [visitor, await as(member)]) {
      expect((await c.from('products').insert({ name: 'Sneaky' }).select()).error).not.toBeNull();
      await c.from('products').update({ price: 1 }).eq('id', p.id);
      await c.from('products').delete().eq('id', p.id);
      expect((await c.rpc('reorder_products', { ids: [p.id] })).error).not.toBeNull();
    }
    const { data } = await admin.from('products').select('price').eq('id', p.id).single();
    expect(Number(data!.price)).toBe(10);
  });

  it('refuses links that are not https', async () => {
    const { error } = await (await as(boss)).from('products').insert({ name: 'Bad', url: 'javascript:alert(1)' }).select();
    expect(error?.code).toBe('23514');
  });

  it('moves the price date only when the price changes', async () => {
    const c = await as(boss);
    const p = await addAsAdmin({ name: 'Paper', price: 99, url: 'https://s.shopee.ph/d' });
    await c.from('products').update({ price_checked_at: '2020-01-01T00:00:00Z' }).eq('id', p.id);
    const same = (await c.from('products').update({ name: 'Glossy paper' }).eq('id', p.id).select().single()).data!;
    expect(same.price_checked_at).toBe('2020-01-01T00:00:00+00:00');
    const moved = (await c.from('products').update({ price: 120 }).eq('id', p.id).select().single()).data!;
    expect(new Date(moved.price_checked_at).getFullYear()).toBeGreaterThan(2020);
    const cleared = (await c.from('products').update({ price: null }).eq('id', p.id).select().single()).data!;
    expect(cleared.price_checked_at).toBeNull();
  });

  it('saves the admin’s order', async () => {
    const a = await addAsAdmin({ name: 'A', position: 1 });
    const b = await addAsAdmin({ name: 'B', position: 2 });
    expect((await (await as(boss)).rpc('reorder_products', { ids: [b.id, a.id] })).error).toBeNull();
    const { data } = await admin.from('products').select('id, position').in('id', [a.id, b.id]).order('position');
    expect(data!.map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it('lets only the admin store pictures, and everyone see them', async () => {
    const path = `test-${crypto.randomUUID()}.png`;
    expect((await (await as(member)).storage.from('products').upload(path, png(), { contentType: 'image/png' })).error).not.toBeNull();
    expect((await visitor.storage.from('products').upload(path, png(), { contentType: 'image/png' })).error).not.toBeNull();
    const up = await (await as(boss)).storage.from('products').upload(path, png(), { contentType: 'image/png' });
    expect(up.error).toBeNull();
    const res = await fetch(visitor.storage.from('products').getPublicUrl(path).data.publicUrl);
    expect(res.ok).toBe(true);
    await (await as(member)).storage.from('products').remove([path]);
    expect((await admin.storage.from('products').list('', { search: path })).data).toHaveLength(1);
    expect((await (await as(boss)).storage.from('products').remove([path])).error).toBeNull();
    expect((await admin.storage.from('products').list('', { search: path })).data).toHaveLength(0);
  });
});
