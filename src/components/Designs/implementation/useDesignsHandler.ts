import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveAccount, declineAccount, listRequests, type SignUpRequest } from '@/lib/cloud/approval';
import { createDesign, type DesignRow, listMine, listShared, removeDesign, renameDesign } from '@/lib/cloud/designs';
import { markClean } from '@/lib/cloud/dirty';
import { DESIGNS_FULL, MAX_DESIGNS } from '@/lib/cloud/limits';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { CloudError } from '@/lib/cloud/transport';
import { useAuthStore } from '@/store/useAuthStore';
import { freshDoc } from '@/store/useStudioStore';

export type DesignsTab = 'mine' | 'shared' | 'requests';

const TABS: { id: DesignsTab; label: string }[] = [
  { id: 'mine', label: 'My designs' },
  { id: 'shared', label: 'Shared with me' },
];

/** My designs: lists the account's own and shared designs; creates, renames and deletes. */
export function useDesignsHandler() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authReady = useAuthStore((s) => s.ready);
  const admin = useAuthStore((s) => s.admin);
  const [tab, setTab] = useState<DesignsTab>('mine');
  const [mine, setMine] = useState<DesignRow[] | null>(null);
  const [shared, setShared] = useState<DesignRow[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  /** The admin's sign-ups waiting for approval. */
  const [requests, setRequests] = useState<SignUpRequest[] | null>(null);

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

  useEffect(() => {
    if (!admin) return setRequests(null);
    listRequests().then(setRequests, () => {
      setError('Could not load the sign-up requests. Check your connection and try again.');
      setRequests((v) => v ?? []);
    });
  }, [admin, userId]);

  const approve = async (id: string) => {
    setError('');
    try {
      await approveAccount(id);
      setRequests((list) => list?.filter((r) => r.user_id !== id) ?? null);
    } catch {
      setError('Could not approve that account. Please try again.');
    }
  };

  const decline = async (id: string) => {
    setError('');
    try {
      await declineAccount(id);
      setRequests((list) => list?.filter((r) => r.user_id !== id) ?? null);
    } catch {
      setError('Could not decline that account. Please try again.');
    }
  };

  const create = async () => {
    if (creating) return;
    setError('');
    if ((mine?.length ?? 0) >= MAX_DESIGNS) return setError(DESIGNS_FULL);
    setCreating(true);
    try {
      const id = await createDesign(freshDoc());
      router.push(`/d/${id}`);
    } catch (e) {
      setError(e instanceof CloudError && e.code === 'limit' ? DESIGNS_FULL : 'Could not create a design. Please try again.');
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
      markClean(id); // its unsent edits went with it
      setMine((list) => list?.filter((d) => d.id !== id) ?? null);
    } catch {
      setError('Could not delete the design. Please try again.');
    }
  };

  const list = tab === 'mine' ? mine : tab === 'shared' ? shared : requests;
  return {
    enabled: cloudEnabled(),
    signedIn: !!userId,
    tabs: admin ? [...TABS, { id: 'requests' as const, label: requests?.length ? `Sign-ups (${requests.length})` : 'Sign-ups' }] : TABS,
    tab,
    setTab,
    list: tab === 'requests' ? null : (list as DesignRow[] | null),
    loading: list === null,
    requests: tab === 'requests' ? (requests ?? []) : null,
    approve,
    decline,
    empty: tab === 'mine' ? 'No designs yet. Start one with New design.' : 'Nothing has been shared with you yet.',
    error,
    creating,
    create,
    rename,
    remove,
  };
}
