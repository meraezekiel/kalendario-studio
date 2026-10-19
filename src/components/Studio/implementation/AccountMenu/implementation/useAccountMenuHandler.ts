import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { photoUsage } from '@/lib/cloud/photos';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { useAuthStore } from '@/store/useAuthStore';

/** Bytes as MB with one decimal; anything stored shows as at least 0.1. */
const mb = (bytes: number) => (bytes > 0 ? Math.max(0.1, bytes / 1048576) : 0).toFixed(1);

export function useAccountMenuHandler() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => useAuthStore.getState().init(), []);

  // Photo space used, fetched fresh each time the menu opens; hidden when it can't be read.
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => {
    if (!open || !user) return;
    let live = true;
    photoUsage().then(
      (b) => live && setUsed(b),
      () => live && setUsed(null),
    );
    return () => {
      live = false;
    };
  }, [open, user]);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    try {
      await useAuthStore.getState().signOut();
    } catch {
      // Already signed out on the server (or offline); the local session is cleared either way.
    }
    // My designs and cloud designs need an account; signed out, the local editor is the place to be.
    if (location.pathname !== '/') router.push('/');
  };

  return {
    enabled: cloudEnabled(),
    ready,
    user,
    initial: (user?.name || user?.email || '?').charAt(0).toUpperCase(),
    open,
    usage: used == null ? null : `${mb(used)} MB of 50 MB used`,
    toggle: () => {
      setUsed(null); // no stale figure while the fresh one loads
      setOpen((o) => !o);
    },
    box,
    signOut,
  };
}
