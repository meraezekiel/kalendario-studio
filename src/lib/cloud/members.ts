import type { CalendarDoc } from '../calendar/types';
import { importDoc } from './importDoc';
import { embedPhotos } from './photos';
import { supabase } from './supabase';
import { CloudError, toCloudError } from './transport';

/** What a person someone shared a design with may do. */
export type MemberRole = 'editor' | 'viewer';

/** Someone a design is shared with. `joined`: they have a confirmed account with this email. */
export type Member = { email: string; role: MemberRole; joined: boolean };

/** A share that can't be sent as typed (the message is shown as is). */
export class ShareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShareError';
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** An email address as stored: trimmed and lowercase (the database refuses any other). */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Runs a Supabase call and throws its error, classified. */
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

/** Everyone design `designId` is shared with (owner only), in the order they were added. */
export async function listMembers(designId: string): Promise<Member[]> {
  const rows = await run(
    supabase().from('design_members').select('email, role, user_id').eq('design_id', designId).order('created_at', { ascending: true }),
  );
  return ((rows ?? []) as { email: string; role: MemberRole; user_id: string | null }[]).map((r) => ({
    email: r.email,
    role: r.role,
    joined: r.user_id != null,
  }));
}

/**
 * Shares design `designId` with `email` (or changes their access when it's already shared with them).
 * Throws ShareError for an address that isn't one, or is the owner's own.
 */
export async function share(designId: string, email: string, role: MemberRole): Promise<void> {
  const e = normalizeEmail(email);
  if (!EMAIL.test(e)) throw new ShareError('Enter an email address, like name@example.com.');
  const { data } = await supabase().auth.getSession();
  if (normalizeEmail(data.session?.user.email ?? '') === e) throw new ShareError("That's you.");
  await run(supabase().from('design_members').upsert({ design_id: designId, email: e, role }, { onConflict: 'design_id,email' }));
}

/** Changes what `email` may do with design `designId`. */
export async function setRole(designId: string, email: string, role: MemberRole): Promise<void> {
  const rows = await run(supabase().from('design_members').update({ role }).eq('design_id', designId).eq('email', normalizeEmail(email)).select('email'));
  if (!(rows as unknown[] | null)?.length) throw new CloudError('denied', 'member not found');
}

/** Stops sharing design `designId` with `email`. */
export async function unshare(designId: string, email: string): Promise<void> {
  await run(supabase().from('design_members').delete().eq('design_id', designId).eq('email', normalizeEmail(email)));
}

/**
 * Makes `doc` (what's open of a design, even once access to it is gone) a new design of this
 * user's, named `<name> (copy)`, and returns its id. Photos are taken from this tab where it already
 * has them; any that can't be read become empty frames, counted through `onSkip`.
 */
export async function copyDesign(doc: CalendarDoc, name: string, onSkip?: (skipped: number) => void): Promise<string> {
  return importDoc(await embedPhotos(doc, true), `${name.trim() || 'Untitled calendar'} (copy)`, undefined, onSkip);
}
