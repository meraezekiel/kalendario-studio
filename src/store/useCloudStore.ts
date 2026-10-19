import { create } from 'zustand';
import { renameDesign, type Role } from '@/lib/cloud/designs';
import { isDirty } from '@/lib/cloud/dirty';
import { type Presence, whoElse } from '@/lib/cloud/presence';
import type { SyncStatus } from '@/lib/cloud/sync';
import { toast, useStudioStore } from './useStudioStore';

export type { Presence };

interface CloudState {
  /** The open cloud design, or null on the local editor. */
  designId: string | null;
  role: Role | null;
  name: string;
  status: SyncStatus;
  /** Everyone else in the design (other tabs of this person included), from the channel's presence. */
  others: Presence[];
  /** Whether this person's own changes can be undone / redone (cloud designs keep history in the Y.Doc). */
  undoable: { undo: boolean; redo: boolean };
  /** A whole-design change waiting for "Replace anyway": who else is here. */
  replacing: { who: string; many: boolean } | null;
  /** Renames the open design (owner only); the new name shows at once. */
  setName(n: string): Promise<void>;
  /** Starts (or, with null, ends) a cloud session, resetting everything else. */
  begin(designId: string | null): void;
  patch(p: Partial<Pick<CloudState, 'role' | 'name' | 'status' | 'others' | 'undoable'>>): void;
  /** Answers the whole-design confirmation. */
  answerReplace(ok: boolean): void;
}

const CONNECTING: SyncStatus = { state: 'connecting', pending: false };
const NO_UNDO = { undo: false, redo: false };

let pending: { promise: Promise<boolean>; resolve: (ok: boolean) => void } | null = null;

export const useCloudStore = create<CloudState>((set, get) => ({
  designId: null,
  role: null,
  name: '',
  status: CONNECTING,
  others: [],
  undoable: NO_UNDO,
  replacing: null,

  async setName(n) {
    const { designId, name: was } = get();
    const name = n.trim() || 'Untitled calendar';
    if (!designId || name === was) return;
    set({ name });
    try {
      await renameDesign(designId, name);
    } catch {
      if (get().designId === designId) set({ name: was });
      toast('Could not rename the design. Please try again.');
    }
  },

  begin(designId) {
    get().answerReplace(false);
    set({ designId, role: null, name: '', status: CONNECTING, others: [], undoable: NO_UNDO });
  },

  patch(p) {
    set(p);
  },

  answerReplace(ok) {
    const p = pending;
    pending = null;
    if (get().replacing) set({ replacing: null });
    p?.resolve(ok);
  },
}));

/**
 * Before a change that replaces every page: when someone else is in the design, asks first and resolves
 * with the answer. Returns plain `true` (no promise, so the change can happen synchronously) when nobody
 * else is here (always, on the local editor) or the design is view only (the change itself then says so).
 */
export function confirmReplaceAll(): true | Promise<boolean> {
  const { others } = useCloudStore.getState();
  if (!others.length || useStudioStore.getState().readOnly) return true;
  if (pending) return pending.promise;
  let resolve!: (ok: boolean) => void;
  const promise = new Promise<boolean>((r) => { resolve = r; });
  pending = { promise, resolve };
  useCloudStore.setState({ replacing: whoElse(others) });
  return promise;
}

/** Sends the open cloud design's pending edits (set by the cloud session while one is open). */
let flusher: (() => Promise<void>) | null = null;

/** The cloud session offers its `flush`; returns the matching "withdraw". */
export function provideFlush(fn: () => Promise<void>): () => void {
  flusher = fn;
  return () => {
    if (flusher === fn) flusher = null;
  };
}

/**
 * Tries to send the open design's pending edits, then waits up to `ms` for every one of them to be
 * saved. Resolves true once nothing is pending, false when time ran out (offline, say). Never rejects.
 */
export async function saveAll(ms: number): Promise<boolean> {
  // Edits from an earlier visit (opened offline) aren't pending until the server copy loads: the
  // dirty list knows them.
  const saved = () => {
    const { status, designId } = useCloudStore.getState();
    return !status.pending && !(designId && isDirty(designId));
  };
  const until = Date.now() + ms;
  while (!saved()) {
    const left = until - Date.now();
    if (left <= 0) return false;
    // One send attempt (it resolves even when it fails), then a moment for the status to catch up.
    const tick = Math.min(left, 2000);
    await Promise.race([flusher?.().catch(() => {}), new Promise((r) => setTimeout(r, tick))]);
    if (saved()) break;
    await new Promise<void>((resolve) => {
      const t = setTimeout(done, Math.max(0, Math.min(until - Date.now(), 1000)));
      const off = useCloudStore.subscribe(() => saved() && done());
      function done() {
        clearTimeout(t);
        off();
        resolve();
      }
    });
  }
  return true;
}
