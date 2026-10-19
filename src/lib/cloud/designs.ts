import * as Y from 'yjs';
import type { CalendarDoc } from '../calendar/types';
import { supabase } from './supabase';
import { CloudError, toCloudError } from './transport';
import { toB64, writeDoc } from './ydoc';

export type Role = 'owner' | 'editor' | 'viewer';

/** One design in My designs or Shared with me. */
export type DesignRow = { id: string; name: string; owner: string; role: Role; thumb: string | null; updated_at: string };

type Row = Omit<DesignRow, 'role'>;

const COLS = 'id, name, owner, thumb, updated_at';
const BUCKET = 'photos';

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

/** The signed-in user's id, from the stored session (no network). */
async function me(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new CloudError('auth', 'not signed in');
  return id;
}

/** Designs this user owns, most recently edited first. */
export async function listMine(): Promise<DesignRow[]> {
  const uid = await me();
  const rows = await run(supabase().from('designs').select(COLS).eq('owner', uid).order('updated_at', { ascending: false }));
  return ((rows ?? []) as Row[]).map((r) => ({ ...r, role: 'owner' }));
}

/** Designs other people shared with this user, most recently edited first. */
export async function listShared(): Promise<DesignRow[]> {
  const uid = await me();
  const rows = await run(supabase().from('design_members').select(`role, designs (${COLS})`).eq('user_id', uid));
  const byId = new Map<string, DesignRow>();
  for (const m of (rows ?? []) as unknown as { role: Role; designs: Row | Row[] | null }[]) {
    const d = Array.isArray(m.designs) ? m.designs[0] : m.designs;
    if (!d || d.owner === uid) continue;
    const had = byId.get(d.id);
    if (!had || (had.role === 'viewer' && m.role === 'editor')) byId.set(d.id, { ...d, role: m.role });
  }
  return [...byId.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** Name and this user's role on a design, or null when they can't see it. */
export async function getDesign(id: string): Promise<{ name: string; role: Role; thumb: string | null } | null> {
  const [row, role] = await Promise.all([
    run(supabase().from('designs').select('name, thumb').eq('id', id).maybeSingle()),
    run(supabase().rpc('design_role', { d: id })),
  ]);
  if (!row || !role) return null;
  const r = row as { name: string; thumb: string | null };
  return { name: r.name, thumb: r.thumb, role: role as Role };
}

/** Creates a design holding `doc` (as a Yjs state) and returns its id. Throws CloudError 'limit' at the design cap. */
export async function createDesign(doc: CalendarDoc, name?: string): Promise<string> {
  const y = new Y.Doc();
  writeDoc(y, doc);
  const state = toB64(Y.encodeStateAsUpdate(y));
  y.destroy();
  const row = await run(supabase().from('designs').insert({ state, ...(name?.trim() ? { name: name.trim() } : {}) }).select('id').single());
  return (row as { id: string }).id;
}

/** Renames a design (owner only). */
export async function renameDesign(id: string, name: string): Promise<void> {
  const rows = await run(supabase().from('designs').update({ name: name.trim() || 'Untitled calendar' }).eq('id', id).select('id'));
  if (!(rows as unknown[] | null)?.length) throw new CloudError('denied', 'design not found');
}

/** Deletes a design: its stored photos first (their rows refuse to go while the files exist), then the row. */
export async function removeDesign(id: string): Promise<void> {
  const store = supabase().storage.from(BUCKET);
  for (;;) {
    const files = await run(store.list(id, { limit: 100 }));
    const paths = (files ?? []).filter((f) => f.id).map((f) => `${id}/${f.name}`);
    if (!paths.length) break;
    const gone = await run(store.remove(paths));
    // Storage reports files it may not delete as simply not deleted; stop instead of looping.
    if (!gone?.length) throw new CloudError('denied', 'could not delete the design photos');
  }
  const rows = await run(supabase().from('designs').delete().eq('id', id).select('id'));
  if (!(rows as unknown[] | null)?.length) throw new CloudError('denied', 'design not found');
}

/**
 * Stores a small JPEG preview of the first page. Edits live in design_updates, so this is also what
 * moves the design's "Edited" time; pass the current thumb again to just mark it edited.
 */
export async function saveThumb(id: string, dataUrl: string | null): Promise<void> {
  await run(supabase().from('designs').update({ thumb: dataUrl }).eq('id', id));
}
