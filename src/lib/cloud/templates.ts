import { isMyTemplate, type MyTemplate } from '../templates/myTemplates';
import { checkSpace, estimateBytes, moveAssets } from './importDoc';
import { deletePhoto } from './photos';
import { supabase } from './supabase';
import { CloudError, toCloudError } from './transport';

const BUCKET = 'photos';

type Row = { id: string; name: string; saved_at: string; data: { pages?: unknown; assets?: unknown } | null };

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

const toTemplate = (r: Row): MyTemplate => ({
  id: r.id,
  name: r.name,
  savedAt: r.saved_at,
  pages: (r.data?.pages ?? []) as MyTemplate['pages'],
  assets: (r.data?.assets ?? {}) as MyTemplate['assets'],
});

/** The signed-in user's saved templates, newest first. */
export async function listTemplates(): Promise<MyTemplate[]> {
  const rows = await run(supabase().from('templates').select('id, name, saved_at, data').order('saved_at', { ascending: false }));
  return ((rows ?? []) as Row[]).map(toTemplate).filter(isMyTemplate);
}

/**
 * Saves `t` to the account and returns it as stored (its id and photo sources change). Its photos are
 * copied or uploaded into the template's own folder, so it never depends on the design it came from.
 * On failure nothing is kept. `onSkip` hears how many photos couldn't be read (they become empty frames).
 */
export async function saveTemplate(t: MyTemplate, onSkip?: (skipped: number) => void): Promise<MyTemplate> {
  await checkSpace(estimateBytes(t));
  const sb = supabase();
  const row = (await run(
    sb.from('templates').insert({ name: t.name, saved_at: t.savedAt, data: { pages: t.pages, assets: {} } }).select('id, name, saved_at, data').single(),
  )) as Row;
  try {
    const { assets, skipped } = await moveAssets(t.assets, { templateId: row.id });
    const saved = (await run(sb.from('templates').update({ data: { pages: t.pages, assets } }).eq('id', row.id).select('id, name, saved_at, data').single())) as Row;
    if (skipped) onSkip?.(skipped);
    return toTemplate(saved);
  } catch (e) {
    await removeTemplate(row.id).catch(() => {});
    throw e;
  }
}

/** Deletes a saved template: its stored photos first (their rows refuse to go while the files exist), then the row. */
export async function removeTemplate(id: string): Promise<void> {
  const store = supabase().storage.from(BUCKET);
  for (;;) {
    const files = await run(store.list(id, { limit: 100 }));
    const paths = (files ?? []).filter((f) => f.id).map((f) => `${id}/${f.name}`);
    if (!paths.length) break;
    const gone = await run(store.remove(paths));
    if (!gone?.length) throw new CloudError('denied', 'could not delete the template photos');
  }
  const rows = await run(supabase().from('templates').delete().eq('id', id).select('id'));
  if (!(rows as unknown[] | null)?.length) throw new CloudError('denied', 'template not found');
}

/**
 * A copy of template `t` whose photos live in design `designId`'s folder, ready for applyMyTemplate:
 * cloud photos are copied (row first, then storage.copy), data-URL ones uploaded. When the space runs
 * out or the connection drops, the photos already copied are deleted again and the error rethrown.
 */
export async function applyCloudTemplate(designId: string, t: MyTemplate): Promise<{ template: MyTemplate; skipped: number }> {
  await checkSpace(estimateBytes(t));
  const stored: string[] = [];
  try {
    const { assets, skipped } = await moveAssets(t.assets, { designId }, undefined, stored);
    return { template: { ...t, assets }, skipped };
  } catch (e) {
    for (const p of stored) await deletePhoto(p).catch(() => {});
    throw e;
  }
}
