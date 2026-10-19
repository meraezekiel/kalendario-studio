import { useMemo } from 'react';
import { people } from '@/lib/cloud/presence';
import { useCloudStore } from '@/store/useCloudStore';

const MAX_SHOWN = 5;

/** Other people in this design, once each (however many tabs they have open). */
export function usePresenceHandler() {
  const others = useCloudStore((s) => s.others);
  const list = useMemo(() => people(others), [others]);
  return {
    shown: list.slice(0, MAX_SHOWN).map((p) => ({ uid: p.uid, name: p.name, color: p.color, initial: p.name.trim().charAt(0).toUpperCase() || '?' })),
    more: Math.max(0, list.length - MAX_SHOWN),
    moreNames: list.slice(MAX_SHOWN).map((p) => p.name).join(', '),
  };
}
