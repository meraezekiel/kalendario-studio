import { useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toJpeg } from 'html-to-image';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import type { CalendarDoc } from '@/lib/calendar/types';
import { getDesign, saveThumb } from '@/lib/cloud/designs';
import { dirtyDesigns, followDirty, isDirty, markClean, markDirty } from '@/lib/cloud/dirty';
import { dbName, hasLocalCopy, rememberLocalCopy } from '@/lib/cloud/localCopies';
import { colorFor, type PresencePayload, readOthers } from '@/lib/cloud/presence';
import { DesignSync, type SyncStatus } from '@/lib/cloud/sync';
import { SupabaseTransport } from '@/lib/cloud/transport';
import { makeUndoDriver } from '@/lib/cloud/undo';
import { readDoc, type SharedDoc } from '@/lib/cloud/ydoc';
import { useAuthStore } from '@/store/useAuthStore';
import { provideFlush, useCloudStore } from '@/store/useCloudStore';
import { freshDoc, selIds, useStudioStore } from '@/store/useStudioStore';

const THUMB_EVERY_MS = 60_000;
const THUMB_W = 320;
/** Presence updates (page, selection) go out at most this often. */
const PRESENCE_MS = 150;

const sameSel = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Shares this tab's page and selection on the design channel's presence, throttled, until `stop()`.
 * `track` says whether it could be sent (the channel may not be joined yet).
 */
function followPresence(base: Pick<PresencePayload, 'uid' | 'name' | 'color'>, track: (p: PresencePayload) => boolean) {
  let last: PresencePayload | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sentAt = -Infinity;
  const now = (): PresencePayload => {
    const s = useStudioStore.getState();
    return { ...base, page: s.doc.cur, sel: selIds(s) };
  };
  const send = (force = false) => {
    timer = null;
    const p = now();
    if (!force && last && last.page === p.page && sameSel(last.sel, p.sel)) return;
    if (!track(p)) return;
    last = p;
    sentAt = Date.now();
  };
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => send(), Math.max(0, sentAt + PRESENCE_MS - Date.now()));
  };
  const unsub = useStudioStore.subscribe((s, prev) => {
    if (s.doc.cur !== prev.doc.cur || s.sel !== prev.sel || s.multi !== prev.multi) schedule();
  });
  return {
    /** Sends the current state now (after joining or rejoining the channel). */
    resend: () => send(true),
    stop: () => {
      unsub();
      if (timer) clearTimeout(timer);
    },
  };
}

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
 * This browser's offline copy of design `designId`, read without syncing it, or null when there's none.
 * The copy itself stays (until sign-out).
 */
async function readLocalCopy(designId: string): Promise<SharedDoc | null> {
  if (!(await hasLocalCopy(designId))) return null;
  const y = new Y.Doc();
  const p = new IndexeddbPersistence(dbName(designId), y);
  try {
    await p.whenSynced;
    return readDoc(y);
  } catch {
    return null;
  } finally {
    await p.destroy().catch(() => {});
    y.destroy();
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
      // Signing out from here routes to / itself.
      if (!useAuthStore.getState().leaving) router.replace(`/login?next=${encodeURIComponent(`/d/${designId}`)}`);
      return;
    }
    useCloudStore.getState().begin(designId);
    // Read-only until this person's role is known (it may not be yet when opened offline).
    useStudioStore.setState({ ready: false, readOnly: true, onLocalChange: null });
    dirty.current = false;
    canWrite.current = false;
    let cancelled = false;
    let sync: DesignSync | null = null;
    let started: Promise<unknown> = Promise.resolve();
    const offs: (() => void)[] = [];
    const me = useAuthStore.getState().user;
    /** This tab's presence key: one person may have the design open in several tabs. */
    const presenceKey = `${userId}:${Math.random().toString(36).slice(2, 10)}`;
    let presence: ReturnType<typeof followPresence> | null = null;

    /** This person's role is known: owners and editors may edit (unless access went meanwhile). */
    const learned = (info: NonNullable<Awaited<ReturnType<typeof getDesign>>>) => {
      const cloud = useCloudStore.getState();
      cloud.patch({ name: info.name, role: info.role });
      if (isDirty(designId)) markDirty(designId, info.name); // so sign-out can name it
      thumb.current = info.thumb;
      if (cloud.status.state === 'denied') return;
      canWrite.current = info.role === 'owner' || info.role === 'editor';
      useStudioStore.setState({ readOnly: !canWrite.current });
    };
    let asking = false;
    /** Asks for the role again once back online, when the first try failed. */
    const retryRole = async () => {
      if (asking || useCloudStore.getState().role) return;
      asking = true;
      try {
        const info = await getDesign(designId);
        if (!cancelled && info) learned(info);
      } catch {
        // still unreachable: the next 'live' tries again
      } finally {
        asking = false;
      }
    };
    const onStatus = (status: SyncStatus) => {
      // First, so whoever follows the status (sign-out's "Wait") sees the design's edits as sent.
      followDirty(designId, useCloudStore.getState().name, status);
      useCloudStore.getState().patch({ status });
      if (status.state === 'denied') {
        // Access went (or never was): nothing more can be saved, so stop editing.
        canWrite.current = false;
        useStudioStore.getState().select(null);
        useStudioStore.setState({ readOnly: true });
      } else if (status.state === 'live') void retryRole();
    };

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
      if (info === null) {
        // No access (any more), or the design is gone. Edits made here offline are still in this
        // browser's copy: show it, view only, so the access-lost banner can save it as a copy.
        const copy = await readLocalCopy(designId);
        if (cancelled) return;
        if (copy) {
          useCloudStore.getState().patch({ name: dirtyDesigns().find((d) => d.id === designId)?.name ?? '' });
          show(copy);
        }
        useCloudStore.getState().patch({ status: { state: 'denied', pending: false } });
        return;
      }
      if (info) learned(info);

      const transport = new SupabaseTransport(designId, userId);
      transport.presence(presenceKey, (state) => {
        if (cancelled) return;
        useCloudStore.getState().patch({ others: readOthers(state, presenceKey) });
        // Just joined (or rejoined) the channel: say where this tab is.
        if (!state[presenceKey]) presence?.resend();
      });
      presence = followPresence({ uid: userId, name: me?.name || me?.email || 'Someone', color: colorFor(userId) }, (p) => {
        const ch = transport.channel();
        if (ch?.state !== 'joined') return false;
        void ch.track(p).catch(() => {});
        return true;
      });
      const s = new DesignSync(designId, transport, {
        persist: (y) => {
          rememberLocalCopy(designId); // so sign-out can delete it where indexedDB.databases() is missing
          return new IndexeddbPersistence(dbName(designId), y);
        },
      });
      sync = s;
      offs.push(provideFlush(() => s.flush()));
      offs.push(s.on('status', onStatus));
      offs.push(s.on('remote', show));
      started = s.start();
      const doc = (await started) as SharedDoc | null;
      if (cancelled) return;
      onStatus(s.status);
      // Undo and redo take back only this person's own changes; the engine pushes them and refreshes the store.
      const undo = makeUndoDriver(
        s.ydoc,
        () => useStudioStore.setState({ cropId: null, editing: null, lastKey: null }),
        (undoable) => useCloudStore.getState().patch({ undoable }),
      );
      offs.push(() => undo.destroy());
      useStudioStore.setState({ historyDriver: undo });
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
      presence?.stop();
      // Leave nothing of this design in the store (history and selection included) for the next screen.
      useStudioStore.setState({ onLocalChange: null, readOnly: false, historyDriver: null });
      useStudioStore.getState().hydrate(freshDoc());
      useStudioStore.setState({ ready: false });
      useCloudStore.getState().begin(null);
      const s = sync;
      if (s) {
        void started
          .catch(() => {})
          .then(() => s.stop())
          .then(() => {
            // stop() sends what's left: once it all arrived, nothing of this design is unsent.
            if (s.status.state === 'live' && !s.status.pending) markClean(designId);
          });
      }
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
