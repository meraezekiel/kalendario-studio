import { useState } from 'react';
import { useMyTemplatesStore } from '@/store/useMyTemplatesStore';

export function useSaveTemplateModalHandler(onClose: () => void) {
  const count = useMyTemplatesStore((s) => s.list.length);
  const [name, setName] = useState(`My template ${count + 1}`);
  const [busy, setBusy] = useState(false);
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    const ok = await useMyTemplatesStore.getState().save(name);
    setBusy(false);
    if (ok) onClose();
  };
  return { name, setName, busy, submit };
}
