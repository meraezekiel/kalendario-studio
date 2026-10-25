import { create } from 'zustand';
import { type LibraryPhoto, listLibrary } from '@/lib/cloud/photos';

interface LibraryState {
  /** The signed-in account's library photos, newest first; null until first loaded. */
  photos: LibraryPhoto[] | null;
  /** Loads the list again (after an upload, an unlink, or opening the Photos panel). Failures keep the old list. */
  refresh(): Promise<void>;
  /** Takes a deleted photo off the list. */
  drop(src: string): void;
  /** Forgets the list (on sign-out). */
  clear(): void;
}

/** Bumped by clear(): a list still loading for the previous account is thrown away. */
let epoch = 0;

export const useLibraryStore = create<LibraryState>((set) => ({
  photos: null,
  async refresh() {
    const started = epoch;
    try {
      const photos = await listLibrary();
      if (started === epoch) set({ photos });
    } catch {
      // offline or signed out: keep what's shown
    }
  },
  drop(src) {
    set((s) => ({ photos: s.photos?.filter((p) => p.src !== src) ?? null }));
  },
  clear() {
    epoch++;
    set({ photos: null });
  },
}));
