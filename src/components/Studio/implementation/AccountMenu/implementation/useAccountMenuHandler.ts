import { useEffect, useRef, useState } from 'react';
import { megabytes, PHOTO_SPACE_BYTES } from '@/lib/cloud/limits';
import { photoUsage } from '@/lib/cloud/photos';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useGoHome } from './SignOutConfirm/implementation/useSignOutConfirmHandler';

/** Bytes as MB with one decimal; anything stored shows as at least 0.1. */
const mb = (bytes: number) => (bytes > 0 ? Math.max(0.1, bytes / 1048576) : 0).toFixed(1);

export function useAccountMenuHandler() {
  const goHome = useGoHome();
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const admin = useAuthStore((s) => s.admin);
  const waiting = useAuthStore((s) => s.signUps);
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

  // For the admin: how many sign-ups are waiting, read on load, on coming back to the tab, and when the menu opens.
  useEffect(() => {
    if (!admin) return;
    const count = () => void useAuthStore.getState().countSignUps();
    count();
    const onVisible = () => document.visibilityState === 'visible' && count();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [admin]);
  useEffect(() => {
    if (open && admin) void useAuthStore.getState().countSignUps();
  }, [open, admin]);

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
    // False when it asks about unsaved edits first (SignOutConfirm takes it from there).
    if (await useAuthStore.getState().signOut()) goHome();
  };

  return {
    enabled: cloudEnabled(),
    ready,
    user,
    admin,
    /** Shown as a red dot on the avatar (admin only). */
    waiting: admin ? waiting : 0,
    initial: (user?.name || user?.email || '?').charAt(0).toUpperCase(),
    open,
    usage: used == null ? null : `${mb(used)} MB of ${megabytes(PHOTO_SPACE_BYTES)} used`,
    toggle: () => {
      setUsed(null); // no stale figure while the fresh one loads
      setOpen((o) => !o);
    },
    box,
    signOut,
  };
}
