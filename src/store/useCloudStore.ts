import { create } from 'zustand';
import { renameDesign, type Role } from '@/lib/cloud/designs';
import type { SyncStatus } from '@/lib/cloud/sync';
import { toast } from './useStudioStore';

/** Someone else in the same design (filled in by live collaboration). */
export type Presence = { key: string; name: string; color: string; page: number; sel: string[] };

interface CloudState {
  /** The open cloud design, or null on the local editor. */
  designId: string | null;
  role: Role | null;
  name: string;
  status: SyncStatus;
  others: Presence[];
  /** Renames the open design (owner only); the new name shows at once. */
  setName(n: string): Promise<void>;
  /** Starts (or, with null, ends) a cloud session, resetting everything else. */
  begin(designId: string | null): void;
  patch(p: Partial<Pick<CloudState, 'role' | 'name' | 'status' | 'others'>>): void;
}

const CONNECTING: SyncStatus = { state: 'connecting', pending: false };

export const useCloudStore = create<CloudState>((set, get) => ({
  designId: null,
  role: null,
  name: '',
  status: CONNECTING,
  others: [],

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
    set({ designId, role: null, name: '', status: CONNECTING, others: [] });
  },

  patch(p) {
    set(p);
  },
}));
