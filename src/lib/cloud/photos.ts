import { readImage } from '../calendar/samplePhoto';
import type { Asset, CalendarDoc } from '../calendar/types';
import { MAX_PHOTO_BYTES } from './limits';
import { supabase } from './supabase';
import { CloudError, toCloudError } from './transport';

const BUCKET = 'photos';
const PREFIX = 'sb:';
/** Cloud photos are stored smaller than local ones: they count against the account's photo space. */
const CLOUD_MAX_PX = 1600;
const CLOUD_QUALITY = 0.82;

/** True for a photo kept in cloud storage (`sb:<path>`), as opposed to a data, blob or sample source. */
export const isCloudSrc = (src: string | null | undefined): src is string => !!src && src.startsWith(PREFIX);

/** The storage path of an `sb:` source, or null for any other source. */
export const cloudPath = (src: string | null | undefined): string | null => (isCloudSrc(src) ? src.slice(PREFIX.length) : null);

/** Storage paths of every cloud photo in the doc's assets, each once. */
export function photosOf(doc: CalendarDoc): string[] {
  const out = new Set<string>();
  for (const a of Object.values(doc.assets)) {
    const p = cloudPath(a.src);
    if (p) out.add(p);
  }
  return [...out];
}

/**
 * The stored photo the design stops using when asset `assetId` goes (so its link can go too), or
 * null when it isn't a cloud photo or another asset here still shows it. The photo itself stays in
 * the library.
 */
export function photoLeftUnused(doc: CalendarDoc, assetId: string): string | null {
  const src = doc.assets[assetId]?.src;
  const p = cloudPath(src);
  if (!p) return null;
  return Object.entries(doc.assets).some(([id, a]) => id !== assetId && a.src === src) ? null : p;
}

/** One photo is over the per-photo limit, MAX_PHOTO_BYTES (even after downscaling). */
export class PhotoTooLarge extends Error {
  constructor(message = 'photo too large') {
    super(message);
    this.name = 'PhotoTooLarge';
  }
}

/** The picked file isn't an image the browser can read. */
export class UnreadableImage extends Error {
  constructor(name: string) {
    super(`could not read ${name}`);
    this.name = 'UnreadableImage';
  }
}

type ErrLike = { message?: unknown; status?: unknown; statusCode?: unknown; originalError?: unknown };

/**
 * Classifies a photos-row or storage failure. Over the per-photo size is PhotoTooLarge (row insert:
 * 'photo too large'; storage: 413). Over the quota is CloudError 'limit': the row insert says so by
 * name, the upload only as a database error from the quota re-check.
 */
export function photoError(e: unknown): Error {
  if (e instanceof CloudError || e instanceof PhotoTooLarge) return e;
  const err = (e && typeof e === 'object' ? e : {}) as ErrLike;
  const message = typeof err.message === 'string' ? err.message : String(e);
  if (/photo too large|maximum allowed size/i.test(message) || err.status === 413 || err.statusCode === '413') return new PhotoTooLarge(message);
  if (/limit reached|database error, code: P0001/i.test(message)) return new CloudError('limit', message);
  // storage-js wraps a failed fetch in its own error.
  if (err.originalError instanceof TypeError || /^(Failed to fetch|NetworkError|Load failed)/.test(message)) return new CloudError('offline', message);
  return toCloudError(e);
}

/** Runs a Supabase call and throws its error, classified. */
async function run<T>(call: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let res: { data: T; error: unknown };
  try {
    res = await call;
  } catch (e) {
    throw photoError(e);
  }
  if (res.error) throw photoError(res.error);
  return res.data;
}

export function toBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const type = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? 'image/jpeg';
  const bin = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/** Photo files already here (uploaded or downloaded in this tab), by path. */
const blobs = new Map<string, Blob>();
const downloading = new Map<string, Promise<Blob>>();

/** A photos row refused because the account already has a photo with that hash. */
const isDuplicate = (e: unknown) => e instanceof Error && /duplicate key|photos_owner_hash_idx/.test(e.message);

/** The signed-in user's id; CloudError 'denied' when signed out. */
async function myId(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new CloudError('denied', 'signed out');
  return id;
}

/** SHA-256 of a file's bytes, as hex: the same picked file always gives the same hash. */
export async function hashFile(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stores a picked photo in the account's photo library, links it to design `designId`, and returns its
 * asset (`sb:<path>`). A file this account already stored (same hash) is reused, not sent again.
 * Throws UnreadableImage, PhotoTooLarge (over MAX_PHOTO_BYTES, checked before anything is sent), or
 * CloudError 'limit' (PHOTO_SPACE_BYTES per account) / 'offline' / 'denied'.
 */
export async function uploadPhoto(designId: string, file: File): Promise<Asset> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new CloudError('offline', 'offline');
  const uid = await myId();
  const hash = await hashFile(file);
  const a = (await storedPhoto(uid, hash)) ?? (await uploadPhotoTo({ library: uid, hash }, file));
  await linkPhoto(designId, cloudPath(a.src)!);
  return a;
}

/** A row without its file this old is left over from a failed upload (a younger one may still be uploading). */
const LEFTOVER_MS = 60_000;

/** This account's stored photo with `hash`, or null. A row left behind by a failed upload is cleared away. */
async function storedPhoto(uid: string, hash: string): Promise<Asset | null> {
  const sb = supabase();
  const rows = (await run(sb.from('photos').select('path, w, h, created_at').eq('owner', uid).eq('hash', hash).limit(1))) as (LibraryRow & { created_at: string })[] | null;
  const row = rows?.[0];
  if (!row) return null;
  if (await run(sb.rpc('photo_object_exists', { path: row.path }))) return { src: PREFIX + row.path, w: row.w ?? 0, h: row.h ?? 0 };
  if (Date.now() - Date.parse(row.created_at) > LEFTOVER_MS) await sb.from('photos').delete().eq('path', row.path);
  return null;
}

/** Records that design `designId` uses stored photo `path` (once; so everyone on the design can see it). */
export async function linkPhoto(designId: string, path: string): Promise<void> {
  await run(supabase().from('design_photos').upsert({ design_id: designId, path }, { ignoreDuplicates: true }));
}

/** Records that design `designId` no longer uses photo `path`; the photo stays in the library. */
export async function unlinkPhoto(designId: string, path: string): Promise<void> {
  await run(supabase().from('design_photos').delete().eq('design_id', designId).eq('path', path));
}

type LibraryRow = { path: string; w: number | null; h: number | null };

/** A photo in the account's library. `w`/`h` are 0 for photos stored before sizes were recorded. */
export type LibraryPhoto = { src: string; w: number; h: number };

/** The signed-in account's library photos (not its templates' photos), newest first. */
export async function listLibrary(): Promise<LibraryPhoto[]> {
  const uid = await myId();
  const rows = (await run(
    supabase().from('photos').select('path, w, h').eq('owner', uid).is('template_id', null).order('created_at', { ascending: false }),
  )) as LibraryRow[] | null;
  return (rows ?? []).map((r) => ({ src: PREFIX + r.path, w: r.w ?? 0, h: r.h ?? 0 }));
}

/**
 * Where a stored photo belongs: a design (older photos), a saved template, or the account's library
 * (`library` is the account's id; `hash` lets a repeat upload of the file find it).
 */
export type PhotoOwner = { designId: string } | { templateId: string } | { library: string; hash?: string };

const folderOf = (o: PhotoOwner) => ('designId' in o ? o.designId : 'templateId' in o ? o.templateId : `lib/${o.library}`);
const rowOf = (o: PhotoOwner) => ('designId' in o ? { design_id: o.designId } : 'templateId' in o ? { template_id: o.templateId } : { hash: o.hash ?? null });

/** Stores a picked photo for a template or in the library (see `uploadPhoto`). */
export async function uploadPhotoTo(owner: PhotoOwner, file: File): Promise<Asset> {
  let a: Asset;
  try {
    // Only images with real transparency stay PNG; opaque ones become JPEG.
    a = await readImage(file, CLOUD_MAX_PX, CLOUD_QUALITY, true);
  } catch {
    throw new UnreadableImage(file.name);
  }
  const blob = toBlob(a.src);
  if (blob.size > MAX_PHOTO_BYTES) throw new PhotoTooLarge();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new CloudError('offline', 'offline');
  const path = `${folderOf(owner)}/${crypto.randomUUID()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`;
  const sb = supabase();
  const insert = () => run(sb.from('photos').insert({ path, ...rowOf(owner), bytes: blob.size, w: a.w, h: a.h }));
  try {
    await insert();
  } catch (e) {
    // The same file was stored meanwhile (another tab): use that one.
    const again = 'library' in owner && owner.hash && isDuplicate(e) ? await storedPhoto(owner.library, owner.hash) : null;
    if (again) return again;
    throw e;
  }
  try {
    await run(sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false }));
  } catch (e) {
    // Best effort: with no file stored the row may go (a leftover only counts its declared bytes).
    try {
      await sb.from('photos').delete().eq('path', path);
    } catch {
      // offline: keep the original error
    }
    throw e;
  }
  blobs.set(path, blob);
  return { src: PREFIX + path, w: a.w, h: a.h };
}

/**
 * Copies stored photo `from` into `owner`'s folder (so no design or template points into another's)
 * and returns the copy's source. The new row goes first, then the file is copied; a failed copy takes
 * its row back. Throws CloudError 'limit' / 'offline' / 'denied' (e.g. the original is gone).
 */
export async function copyPhoto(from: string, owner: PhotoOwner): Promise<string> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new CloudError('offline', 'offline');
  const sb = supabase();
  const rows = (await run(sb.from('photos').select('bytes, w, h').eq('path', from))) as { bytes: number; w: number | null; h: number | null }[] | null;
  const row = rows?.[0];
  if (!row?.bytes) throw new CloudError('denied', 'photo not found');
  const path = `${folderOf(owner)}/${crypto.randomUUID()}.${from.endsWith('.png') ? 'png' : 'jpg'}`;
  await run(sb.from('photos').insert({ path, ...rowOf(owner), bytes: row.bytes, w: row.w, h: row.h }));
  try {
    await run(sb.storage.from(BUCKET).copy(from, path));
  } catch (e) {
    try {
      await sb.from('photos').delete().eq('path', path);
    } catch {
      // offline: keep the original error
    }
    throw e;
  }
  const had = blobs.get(from);
  if (had) blobs.set(path, had);
  return PREFIX + path;
}

/**
 * Stored photo `from` (a template's, or someone else's) as a photo of this account's library: a copy,
 * made once (its hash names where it came from, so the next time finds it). Returns its path.
 */
export async function libraryCopyOf(from: string): Promise<string> {
  const uid = await myId();
  const hash = `copy:${from}`;
  const had = await storedPhoto(uid, hash);
  if (had) return cloudPath(had.src)!;
  try {
    return cloudPath(await copyPhoto(from, { library: uid, hash }))!;
  } catch (e) {
    const again = isDuplicate(e) ? await storedPhoto(uid, hash) : null;
    if (again) return cloudPath(again.src)!;
    throw e;
  }
}

/** Whether stored photo `path` is in the signed-in account's library (so a design can just link it). */
export async function isMyLibraryPhoto(path: string): Promise<boolean> {
  const uid = await myId();
  const rows = (await run(supabase().from('photos').select('owner, template_id').eq('path', path))) as { owner: string; template_id: string | null }[] | null;
  return rows?.[0]?.owner === uid && !rows[0].template_id;
}

/** A data URL as a file, for `uploadPhoto`. */
export function dataUrlFile(dataUrl: string, name = 'photo'): File {
  const blob = toBlob(dataUrl);
  return new File([blob], name, { type: blob.type });
}

/** The file of cloud photo `path`, downloaded once per tab. */
export function photoBlob(path: string): Promise<Blob> {
  const had = blobs.get(path);
  if (had) return Promise.resolve(had);
  const busy = downloading.get(path);
  if (busy) return busy;
  const p = run(supabase().storage.from(BUCKET).download(path))
    .then((b) => {
      if (!b) throw new CloudError('denied', 'photo not found');
      blobs.set(path, b);
      return b;
    })
    .finally(() => downloading.delete(path));
  downloading.set(path, p);
  return p;
}

/** Deletes cloud photo `path`: the stored file first, then its row (which frees the space). */
export async function deletePhoto(path: string): Promise<void> {
  const sb = supabase();
  await run(sb.storage.from(BUCKET).remove([path]));
  // The row refuses to go while the file is still there, so this also tells whether the file went.
  const rows = await run(sb.from('photos').delete().eq('path', path).select('path'));
  if (!(rows as unknown[] | null)?.length) throw new CloudError('denied', 'could not delete the photo');
  blobs.delete(path);
}

/** Whether any design uses stored photo `path` (a library photo can be deleted only when none does). */
export async function photoInUse(path: string): Promise<boolean> {
  return !!(await run(supabase().rpc('photo_in_use', { p: path })));
}

/** Bytes of photo space this account uses: its library and templates (and older photos added to its designs). */
export async function photoUsage(): Promise<number> {
  return Number(await run(supabase().rpc('photo_usage')));
}

/**
 * A copy of `doc` with every cloud photo turned back into a data URL (for files that leave the cloud).
 * With `keepUnreadable`, a photo that can't be fetched keeps its cloud source instead of failing it all.
 */
export async function embedPhotos(doc: CalendarDoc, keepUnreadable = false): Promise<CalendarDoc> {
  const assets = { ...doc.assets };
  await Promise.all(
    Object.entries(doc.assets).map(async ([id, a]) => {
      const p = cloudPath(a.src);
      if (!p) return;
      try {
        assets[id] = { ...a, src: await toDataUrl(await photoBlob(p)) };
      } catch (e) {
        if (!keepUnreadable) throw e;
      }
    }),
  );
  return { ...doc, assets };
}
