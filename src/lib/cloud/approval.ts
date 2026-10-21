import { supabase } from './supabase';
import { toCloudError } from './transport';

/**
 * Where an account stands: 'approved' (and whether it's the admin), 'pending' (waiting for the admin),
 * or 'unknown' when it couldn't be read (offline, or the approval migration isn't on this project yet):
 * then the app lets the session be, and the database still refuses a waiting account.
 */
export type Approval = { state: 'approved'; admin: boolean } | { state: 'pending' } | { state: 'unknown' };

const WAIT_MS = 5000;

export async function approval(userId: string): Promise<Approval> {
  try {
    const read = supabase().from('accounts').select('approved_at, admin').eq('user_id', userId).maybeSingle();
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), WAIT_MS));
    const res = await Promise.race([read, timeout]);
    if (!res || res.error) return { state: 'unknown' };
    const row = res.data as { approved_at: string | null; admin: boolean } | null;
    return row?.approved_at ? { state: 'approved', admin: row.admin } : { state: 'pending' };
  } catch {
    return { state: 'unknown' };
  }
}

/** An account waiting for approval, oldest first. */
export type SignUpRequest = { user_id: string; email: string; name: string; created_at: string };

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

/** Admin only (RLS shows others just their own row, which is approved). */
export async function listRequests(): Promise<SignUpRequest[]> {
  const rows = await run(supabase().from('accounts').select('user_id, email, name, created_at').is('approved_at', null).order('created_at'));
  return (rows ?? []) as SignUpRequest[];
}

export async function approveAccount(userId: string): Promise<void> {
  await run(supabase().rpc('approve_account', { u: userId }));
}

/** Deletes the waiting account; that email can sign up again. */
export async function declineAccount(userId: string): Promise<void> {
  await run(supabase().rpc('decline_account', { u: userId }));
}
