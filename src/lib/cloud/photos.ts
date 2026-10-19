import { readImage } from '../calendar/samplePhoto';
import type { Asset, CalendarDoc } from '../calendar/types';
import { supabase } from './supabase';
import { CloudError, toCloudError } from './transport';

const BUCKET = 'photos';
const PREFIX = 'sb:';
/** Cloud photos are stored smaller than local ones: they count against the account's 50 MB. */
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

/** The picked file isn't an image the browser can read. */
export class UnreadableImage extends Error {
  constructor(name: string) {
    super(`could not read ${name}`);
    this.name = 'UnreadableImage';
  }
}

type ErrLike = { message?: unknown; status?: unknown; statusCode?: unknown; originalError?: unknown };

/**
 * Classifies a photos-row or storage failure. Over the quota or the per-photo size is 'limit': the
 * row insert says so by name, the upload only as a database error from the quota re-check (or 413).
 */
export function photoError(e: unknown): Error {
  if (e instanceof CloudError) return e;
  const err = (e && typeof e === 'object' ? e : {}) as ErrLike;
  const message = typeof err.message === 'string' ? err.message : String(e);
  if (/limit reached|photo too large|maximum allowed size|database error, code: P0001/i.test(message) || err.status === 413 || err.statusCode === '413') {
    return new CloudError('limit', message);
  }
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

function toBlob(dataUrl: string): Blob {
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

/**
 * Stores a picked photo for design `designId` and returns its asset (`sb:<path>`). The photos row goes
 * first (storage only takes files that have one), then the file; a failed upload takes its row back.
 * Throws UnreadableImage, or CloudError 'limit' (50 MB per account, 5 MB per photo) / 'offline' / 'denied'.
 */
export async function uploadPhoto(designId: string, file: File): Promise<Asset> {
  let a: Asset;
  try {
    a = await readImage(file, CLOUD_MAX_PX, CLOUD_QUALITY);
  } catch {
    throw new UnreadableImage(file.name);
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new CloudError('offline', 'offline');
  const blob = toBlob(a.src);
  const path = `${designId}/${crypto.randomUUID()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`;
  const sb = supabase();
  await run(sb.from('photos').insert({ path, design_id: designId, bytes: blob.size }));
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

/** Bytes of photo space this account uses (photos in its own designs, whoever added them). */
export async function photoUsage(): Promise<number> {
  return Number(await run(supabase().rpc('photo_usage')));
}

/** A copy of `doc` with every cloud photo turned back into a data URL (for files that leave the cloud). */
export async function embedPhotos(doc: CalendarDoc): Promise<CalendarDoc> {
  const assets = { ...doc.assets };
  await Promise.all(
    Object.entries(doc.assets).map(async ([id, a]) => {
      const p = cloudPath(a.src);
      if (p) assets[id] = { ...a, src: await toDataUrl(await photoBlob(p)) };
    }),
  );
  return { ...doc, assets };
}
