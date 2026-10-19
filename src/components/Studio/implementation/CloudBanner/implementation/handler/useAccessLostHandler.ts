import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCopy } from '@/store/actions';
import { useCloudStore } from '@/store/useCloudStore';

/** In a cloud design whose access went while it was open: save what's here as a copy, or leave. */
export function useAccessLostHandler(cloud: boolean) {
  const router = useRouter();
  const lost = useCloudStore((s) => cloud && !!s.designId && s.status.state === 'denied');
  const [saving, setSaving] = useState(false);
  return {
    lost,
    saving,
    copy: async () => {
      setSaving(true);
      try {
        await saveCopy();
      } finally {
        setSaving(false);
      }
    },
    close: () => router.push('/designs'),
  };
}
