import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, as, cleanup, makeUser, setAccount, type TestUser } from './helpers';

let member: TestUser, boss: TestUser;
const visitor = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

beforeAll(async () => {
  [member, boss] = await Promise.all([makeUser(), makeUser()]);
  await setAccount(boss.id, { admin: true });
});
afterAll(cleanup);

/** Today's count of `event`, read with the service key. */
async function today(event: string): Promise<number> {
  const { data } = await admin.from('stats').select('n').eq('event', event).order('day', { ascending: false }).limit(1);
  return data?.[0]?.n ?? 0;
}

describe('stats', () => {
  it('lets anyone add one to a known event', async () => {
    const before = await today('print_kit_open');
    expect((await visitor.rpc('count_event', { e: 'print_kit_open' })).error).toBeNull();
    expect((await (await as(member)).rpc('count_event', { e: 'print_kit_open' })).error).toBeNull();
    expect(await today('print_kit_open')).toBe(before + 2);
  });

  it('ignores made-up events', async () => {
    expect((await visitor.rpc('count_event', { e: 'spam-' + Date.now() })).error).toBeNull();
    const { data } = await admin.from('stats').select('event').like('event', 'spam-%');
    expect(data).toEqual([]);
  });

  it('lets only the admin read the numbers, and no one write them directly', async () => {
    await visitor.rpc('count_event', { e: 'open' });
    expect((await visitor.from('stats').select('n')).data).toEqual([]);
    expect((await (await as(member)).from('stats').select('n')).data).toEqual([]);
    const own = await (await as(boss)).from('stats').select('event').eq('event', 'open');
    expect(own.data!.length).toBeGreaterThan(0);
    const before = await today('open');
    await visitor.from('stats').insert({ day: '2026-01-01', event: 'open', n: 999 });
    await (await as(member)).from('stats').update({ n: 999 }).eq('event', 'open');
    expect(await today('open')).toBe(before);
  });
});
