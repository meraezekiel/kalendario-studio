import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export function useAccountMenuHandler() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => useAuthStore.getState().init(), []);

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
    toggle: () => setOpen((o) => !o),
    box,
    signOut,
  };
}
