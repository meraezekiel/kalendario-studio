'use client';

import { get, set } from 'idb-keyval';
import { create } from 'zustand';
import { applyMyTemplate, isMyTemplate, makeMyTemplate, MY_TEMPLATES_KEY, type MyTemplate } from '@/lib/templates/myTemplates';
import { toast, useStudioStore } from './useStudioStore';

interface MyTemplatesState {
  list: MyTemplate[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Saves the current calendar as a template; false when the browser refused to store it. */
  save: (name: string) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  apply: (id: string) => void;
}

const write = (list: MyTemplate[]) => set(MY_TEMPLATES_KEY, list);

/** Templates the user saved from their own designs. Unlike the built-in ones, these can be deleted. */
export const useMyTemplatesStore = create<MyTemplatesState>()((setState, getState) => ({
  list: [],
  loaded: false,
  load: async () => {
    if (getState().loaded) return;
    const saved = await get(MY_TEMPLATES_KEY).catch(() => null);
    setState({ list: Array.isArray(saved) ? saved.filter(isMyTemplate) : [], loaded: true });
  },
  save: async (name) => {
    const t = makeMyTemplate(useStudioStore.getState().doc, name);
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
      await write(list);
    } catch {
      return toast('Could not delete the template. Please try again.');
    }
    setState({ list });
    if (t) toast(`Deleted “${t.name}”.`);
  },
  apply: (id) => {
    const t = getState().list.find((x) => x.id === id);
    if (!t) return;
    const st = useStudioStore.getState();
    st.mutate((d) => applyMyTemplate(d, t));
    st.select(null);
    toast(`${t.name}: ${t.pages.length} page${t.pages.length > 1 ? 's' : ''} ready. Press Undo to go back.`);
  },
}));
