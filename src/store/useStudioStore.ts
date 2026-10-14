'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { STORAGE_KEY } from '@/lib/calendar/constants';
import { makeYear } from '@/lib/calendar/document';
import { TEMPLATES } from '@/lib/calendar/templates';
import type { CalendarDoc, El, Page } from '@/lib/calendar/types';

export type DrawerTab = 'templates' | 'add' | 'graphics' | 'photos' | 'page';
export interface Guide { v?: number; h?: number }
export interface Editing { id: string; day?: number }
export interface Rect { x: number; y: number; w: number; h: number }
export type PickTarget = { cal: string; day: number } | { img: string } | { bg: true } | null;

const HISTORY_LIMIT = 80;
const MERGE_MS = 1200;

export function freshDoc(template = 'pastel'): CalendarDoc {
  const doc: CalendarDoc = { v: 3, year: new Date().getFullYear() + 1, holidays: true, cur: 0, assets: {}, tray: [], pages: TEMPLATES[template].make() };
  makeYear(doc);
  return doc;
}

interface StudioState {
  doc: CalendarDoc;
  ready: boolean;
  sel: string | null;
  /** Ids of a multi-selection (two or more). When set, `sel` is null. */
  multi: string[];
  selDay: number | null;
  cropId: string | null;
  armed: number | null;
  editing: Editing | null;
  tab: DrawerTab;
  clip: El[];
  /** Rubber-band selection rectangle in page coordinates while dragging. */
  marquee: Rect | null;
  guides: Guide[];
  /** Page indexes being printed; PrintArea renders them and opens the print dialog. */
  printing: number[] | null;
  /** True while the current page is rendered offscreen for PNG export. */
  exporting: boolean;
  toast: { msg: string; n: number } | null;
  past: CalendarDoc[];
  future: CalendarDoc[];
  lastKey: string | null;
  lastAt: number;

  /** Changes the document. Records an undo step unless `key` matches the previous change (typing, sliders). */
  mutate: (recipe: (doc: CalendarDoc) => void, opts?: { key?: string; history?: boolean }) => void;
  /** Records the current document as an undo step (used before a drag). */
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  select: (id: string | null, day?: number | null) => void;
  /** Selects several elements; one id falls back to a normal single selection. */
  selectMany: (ids: string[]) => void;
  set: (patch: Partial<Pick<StudioState, 'cropId' | 'armed' | 'editing' | 'tab' | 'clip' | 'guides' | 'marquee' | 'sel' | 'selDay' | 'printing' | 'exporting'>>) => void;
  showToast: (msg: string) => void;
  hydrate: (doc: CalendarDoc | null) => void;
}

export const useStudioStore = create<StudioState>()(
  immer((set, get) => ({
    doc: freshDoc(),
    ready: false,
    sel: null,
    multi: [],
    selDay: null,
    cropId: null,
    armed: null,
    editing: null,
    tab: 'templates',
    clip: [],
    marquee: null,
    guides: [],
    printing: null,
    exporting: false,
    toast: null,
    past: [],
    future: [],
    lastKey: null,
    lastAt: 0,

    mutate: (recipe, opts = {}) => {
      const { key, history = true } = opts;
      const now = Date.now();
      const s = get();
      const merge = !!key && key === s.lastKey && now - s.lastAt < MERGE_MS;
      const before = s.doc;
      set((st) => {
        recipe(st.doc);
        if (history && !merge) {
          st.past.push(before);
          if (st.past.length > HISTORY_LIMIT) st.past.shift();
          st.future = [];
        }
        st.lastKey = key ?? null;
        st.lastAt = now;
      });
    },

    checkpoint: () =>
      set((st) => {
        st.past.push(get().doc);
        if (st.past.length > HISTORY_LIMIT) st.past.shift();
        st.future = [];
        st.lastKey = null;
      }),

    undo: () => {
      const s = get();
      if (!s.past.length) return s.showToast('Nothing to undo.');
      const prev = s.past[s.past.length - 1];
      set((st) => {
        st.past.pop();
        st.future.push(s.doc);
        // Uploaded photos stay in the tray even when the step that added them is undone.
        st.doc = { ...prev, assets: s.doc.assets, tray: s.doc.tray };
        st.sel = null; st.multi = []; st.selDay = null; st.cropId = null; st.editing = null; st.lastKey = null;
      });
    },

    redo: () => {
      const s = get();
      if (!s.future.length) return;
      const next = s.future[s.future.length - 1];
      set((st) => {
        st.future.pop();
        st.past.push(s.doc);
        st.doc = { ...next, assets: s.doc.assets, tray: s.doc.tray };
        st.sel = null; st.multi = []; st.selDay = null; st.cropId = null; st.editing = null; st.lastKey = null;
      });
    },

    select: (id, day = null) =>
      set((st) => {
        st.sel = id;
        st.multi = [];
        st.selDay = day;
        if (st.cropId && st.cropId !== id) st.cropId = null;
        if (st.editing && st.editing.id !== id) st.editing = null;
      }),

    selectMany: (ids) => {
      if (ids.length < 2) return get().select(ids[0] ?? null);
      set((st) => {
        st.sel = null;
        st.multi = ids;
        st.selDay = null;
        st.cropId = null;
        st.editing = null;
      });
    },

    set: (patch) => set((st) => void Object.assign(st, patch)),

    showToast: (msg) => set((st) => void (st.toast = { msg, n: (st.toast?.n ?? 0) + 1 })),

    hydrate: (doc) =>
      set((st) => {
        if (doc) st.doc = doc;
        st.ready = true;
      }),
  })),
);

/* ---------- selectors ---------- */
export const curPage = (doc: CalendarDoc): Page => doc.pages[doc.cur] ?? doc.pages[0];
export const findEl = (doc: CalendarDoc, id: string | null): El | undefined => (id ? curPage(doc).els.find((e) => e.id === id) : undefined);
export const usePage = () => useStudioStore((s) => curPage(s.doc));
/** Every selected element id: the multi-selection, or the single selection. */
export const selIds = (s: { sel: string | null; multi: string[] }): string[] => (s.multi.length ? s.multi : s.sel ? [s.sel] : []);
export const useSelEl = () => useStudioStore((s) => findEl(s.doc, s.sel));

/** Patch fields of an element on the current page; consecutive edits of the same field merge into one undo step. */
export function updateEl<T extends El>(id: string, patch: Partial<T>, key?: string) {
  useStudioStore.getState().mutate((d) => {
    const el = findEl(d, id);
    if (el) Object.assign(el, patch);
  }, { key: key ?? `el:${id}:${Object.keys(patch).join(',')}` });
}

export const toast = (msg: string) => useStudioStore.getState().showToast(msg);
export { STORAGE_KEY };
