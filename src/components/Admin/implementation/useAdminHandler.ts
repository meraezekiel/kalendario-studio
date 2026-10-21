import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type AccountRow, activateAccount, deactivateAccount, declineAccount, listAccounts, waitingCount } from '@/lib/cloud/approval';
import { megabytes } from '@/lib/cloud/limits';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { relativeTime } from '../../Designs/implementation/DesignCard/implementation/useDesignCardHandler';

export type AccountStatus = 'admin' | 'active' | 'waiting' | 'deactivated';

export const STATUS_LABEL: Record<AccountStatus, string> = { admin: 'Admin', active: 'Active', waiting: 'Waiting', deactivated: 'Deactivated' };

export function statusOf(a: AccountRow): AccountStatus {
  if (a.approved_at) return a.admin ? 'admin' : 'active';
  return a.deactivated_at ? 'deactivated' : 'waiting';
}

/** "Signed up 2 days ago · Last sign-in yesterday · 3 designs · 4.2 MB of photos". */
export function accountMeta(a: AccountRow): string {
  return [
    `Signed up ${relativeTime(a.created_at)}`,
    a.last_sign_in_at ? `Last sign-in ${relativeTime(a.last_sign_in_at)}` : 'Never signed in',
    `${a.designs} design${a.designs === 1 ? '' : 's'}`,
    `${megabytes(a.photo_bytes)} of photos`,
  ].join(' · ');
}

/** The admin dashboard: every account, with activate, deactivate and decline. */
export function useAdminHandler() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const ready = useAuthStore((s) => s.ready);
  const admin = useAuthStore((s) => s.admin);
  const [list, setList] = useState<AccountRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => useAuthStore.getState().init(), []);

  const load = useCallback(async () => {
    try {
      const list = await listAccounts();
      setList(list);
      useAuthStore.setState({ signUps: waitingCount(list) });
    } catch {
      setError('Could not load the accounts. Check your connection and try again.');
      setList((v) => v ?? []);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      // Signing out from here routes to / itself.
      if (!useAuthStore.getState().leaving) router.replace(`/login?next=${encodeURIComponent('/admin')}`);
      return;
    }
    if (admin) void load();
  }, [ready, userId, admin, router, load]);

  /** Runs an action on one account, then reloads the list. */
  const act = (call: (id: string) => Promise<void>, failed: string) => async (id: string) => {
    setError('');
    try {
      await call(id);
    } catch {
      setError(failed);
    }
    await load();
  };

  const waiting = list ? waitingCount(list) : 0;
  const stored = list?.reduce((n, a) => n + a.photo_bytes, 0) ?? 0;
  return {
    enabled: cloudEnabled(),
    signedIn: !!userId,
    admin,
    list,
    error,
    summary: list ? `${list.length} account${list.length === 1 ? '' : 's'} · ${waiting} waiting · ${megabytes(stored)} of photos stored` : '',
    activate: act(activateAccount, 'Could not activate that account. Please try again.'),
    deactivate: act(deactivateAccount, 'Could not deactivate that account. Please try again.'),
    decline: act(declineAccount, 'Could not decline that account. Please try again.'),
  };
}
