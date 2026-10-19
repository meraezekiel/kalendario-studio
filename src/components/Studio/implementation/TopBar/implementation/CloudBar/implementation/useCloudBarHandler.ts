import { useEffect, useState, type KeyboardEvent } from 'react';
import type { SyncStatus } from '@/lib/cloud/sync';
import { useCloudStore } from '@/store/useCloudStore';

/** What the sync indicator says. */
export function syncLabel(s: SyncStatus): string {
  switch (s.state) {
    case 'auth':
      return 'Sign in again to keep syncing';
    case 'offline':
      return 'Offline, changes kept on this computer';
    case 'denied':
      return "You don't have access to this design.";
    case 'connecting':
      return 'Saving…';
    default:
      return s.pending ? 'Saving…' : 'Saved';
  }
}

export function useCloudBarHandler() {
  const designId = useCloudStore((s) => s.designId);
  const name = useCloudStore((s) => s.name);
  const role = useCloudStore((s) => s.role);
  const status = useCloudStore((s) => s.status);
  const [draft, setDraft] = useState(name);

  // Follow renames (and the name arriving) unless the person is typing one.
  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    if (draft.trim() === name) return;
    void useCloudStore.getState().setName(draft);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') {
      setDraft(name);
      requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
    }
  };

  return {
    cloud: !!designId,
    canRename: role === 'owner',
    name,
    draft,
    setDraft,
    commit,
    onKeyDown,
    state: status.state,
    label: syncLabel(status),
  };
}
