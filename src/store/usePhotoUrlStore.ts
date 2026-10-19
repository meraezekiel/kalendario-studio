'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { cloudPath, photoBlob } from '@/lib/cloud/photos';

/** A photo that failed to download is tried again after this long. */
const RETRY_MS = 10_000;

interface PhotoUrlState {
  /** Object URLs of downloaded cloud photos, by storage path. */
  urls: Record<string, string>;
  /** When each failed download failed, by path; cleared (which retries it) after RETRY_MS. */
  failed: Record<string, number>;
  /**
   * Resolves `path` to an object URL, downloading it once. Null when that fails, or right away while
   * a recent failure is waiting out RETRY_MS (unless `force`).
   */
  load(path: string, force?: boolean): Promise<string | null>;
}

/** Failed downloads retry by themselves this many times (a minute), then only when asked again. */
const AUTO_RETRIES = 6;

const pending = new Map<string, Promise<string | null>>();
/** Failures in a row, by path. */
const tries = new Map<string, number>();

const without = (r: Record<string, number>, k: string) => {
  const { [k]: _, ...rest } = r;
  return rest;
};

export const usePhotoUrlStore = create<PhotoUrlState>((set, get) => ({
  urls: {},
  failed: {},

  load(path, force = false) {
    const s = get();
    if (s.urls[path]) return Promise.resolve(s.urls[path]);
    const busy = pending.get(path);
    if (busy) return busy;
    const at = s.failed[path];
    if (!force && at && Date.now() - at < RETRY_MS) return Promise.resolve(null);
    const p = photoBlob(path)
      .then(
        (blob) => {
          tries.delete(path);
          const url = URL.createObjectURL(blob);
          set((st) => ({ urls: { ...st.urls, [path]: url }, failed: without(st.failed, path) }));
          return url;
        },
        () => {
          const when = Date.now();
          const n = (tries.get(path) ?? 0) + 1;
          tries.set(path, n);
          set((st) => ({ failed: { ...st.failed, [path]: when } }));
          // For a while, clearing the failure re-renders whoever shows the photo and they ask again
          // (it may still be on its way). After that only a later render or an export retries it.
          if (n < AUTO_RETRIES) {
            setTimeout(() => {
              if (get().failed[path] === when) set((st) => ({ failed: without(st.failed, path) }));
            }, RETRY_MS);
          }
          return null;
        },
      )
      .finally(() => pending.delete(path));
    pending.set(path, p);
    return p;
  },
}));

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Waits until every cloud photo in `srcs` has loaded or failed, and the page has re-rendered with
 * them (export and print draw the page after this). Returns at once when there are none.
 */
export async function loadPhotos(srcs: Iterable<string>): Promise<void> {
  const paths = [...new Set([...srcs].map(cloudPath).filter((p): p is string => !!p))];
  if (!paths.length) return;
  await Promise.all(paths.map((p) => usePhotoUrlStore.getState().load(p, true)));
  await frame();
  await frame();
}

/**
 * What to put in the page for each photo source: data, blob and sample sources as they are; cloud
 * (`sb:`) ones as an object URL once downloaded, null while loading or after a failure.
 */
export function usePhotoUrls(srcs: readonly (string | null | undefined)[]): (string | null)[] {
  const paths = srcs.map(cloudPath);
  const urls = usePhotoUrlStore(useShallow((s) => paths.map((p) => (p ? s.urls[p] ?? null : null))));
  const failed = usePhotoUrlStore(useShallow((s) => paths.map((p) => (p ? s.failed[p] ?? 0 : 0))));
  // A failure is asked about again on a render at least RETRY_MS after it.
  const now = Date.now();
  const missing = paths.filter((p, i): p is string => !!p && !urls[i] && (!failed[i] || now - failed[i] >= RETRY_MS));
  const key = missing.join('\n');
  useEffect(() => {
    if (!key) return;
    for (const p of key.split('\n')) void usePhotoUrlStore.getState().load(p);
  }, [key]);
  return srcs.map((s, i) => (paths[i] ? urls[i] : s || null));
}

/** One photo source as `usePhotoUrls` resolves it. */
export function usePhotoUrl(src: string | null | undefined): string | null {
  return usePhotoUrls([src])[0];
}
