import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.TEST_SUPABASE_URL;
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const service = process.env.TEST_SUPABASE_SERVICE_KEY;
if (!url || !anon || !service) throw new Error('Missing TEST_SUPABASE_* vars; see docs/cloud-setup.md');

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: bypasses RLS. */
export const admin = createClient(url, service, opts);

/** A throwaway auth user. */
export type TestUser = { id: string; email: string; password: string };

const made: TestUser[] = [];

/** A unique throwaway email. */
export const email = () => `t-${randomUUID()}@example.test`;

/** Creates an auth user (confirmed unless told otherwise); removed by `cleanup()`. */
export async function makeUser(address = email(), { confirmed = true } = {}): Promise<TestUser> {
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email: address, password, email_confirm: confirmed });
  if (error) throw error;
  const user = { id: data.user.id, email: address, password };
  made.push(user);
  return user;
}

/** An anon-key client signed in as `user`. */
export async function as(user: TestUser): Promise<SupabaseClient> {
  const c = createClient(url!, anon!, opts);
  const { error } = await c.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  return c;
}

/** Deletes every user made since the last cleanup; their designs and templates cascade. */
export async function cleanup() {
  const users = made.splice(0);
  for (const u of users) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) throw error;
  }
}
