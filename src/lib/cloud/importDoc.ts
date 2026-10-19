import type { Asset, CalendarDoc } from '../calendar/types';
import { createDesign, removeDesign, writeNewDesign } from './designs';
import { cloudPath, copyPhoto, dataUrlFile, isCloudSrc, photoUsage, PhotoTooLarge, UnreadableImage, uploadPhoto, uploadPhotoTo, type PhotoOwner } from './photos';
import { PHOTO_SPACE_BYTES } from './limits';
import { CloudError } from './transport';

const isDataSrc = (src: string | null | undefined): src is string => !!src && src.startsWith('data:');

/** Photo sources that have to move into the cloud (data URLs and other folders' photos), each once. */
function movable(assets: Record<string, Asset>): string[] {
  return [...new Set(Object.values(assets).map((a) => a.src).filter((s) => isDataSrc(s) || isCloudSrc(s)))];
}

/** Bytes the data-URL photos take (each distinct one once), before any downscaling. */
export function estimateBytes(doc: Pick<CalendarDoc, 'assets'>): number {
  let n = 0;
  for (const src of new Set(Object.values(doc.assets).map((a) => a.src))) {
    if (!isDataSrc(src)) continue;
    n += Math.floor(((src.length - src.indexOf(',') - 1) * 3) / 4);
  }
  return n;
}

/** Throws CloudError 'limit' when photos of about `bytes` would not fit in this account's space. */
export async function checkSpace(bytes: number): Promise<void> {
  if (!bytes) return;
  if ((await photoUsage()) + bytes > PHOTO_SPACE_BYTES) throw new CloudError('limit', 'photo storage limit reached');
}

/** Whether a failure is about this one photo (skip it) rather than the account or the connection (stop). */
const onlyThisPhoto = (e: unknown) => e instanceof PhotoTooLarge || e instanceof UnreadableImage || (e instanceof CloudError && e.code === 'denied');

/**
 * Puts every data-URL and cloud photo of `assets` into `owner`'s folder: data URLs are uploaded,
 * cloud photos copied. Returns the assets with their new sources (a photo that couldn't be read is
 * left out, so what showed it becomes an empty frame) and how many were left out. Stops at the
 * first account or connection failure, throwing it; `stored` then lists the paths already stored.
 */
export async function moveAssets(
  assets: Record<string, Asset>,
  owner: PhotoOwner,
  onProgress?: (done: number, total: number) => void,
  stored: string[] = [],
): Promise<{ assets: Record<string, Asset>; skipped: number }> {
  const srcs = movable(assets);
  const moved = new Map<string, Asset | null>();
  onProgress?.(0, srcs.length);
  for (const [i, src] of srcs.entries()) {
    try {
      let a: Asset;
      if (isDataSrc(src)) {
        const file = dataUrlFile(src);
        a = 'designId' in owner ? await uploadPhoto(owner.designId, file) : await uploadPhotoTo(owner, file);
      } else {
        a = { src: await copyPhoto(cloudPath(src)!, owner), w: 0, h: 0 };
      }
      stored.push(cloudPath(a.src)!);
      moved.set(src, a);
    } catch (e) {
      if (!onlyThisPhoto(e)) throw e;
      moved.set(src, null);
    }
    onProgress?.(i + 1, srcs.length);
  }
  const out: Record<string, Asset> = {};
  for (const [id, a] of Object.entries(assets)) {
    if (!moved.has(a.src)) out[id] = a;
    else {
      const m = moved.get(a.src);
      if (m) out[id] = m.w ? { ...a, ...m } : { ...a, src: m.src };
    }
  }
  return { assets: out, skipped: [...moved.values()].filter((m) => !m).length };
}

/**
 * Makes a new cloud design from `doc` (the local calendar, or an opened design file) and returns its
 * id. Checks the photo space first and changes nothing when the photos won't fit (CloudError 'limit').
 * On any failure once the design exists, it is removed again and the error rethrown. `onSkip` hears
 * how many photos couldn't be read (they become empty frames).
 */
export async function importDoc(
  doc: CalendarDoc,
  name: string,
  onProgress?: (done: number, total: number) => void,
  onSkip?: (skipped: number) => void,
): Promise<string> {
  await checkSpace(estimateBytes(doc));
  const moving = new Set(movable(doc.assets));
  const bare = Object.fromEntries(Object.entries(doc.assets).filter(([, a]) => !moving.has(a.src)));
  const id = await createDesign({ ...doc, assets: bare, tray: doc.tray.filter((t) => bare[t]) }, name);
  try {
    const { assets, skipped } = await moveAssets(doc.assets, { designId: id }, onProgress);
    await writeNewDesign(id, { ...doc, assets, tray: doc.tray.filter((t) => assets[t]) });
    if (skipped) onSkip?.(skipped);
    return id;
  } catch (e) {
    // Removing the design also removes the photos already stored in it.
    await removeDesign(id).catch(() => {});
    throw e;
  }
}

/** Whether two calendars are the same design, apart from element ids and which page is open. */
export function sameDesign(a: CalendarDoc, b: CalendarDoc): boolean {
  const norm = (d: CalendarDoc) => JSON.stringify({ ...d, cur: 0 }, (k, v) => (k === 'id' ? undefined : v));
  return norm(a) === norm(b);
}
