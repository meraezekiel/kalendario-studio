import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { listMembers, normalizeEmail, setRole, share, ShareError, unshare, type Member, type MemberRole } from '@/lib/cloud/members';
import { CloudError } from '@/lib/cloud/transport';

/** What each access level is called. */
export const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'editor', label: 'Can edit' },
  { value: 'viewer', label: 'Can view' },
];

/** A sentence for a failed change to who has access. */
function failure(e: unknown, what: string): string {
  if (e instanceof ShareError) return e.message;
  if (e instanceof CloudError && e.code === 'offline') return "You're offline. Try again once you're back online.";
  return `Could not ${what}. Please try again.`;
}

/** The people design `designId` is shared with, and adding, changing and removing them. */
export function useShareDialogHandler(designId: string) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState('');
  const [role, setNewRole] = useState<MemberRole>('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMembers(await listMembers(designId));
    } catch (e) {
      setMembers((m) => m ?? []);
      setError(failure(e, 'load who has access'));
    }
  }, [designId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await share(designId, email, role);
      setEmail('');
      await load();
    } catch (err) {
      setError(failure(err, 'share it'));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (who: string, next: MemberRole) => {
    setError(null);
    setMembers((m) => m?.map((x) => (x.email === who ? { ...x, role: next } : x)) ?? null);
    try {
      await setRole(designId, who, next);
    } catch (err) {
      setError(failure(err, 'change their access'));
      await load();
    }
  };

  const remove = async (who: string) => {
    setError(null);
    setMembers((m) => m?.filter((x) => x.email !== who) ?? null);
    try {
      await unshare(designId, who);
    } catch (err) {
      setError(failure(err, 'remove them'));
      await load();
    }
  };

  return {
    members,
    email,
    setEmail: (v: string) => {
      setEmail(v);
      setError(null);
    },
    role,
    setRole: setNewRole,
    busy,
    canShare: !busy && normalizeEmail(email) !== '',
    error,
    submit,
    changeRole,
    remove,
  };
}
