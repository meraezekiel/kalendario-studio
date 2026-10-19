import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { importDoc, sameDesign } from '@/lib/cloud/importDoc';
import { importMessage, skippedPhotosNote, uploadingNote } from '@/store/actions';
import { useAuthStore } from '@/store/useAuthStore';
import { freshDoc, toast, useStudioStore } from '@/store/useStudioStore';

/** Web storage that never throws (blocked or private windows). */
function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}
function write(store: () => Storage, key: string, value: string) {
  try {
    store().setItem(key, value);
  } catch {
    // not remembered: the offer may come back
  }
}
const local = () => localStorage;
const session = () => sessionStorage;

/**
 * On the local editor (not `cloud`), signed in: offers once to save this browser's calendar to My designs. Hidden
 * for an untouched new calendar, after it was saved (per user), and for the session after "Not now".
 */
export function useMigrateOfferHandler(cloud: boolean) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const doc = useStudioStore((s) => s.doc);
  const ready = useStudioStore((s) => s.ready);
  const [, rerender] = useState(0);
  const [progress, setProgress] = useState<string | null>(null);
  const fresh = useMemo(() => freshDoc(), []);
  /** Once edited, it stays worth offering (so later changes aren't compared again). */
  const [touched, setTouched] = useState(false);

  const doneKey = user ? `kal-migrated-${user.id}` : '';
  const laterKey = user ? `kal-migrate-later-${user.id}` : '';
  const hidden = cloud || !user || !ready || !!read(local, doneKey) || !!read(session, laterKey);
  useEffect(() => {
    if (!hidden && !touched && !sameDesign(doc, fresh)) setTouched(true);
  }, [hidden, touched, doc, fresh]);

  const save = async () => {
    if (!user || progress) return;
    setProgress('Saving…');
    let skipped = 0;
    let id: string;
    try {
      const d = useStudioStore.getState().doc;
      id = await importDoc(d, `My calendar ${d.year}`, (n, total) => total && setProgress(uploadingNote(n, total)), (n) => (skipped = n));
    } catch (e) {
      setProgress(null);
      toast(importMessage(e));
      return;
    }
    // The local design stays as it is; only the offer goes.
    write(local, doneKey, '1');
    toast(skipped ? skippedPhotosNote(skipped) : 'Saved to My designs.');
    router.push(`/d/${id}`);
  };

  return {
    open: !hidden && (touched || !!progress),
    progress,
    save,
    later: () => {
      write(session, laterKey, '1');
      rerender((n) => n + 1);
    },
  };
}
