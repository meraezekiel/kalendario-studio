import { supabase } from './supabase';
import { toCloudError } from './transport';

/**
 * Where an account stands: 'approved' (and whether it's the admin), 'pending' (new, waiting for the admin),
 * 'deactivated' (the admin turned it off), or 'unknown' when it couldn't be read (offline, or the approval
 * migration isn't on this project yet): then the app lets the session be, and the database still refuses it.
 */
export type Approval = { state: 'approved'; admin: boolean } | { state: 'pending' } | { state: 'deactivated' } | { state: 'unknown' };

const WAIT_MS = 5000;

export async function approval(userId: string): Promise<Approval> {
  try {
    const read = supabase().from('accounts').select('approved_at, admin, deactivated_at').eq('user_id', userId).maybeSingle();
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), WAIT_MS));
    const res = await Promise.race([read, timeout]);
    if (!res || res.error) return { state: 'unknown' };
    const row = res.data as { approved_at: string | null; admin: boolean; deactivated_at: string | null } | null;
    if (row?.approved_at) return { state: 'approved', admin: row.admin };
    return row?.deactivated_at ? { state: 'deactivated' } : { state: 'pending' };
  } catch {
    return { state: 'unknown' };
  }
}

/** One account on the admin dashboard. */
export type AccountRow = {
  user_id: string;
  email: string;
  name: string;
  admin: boolean;
  approved_at: string | null;
  deactivated_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  designs: number;
  photo_bytes: number;
};

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

/** Admin only: every account, waiting ones first. */
export async function listAccounts(): Promise<AccountRow[]> {
  return ((await run(supabase().rpc('admin_accounts'))) ?? []) as AccountRow[];
}

/** Lets a waiting or deactivated account in. */
export async function activateAccount(userId: string): Promise<void> {
  await run(supabase().rpc('approve_account', { u: userId }));
}

/** Turns an account off and signs it out everywhere; its designs and photos stay. */
export async function deactivateAccount(userId: string): Promise<void> {
  await run(supabase().rpc('deactivate_account', { u: userId }));
}

/** Deletes a new account that was never let in; that email can sign up again. */
export async function declineAccount(userId: string): Promise<void> {
  await run(supabase().rpc('decline_account', { u: userId }));
}
