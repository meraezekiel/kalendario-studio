import { useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toJpeg } from 'html-to-image';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { CalendarDoc } from '@/lib/calendar/types';
import { getDesign, saveThumb } from '@/lib/cloud/designs';
import { DesignSync } from '@/lib/cloud/sync';
import { SupabaseTransport } from '@/lib/cloud/transport';
import type { SharedDoc } from '@/lib/cloud/ydoc';
import { useAuthStore } from '@/store/useAuthStore';
import { useCloudStore } from '@/store/useCloudStore';
import { useStudioStore } from '@/store/useStudioStore';

const THUMB_EVERY_MS = 60_000;
const THUMB_W = 320;

/** The first page as drawn on the stage, or null when another page is showing. */
function firstPageNode(): HTMLElement | null {
  const id = useStudioStore.getState().doc.pages[0]?.id;
  return id ? document.querySelector<HTMLElement>(`.ph [data-page-id="${CSS.escape(id)}"]`) : null;
}

/** A small JPEG of a rendered page, or null. Never throws or logs: thumbnails are best effort. */
async function jpeg(node: HTMLElement): Promise<string | null> {
  try {
    const w = node.offsetWidth || 1;
    const h = node.offsetHeight || 1;
    // skipFonts: no font fetches (which log errors when they fail); the preview is small enough.
    return await toJpeg(node, {
      quality: 0.7,
      pixelRatio: 1,
      canvasWidth: THUMB_W,
      canvasHeight: Math.round((THUMB_W * h) / w),
      skipFonts: true,
    });
  } catch {
    return null;
  }
}

/**
 * Opens cloud design `designId` in the editor: checks access, loads it through the sync engine (with an
 * offline copy in IndexedDB), sends local edits, applies everyone else's, and keeps a thumbnail fresh.
 */
export function useCloudSessionHandler(designId: string) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authReady = useAuthStore((s) => s.ready);
  /** Edited since the last thumbnail. */
  const dirty = useRef(false);
  /** The stored thumbnail, re-sent when the first page isn't on screen (it also marks the design edited). */
  const thumb = useRef<string | null>(null);
  const canWrite = useRef(false);

  useEffect(() => useAuthStore.getState().init(), []);

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent(`/d/${designId}`)}`);
      return;
    }
    useCloudStore.getState().begin(designId);
    useStudioStore.setState({ ready: false, readOnly: false, onLocalChange: null });
    dirty.current = false;
    canWrite.current = false;
    let cancelled = false;
    let sync: DesignSync | null = null;
    let started: Promise<unknown> = Promise.resolve();
    const offs: (() => void)[] = [];

    /** Shows a version of the design: the first one starts the editor, later ones merge into it. */
    const show = (shared: SharedDoc) => {
      const st = useStudioStore.getState();
      if (st.ready) st.applyRemote(shared);
      else st.hydrate({ ...shared, cur: 0 } as CalendarDoc);
    };

    void (async () => {
      let info: Awaited<ReturnType<typeof getDesign>> | undefined;
      try {
        info = await getDesign(designId);
      } catch {
        info = undefined; // offline or a hiccup: open from the offline copy; the engine reports the status
      }
      if (cancelled) return;
      const cloud = useCloudStore.getState();
      if (info === null) {
        cloud.patch({ status: { state: 'denied', pending: false } });
        return;
      }
      if (info) {
        cloud.patch({ name: info.name, role: info.role });
        thumb.current = info.thumb;
      }
      canWrite.current = info?.role === 'owner' || info?.role === 'editor';
      useStudioStore.setState({ readOnly: info?.role === 'viewer' });

      const s = new DesignSync(designId, new SupabaseTransport(designId, userId), {
        persist: (y) => new IndexeddbPersistence(`kal-design-${designId}`, y),
      });
      sync = s;
      offs.push(s.on('status', (status) => useCloudStore.getState().patch({ status })));
      offs.push(s.on('remote', show));
      started = s.start();
      const doc = (await started) as SharedDoc | null;
      if (cancelled) return;
      useCloudStore.getState().patch({ status: s.status });
      // Edits go into the Y.Doc; remote changes come back through applyRemote, which never calls this.
      useStudioStore.setState({
        onLocalChange: (prev, next, tracked) => {
          dirty.current = true;
          s.local(prev, next, tracked);
        },
      });
      // Null when there's neither a server nor an offline copy yet (opened offline); the first 'remote' shows it.
      if (doc) show(doc);
    })();

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
      useStudioStore.setState({ onLocalChange: null, readOnly: false, ready: false });
      useCloudStore.getState().begin(null);
      const s = sync;
      if (s) void started.catch(() => {}).then(() => s.stop());
    };
  }, [authReady, userId, designId, router]);

  // A fresh thumbnail every minute while editing.
  useEffect(() => {
    const t = setInterval(() => {
      if (!dirty.current || !canWrite.current) return;
      dirty.current = false;
      void (async () => {
        const node = firstPageNode();
        const url = node ? await jpeg(node) : null;
        if (url) thumb.current = url;
        await saveThumb(designId, url ?? thumb.current).catch(() => {});
      })();
    }, THUMB_EVERY_MS);
    return () => clearInterval(t);
  }, [designId]);

  // And one on leaving. Layout cleanup runs while the page is still in the document, so copy it
  // offscreen now and draw the copy after the editor is gone.
  useLayoutEffect(
    () => () => {
      if (!dirty.current || !canWrite.current) return;
      dirty.current = false;
      const node = firstPageNode();
      const box = node ? document.createElement('div') : null;
      if (node && box) {
        box.className = 'export-box';
        box.setAttribute('aria-hidden', 'true');
        box.appendChild(node.cloneNode(true));
        document.body.appendChild(box);
      }
      const last = thumb.current;
      void (async () => {
        const url = box ? await jpeg(box.firstElementChild as HTMLElement) : null;
        box?.remove();
        await saveThumb(designId, url ?? last).catch(() => {});
      })();
    },
    [designId],
  );
}
