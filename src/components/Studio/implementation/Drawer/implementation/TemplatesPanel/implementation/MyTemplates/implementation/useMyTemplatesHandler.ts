import { useEffect, useState } from 'react';
import { DW } from '@/lib/calendar/constants';
import { dims } from '@/lib/calendar/document';
import { useAuthStore } from '@/store/useAuthStore';
import { useMyTemplatesStore } from '@/store/useMyTemplatesStore';

const THUMB_W = 118;

export function useMyTemplatesHandler() {
  const list = useMyTemplatesStore((s) => s.list);
  const loaded = useMyTemplatesStore((s) => s.loaded);
  const inAccount = useMyTemplatesStore((s) => !!s.owner);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authReady = useAuthStore((s) => s.ready);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => useAuthStore.getState().init(), []);
  // Signed in, the list is the account's; signed out, this browser's. Reloads when that changes.
  useEffect(() => {
    if (authReady) void useMyTemplatesStore.getState().load();
  }, [authReady, userId]);

  const s = THUMB_W / DW;
  const items = list.map((t) => ({ id: t.id, name: t.name, page: t.pages[0], assets: t.assets, scale: s, height: Math.round(dims(t.pages[0]).H * s) }));
  return {
    items,
    loaded,
    inAccount,
    saving,
    openSave: () => setSaving(true),
    closeSave: () => setSaving(false),
    deleting: list.find((t) => t.id === deleting) ?? null,
    askDelete: setDeleting,
    closeDelete: () => setDeleting(null),
    apply: (id: string) => void useMyTemplatesStore.getState().apply(id),
  };
}
