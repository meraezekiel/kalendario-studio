'use client';

import { get, set } from 'idb-keyval';
import { create } from 'zustand';
import { embedPhotos, photosOf } from '@/lib/cloud/photos';
import { applyCloudTemplate, listTemplates, removeTemplate, saveTemplate } from '@/lib/cloud/templates';
import { CloudError } from '@/lib/cloud/transport';
import { applyMyTemplate, isMyTemplate, makeMyTemplate, MY_TEMPLATES_KEY, type MyTemplate } from '@/lib/templates/myTemplates';
import { PHOTO_SPACE_FULL, skippedPhotosNote } from './actions';
import { useAuthStore } from './useAuthStore';
import { useCloudStore } from './useCloudStore';
import { toast, useStudioStore } from './useStudioStore';

interface MyTemplatesState {
  list: MyTemplate[];
  loaded: boolean;
  /** Whose templates `list` holds: a user's (kept in their account), or null for this browser's. */
  owner: string | null;
  /** Loads the list for whoever is signed in now (again only when that changed). */
  load: () => Promise<void>;
  /** Saves the current calendar as a template; false when it couldn't be stored. */
  save: (name: string) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  apply: (id: string) => Promise<void>;
}

const write = (list: MyTemplate[]) => set(MY_TEMPLATES_KEY, list);
const readLocal = async (): Promise<MyTemplate[]> => {
  const saved = await get(MY_TEMPLATES_KEY).catch(() => null);
  return Array.isArray(saved) ? saved.filter(isMyTemplate) : [];
};
const userId = () => useAuthStore.getState().user?.id ?? null;

/** localStorage that never throws (blocked or private windows). */
const flag = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // not remembered: the copy is tried again next time
    }
  },
};

/** A sentence for a failed cloud call about templates. */
function cloudMessage(e: unknown, what: string): string {
  if (e instanceof CloudError && e.code === 'limit') return PHOTO_SPACE_FULL;
  if (e instanceof CloudError && e.code === 'offline') return `You're offline. Try again once you're back online.`;
  return `Could not ${what}. Please try again.`;
}

const skippedNote = (n: number) => (n ? ` ${skippedPhotosNote(n)}` : '');

let warnedFull = false;

/**
 * The first time `uid` signs in here, copies this browser's templates into their account once. The
 * local copies stay. Done ones are remembered, so an interrupted copy carries on without repeats.
 */
async function copyLocalTemplates(uid: string) {
  const DONE = `kal-tpl-migrated-${uid}`;
  if (flag.get(DONE)) return;
  const PART = `${DONE}-part`;
  let part: string[] = [];
  try {
    part = JSON.parse(flag.get(PART) ?? '[]');
  } catch {
    part = [];
  }
  // Oldest first, like they were saved.
  for (const t of (await readLocal()).reverse()) {
    if (part.includes(t.id)) continue;
    if (userId() !== uid) return;
    try {
      await saveTemplate(t);
    } catch (e) {
      if (e instanceof CloudError && (e.code === 'offline' || e.code === 'auth')) return; // next time
      if (e instanceof CloudError && e.code === 'limit') {
        if (!warnedFull) toast(`Some of your templates couldn't be copied to your account. ${PHOTO_SPACE_FULL}`);
        warnedFull = true;
        return;
      }
      // Anything else about this one template: leave it in this browser.
    }
    part.push(t.id);
    flag.set(PART, JSON.stringify(part));
  }
  flag.set(DONE, '1');
}

let loading: { uid: string | null; p: Promise<void> } | null = null;

/** Templates the user saved from their own designs. Unlike the built-in ones, these can be deleted. */
export const useMyTemplatesStore = create<MyTemplatesState>()((setState, getState) => ({
  list: [],
  loaded: false,
  owner: null,
  load: () => {
    const uid = userId();
    if (getState().loaded && getState().owner === uid) return Promise.resolve();
    if (loading?.uid === uid) return loading.p;
    if (getState().owner !== uid) setState({ list: [], loaded: false, owner: uid });
    const p = (async () => {
      if (!uid) {
        const list = await readLocal();
        if (userId() === null) setState({ list, loaded: true, owner: null });
        return;
      }
      await copyLocalTemplates(uid).catch(() => {});
      try {
        const list = await listTemplates();
        if (userId() === uid) setState({ list, loaded: true, owner: uid });
      } catch {
        if (userId() === uid) toast('Could not load your templates. Check your connection and try again.');
      }
    })().finally(() => {
      if (loading?.p === p) loading = null;
    });
    loading = { uid, p };
    return p;
  },
  save: async (name) => {
    const t = makeMyTemplate(useStudioStore.getState().doc, name);
    const uid = userId();
    if (uid) {
      let skipped = 0;
      let saved: MyTemplate;
      try {
        saved = await saveTemplate(t, (n) => (skipped = n));
      } catch (e) {
        toast(cloudMessage(e, 'save the template'));
        return false;
      }
      if (getState().owner === uid) setState({ list: [saved, ...getState().list] });
      toast(`Saved “${saved.name}” to My templates.${skippedNote(skipped)}`);
      return true;
    }
    const list = [t, ...getState().list];
    try {
      await write(list);
    } catch {
      toast('Could not save the template in this browser. Try Save design file instead.');
      return false;
    }
    setState({ list });
    toast(`Saved “${t.name}” to My templates.`);
    return true;
  },
  remove: async (id) => {
    const t = getState().list.find((x) => x.id === id);
    const list = getState().list.filter((x) => x.id !== id);
    try {
      if (getState().owner) await removeTemplate(id);
      else await write(list);
    } catch {
      return toast('Could not delete the template. Please try again.');
    }
    setState({ list: getState().list.filter((x) => x.id !== id) });
    if (t) toast(`Deleted “${t.name}”.`);
  },
  apply: async (id) => {
    let t = getState().list.find((x) => x.id === id);
    if (!t) return;
    const st = useStudioStore.getState();
    const designId = useCloudStore.getState().designId;
    let skipped = 0;
    if (designId) {
      if (st.readOnly) return st.mutate(() => {}); // says the design is view only
      // Its photos are copied into this design, which never points into another's folder. Ones the
      // design already has (the same template applied before) are kept as they are by applyMyTemplate.
      const missing = Object.fromEntries(Object.entries(t.assets).filter(([aid]) => !st.doc.assets[aid]));
      try {
        ({ template: t, skipped } = await applyCloudTemplate(designId, { ...t, assets: missing }));
      } catch (e) {
        return toast(cloudMessage(e, 'use the template'));
      }
      if (useCloudStore.getState().designId !== designId) return;
    } else if (photosOf({ ...st.doc, assets: t.assets }).length) {
      // An account template on this browser's calendar: its photos come along as data.
      try {
        t = { ...t, assets: (await embedPhotos({ ...st.doc, assets: t.assets })).assets };
      } catch {
        return toast("Couldn't get this template's photos. Check your connection and try again.");
      }
    }
    const use = t;
    useStudioStore.getState().mutate((d) => applyMyTemplate(d, use));
    useStudioStore.getState().select(null);
    toast(`${use.name}: ${use.pages.length} page${use.pages.length > 1 ? 's' : ''} ready. Press Undo to go back.${skippedNote(skipped)}`);
  },
}));
