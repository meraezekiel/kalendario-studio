import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setNavigate } from '@/store/actions';
import { useCloudStore } from '@/store/useCloudStore';
import { useStudioStore } from '@/store/useStudioStore';
import { useCloudSessionHandler } from './handler/useCloudSessionHandler';
import { useKeyboardHandler } from './handler/useKeyboardHandler';
import { usePasteHandler } from './handler/usePasteHandler';
import { usePersistenceHandler } from './handler/usePersistenceHandler';

/** `designId` set: a cloud design (`/d/[id]`); otherwise the local editor (`/`). */
export function useStudioHandler(designId?: string) {
  // The route fixes the mode for the life of this Studio, so the same hook runs on every render.
  designId ? useCloudSessionHandler(designId) : usePersistenceHandler();
  useKeyboardHandler();
  usePasteHandler();
  const router = useRouter();
  useEffect(() => setNavigate((path) => router.push(path)), [router]);
  const storeReady = useStudioStore((s) => s.ready);
  const session = useCloudStore((s) => s.designId);
  const denied = useCloudStore((s) => !!designId && s.designId === designId && s.status.state === 'denied');
  // In cloud mode the store must hold this design, not whatever the previous screen left in it.
  const ready = storeReady && (!designId || session === designId);
  // Losing access while editing keeps the editor open (the top bar says so); before that, it's a dead end.
  const readOnly = useStudioStore((s) => s.readOnly);
  return { ready, denied: denied && !ready, readOnly };
}
