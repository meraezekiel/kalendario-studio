import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { markClean } from '@/lib/cloud/dirty';
import { saveCopy } from '@/store/actions';
import { useCloudStore } from '@/store/useCloudStore';

/**
 * In a cloud design whose access went (while it was open, or before this browser's copy was opened
 * again): save what's here as a copy, or leave. Either way its unsent edits stop counting as unsent.
 */
export function useAccessLostHandler(cloud: boolean) {
  const router = useRouter();
  const lost = useCloudStore((s) => cloud && !!s.designId && s.status.state === 'denied');
  const [saving, setSaving] = useState(false);
  const designId = () => useCloudStore.getState().designId;
  return {
    lost,
    saving,
    copy: async () => {
      const id = designId();
      setSaving(true);
      try {
        if ((await saveCopy()) && id) markClean(id);
      } finally {
        setSaving(false);
      }
    },
    close: () => {
      const id = designId();
      if (id) markClean(id);
      router.push('/designs');
    },
  };
}
