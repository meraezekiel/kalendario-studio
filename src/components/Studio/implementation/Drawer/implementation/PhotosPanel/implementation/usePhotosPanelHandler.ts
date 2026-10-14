import type { DragEvent } from 'react';
import { ASSET_MIME } from '@/lib/calendar/constants';
import { pickFiles, placeAsset, removeTrayItem } from '@/store/actions';
import { useStudioStore } from '@/store/useStudioStore';

export function usePhotosPanelHandler() {
  const tray = useStudioStore((s) => s.doc.tray);
  const assets = useStudioStore((s) => s.doc.assets);
  const armed = useStudioStore((s) => s.armed);

  const items = tray.flatMap((id, i) => (assets[id] ? [{ id, i, src: assets[id].src }] : []));

  return {
    items,
    armed,
    upload: () => pickFiles('tray', true),
    /** Tap a photo to arm it, then tap the page to place it (works on touch screens). */
    toggleArm: (i: number) => useStudioStore.getState().set({ armed: armed === i ? null : i }),
    addToPage: (id: string) => placeAsset(id, null),
    remove: removeTrayItem,
    onDragStart: (e: DragEvent, id: string) => {
      e.dataTransfer.setData(ASSET_MIME, id);
      e.dataTransfer.effectAllowed = 'copy';
    },
  };
}
