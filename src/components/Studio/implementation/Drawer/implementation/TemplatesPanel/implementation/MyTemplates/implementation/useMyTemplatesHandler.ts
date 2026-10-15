import { useEffect, useState } from 'react';
import { DW } from '@/lib/calendar/constants';
import { dims } from '@/lib/calendar/document';
import { useMyTemplatesStore } from '@/store/useMyTemplatesStore';

const THUMB_W = 118;

export function useMyTemplatesHandler() {
  const list = useMyTemplatesStore((s) => s.list);
  const loaded = useMyTemplatesStore((s) => s.loaded);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => void useMyTemplatesStore.getState().load(), []);

  const s = THUMB_W / DW;
  const items = list.map((t) => ({ id: t.id, name: t.name, page: t.pages[0], assets: t.assets, scale: s, height: Math.round(dims(t.pages[0]).H * s) }));
  return {
    items,
    loaded,
    saving,
    openSave: () => setSaving(true),
    closeSave: () => setSaving(false),
    deleting: list.find((t) => t.id === deleting) ?? null,
    askDelete: setDeleting,
    closeDelete: () => setDeleting(null),
    apply: (id: string) => useMyTemplatesStore.getState().apply(id),
  };
}
