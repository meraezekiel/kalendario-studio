import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDesign, type DesignRow, listMine, listShared, removeDesign, renameDesign } from '@/lib/cloud/designs';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { CloudError } from '@/lib/cloud/transport';
import { useAuthStore } from '@/store/useAuthStore';
import { freshDoc } from '@/store/useStudioStore';

export type DesignsTab = 'mine' | 'shared';

export const TABS: { id: DesignsTab; label: string }[] = [
  { id: 'mine', label: 'My designs' },
  { id: 'shared', label: 'Shared with me' },
];

const MAX_DESIGNS = 50;
const LIMIT_MSG = "You've reached 50 designs. Delete one to make room.";

/** My designs: lists the account's own and shared designs; creates, renames and deletes. */
export function useDesignsHandler() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authReady = useAuthStore((s) => s.ready);
  const [tab, setTab] = useState<DesignsTab>('mine');
  const [mine, setMine] = useState<DesignRow[] | null>(null);
  const [shared, setShared] = useState<DesignRow[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => useAuthStore.getState().init(), []);

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([listMine(), listShared()]);
      setMine(m);
      setShared(s);
    } catch {
      setError('Could not load your designs. Check your connection and try again.');
      setMine((v) => v ?? []);
      setShared((v) => v ?? []);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      // Signing out from here routes to / itself.
      if (!useAuthStore.getState().leaving) router.replace(`/login?next=${encodeURIComponent('/designs')}`);
      return;
    }
    void load();
  }, [authReady, userId, router, load]);

  const create = async () => {
    if (creating) return;
    setError('');
    if ((mine?.length ?? 0) >= MAX_DESIGNS) return setError(LIMIT_MSG);
    setCreating(true);
    try {
      const id = await createDesign(freshDoc());
      router.push(`/d/${id}`);
    } catch (e) {
      setError(e instanceof CloudError && e.code === 'limit' ? LIMIT_MSG : 'Could not create a design. Please try again.');
      setCreating(false);
    }
  };

  const rename = async (id: string, name: string) => {
    const was = mine?.find((d) => d.id === id)?.name;
    const next = name.trim() || 'Untitled calendar';
    if (next === was) return;
    setError('');
    setMine((list) => list?.map((d) => (d.id === id ? { ...d, name: next } : d)) ?? null);
    try {
      await renameDesign(id, next);
    } catch {
      setMine((list) => list?.map((d) => (d.id === id && was !== undefined ? { ...d, name: was } : d)) ?? null);
      setError('Could not rename the design. Please try again.');
    }
  };

  const remove = async (id: string) => {
    setError('');
    try {
      await removeDesign(id);
      setMine((list) => list?.filter((d) => d.id !== id) ?? null);
    } catch {
      setError('Could not delete the design. Please try again.');
    }
  };

  const list = tab === 'mine' ? mine : shared;
  return {
    enabled: cloudEnabled(),
    signedIn: !!userId,
    tab,
    setTab,
    list,
    loading: list === null,
    empty: tab === 'mine' ? 'No designs yet. Start one with New design.' : 'Nothing has been shared with you yet.',
    error,
    creating,
    create,
    rename,
    remove,
  };
}
