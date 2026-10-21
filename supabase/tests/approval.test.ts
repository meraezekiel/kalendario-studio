import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, as, cleanup, email, makeUser, setAccount, type TestUser } from './helpers';

// A waiting account, an approved one, and the admin.
let pending: TestUser, member: TestUser, boss: TestUser;
beforeAll(async () => {
  [pending, member, boss] = await Promise.all([makeUser(email(), { approved: false }), makeUser(), makeUser()]);
  await setAccount(boss.id, { admin: true });
});
afterAll(cleanup);

async function account(id: string) {
  const { data, error } = await admin.from('accounts').select('approved_at, admin').eq('user_id', id).maybeSingle();
  if (error) throw error;
  return data as { approved_at: string | null; admin: boolean } | null;
}

describe('sign-up approval', () => {
  it('gives every new user a waiting row', async () => {
    const u = await makeUser(email(), { approved: false });
    expect(await account(u.id)).toEqual({ approved_at: null, admin: false });
  });

  it('lets a waiting user see only their own row, and store nothing', async () => {
    const c = await as(pending);
    const own = await c.from('accounts').select('user_id, approved_at');
    expect(own.error).toBeNull();
    expect(own.data).toEqual([{ user_id: pending.id, approved_at: null }]);

    const d = await c.from('designs').insert({ name: 'Sneaky' }).select();
    expect(d.error?.code).toBe('42501');
    const t = await c.from('templates').insert({ name: 'Sneaky', data: {} }).select();
    expect(t.error?.code).toBe('42501');
    const up = await c.storage.from('photos').upload(`${randomUUID()}/x.jpg`, new Blob([new Uint8Array(10)], { type: 'image/jpeg' }));
    expect(up.error).not.toBeNull();
  });

  it('hides designs shared with a waiting user until they are approved', async () => {
    const owner = await as(member);
    const { data: d, error } = await owner.from('designs').insert({ name: 'Shared' }).select('id').single();
    expect(error).toBeNull();
    expect((await owner.from('design_members').insert({ design_id: d!.id, email: pending.email, role: 'editor' })).error).toBeNull();
    const c = await as(pending);
    expect((await c.from('designs').select('id').eq('id', d!.id)).data).toEqual([]);
    await setAccount(pending.id, { approved_at: new Date().toISOString() });
    expect((await c.from('designs').select('id').eq('id', d!.id)).data).toEqual([{ id: d!.id }]);
    await setAccount(pending.id, { approved_at: null });
  });

  it('lets no one change their own approval', async () => {
    const c = await as(pending);
    await c.from('accounts').update({ approved_at: new Date().toISOString(), admin: true }).eq('user_id', pending.id);
    expect(await account(pending.id)).toEqual({ approved_at: null, admin: false });
    expect((await c.rpc('approve_account', { u: pending.id })).error?.code).toBe('42501');
    expect((await (await as(member)).rpc('approve_account', { u: pending.id })).error?.code).toBe('42501');
    expect(await account(pending.id)).toMatchObject({ approved_at: null });
  });

  it('shows the admin everyone waiting, and approves them', async () => {
    const c = await as(boss);
    const { data, error } = await c.from('accounts').select('user_id, email').is('approved_at', null);
    expect(error).toBeNull();
    expect(data).toContainEqual({ user_id: pending.id, email: pending.email });
    // Other users only ever see their own row.
    expect((await (await as(member)).from('accounts').select('user_id')).data).toEqual([{ user_id: member.id }]);

    expect((await c.rpc('approve_account', { u: pending.id })).error).toBeNull();
    expect((await account(pending.id))?.approved_at).not.toBeNull();
    const d = await (await as(pending)).from('designs').insert({ name: 'Now allowed' }).select('id').single();
    expect(d.error).toBeNull();
  });

  it('lets the admin decline a waiting account, but never an approved one', async () => {
    const waiting = await makeUser(email(), { approved: false });
    const c = await as(boss);
    expect((await (await as(member)).rpc('decline_account', { u: waiting.id })).error?.code).toBe('42501');
    expect((await c.rpc('decline_account', { u: member.id })).error).toBeNull();
    expect((await admin.auth.admin.getUserById(member.id)).data.user).not.toBeNull();

    expect((await c.rpc('decline_account', { u: waiting.id })).error).toBeNull();
    expect((await admin.auth.admin.getUserById(waiting.id)).data.user).toBeNull();
    expect(await account(waiting.id)).toBeNull();
  });

  it('lists every account for the admin only, with designs and photo space', async () => {
    const c = await as(boss);
    const { data, error } = await c.rpc('admin_accounts');
    expect(error).toBeNull();
    const rows = data as { user_id: string; email: string; admin: boolean; designs: number; photo_bytes: number }[];
    expect(rows.find((r) => r.user_id === boss.id)).toMatchObject({ email: boss.email, admin: true });
    expect(rows.find((r) => r.user_id === member.id)?.designs).toBeGreaterThanOrEqual(1);
    expect(rows.find((r) => r.user_id === member.id)?.photo_bytes).toBe(0);
    expect((await (await as(member)).rpc('admin_accounts')).error?.code).toBe('42501');
  });

  it('deactivates an account: signed out, data kept but refused, and it can be activated again', async () => {
    const u = await makeUser();
    const uc = await as(u);
    const { data: d } = await uc.from('designs').insert({ name: 'Keep me' }).select('id').single();
    const c = await as(boss);
    expect((await c.rpc('deactivate_account', { u: boss.id })).error).toBeNull();
    expect(await account(boss.id)).toMatchObject({ admin: true });
    expect((await account(boss.id))?.approved_at).not.toBeNull();

    expect((await c.rpc('deactivate_account', { u: u.id })).error).toBeNull();
    expect((await account(u.id))?.approved_at).toBeNull();
    expect((await uc.from('designs').select('id').eq('id', d!.id)).data).toEqual([]);
    // Every session ended: the refresh token no longer works.
    expect((await uc.auth.refreshSession()).error).not.toBeNull();
    // Declining would delete its designs, so it isn't allowed for a deactivated account.
    expect((await c.rpc('decline_account', { u: u.id })).error).toBeNull();
    expect((await admin.auth.admin.getUserById(u.id)).data.user).not.toBeNull();

    expect((await c.rpc('approve_account', { u: u.id })).error).toBeNull();
    const again = await admin.from('designs').select('id').eq('owner', u.id);
    expect(again.data).toEqual([{ id: d!.id }]);
    expect((await account(u.id))?.approved_at).not.toBeNull();
  });
});
