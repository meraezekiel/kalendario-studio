import { type DragEvent, useEffect, useState } from 'react';
import { ASSET_MIME } from '@/lib/calendar/constants';
import type { LibraryPhoto } from '@/lib/cloud/photos';
import { addLibraryPhoto, deleteLibraryPhoto, pickFiles, placeAsset, removeTrayItem } from '@/store/actions';
import { useCloudStore } from '@/store/useCloudStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePhotoUrls } from '@/store/usePhotoUrlStore';
import { useStudioStore } from '@/store/useStudioStore';

export function usePhotosPanelHandler() {
  const tray = useStudioStore((s) => s.doc.tray);
  const assets = useStudioStore((s) => s.doc.assets);
  const armed = useStudioStore((s) => s.armed);
  const designId = useCloudStore((s) => s.designId);
  const library = useLibraryStore((s) => s.photos);
  /** The library photo whose ✕ was pressed once: a second press deletes it. */
  const [deleting, setDeleting] = useState<string | null>(null);

  // The library can change in other designs and tabs: look again whenever the panel opens.
  useEffect(() => {
    if (designId) void useLibraryStore.getState().refresh();
  }, [designId]);

  const listed = tray.flatMap((id, i) => (assets[id] ? [{ id, i, src: assets[id].src }] : []));
  // Library photos this design doesn't have yet.
  const inDesign = new Set(Object.values(assets).map((a) => a.src));
  const more = designId ? (library ?? []).filter((p) => !inDesign.has(p.src)) : [];
  // Cloud photos show once downloaded (null until then: a blank tile).
  const urls = usePhotoUrls([...listed.map((t) => t.src), ...more.map((p) => p.src)]);
  const items = listed.map((t, k) => ({ ...t, src: urls[k] }));
  const others = more.map((p, k) => ({ photo: p, url: urls[listed.length + k], deleting: deleting === p.src }));

  return {
    items,
    others,
    showLibrary: !!designId,
    armed,
    upload: () => pickFiles('tray', true),
    /** Tap a photo to arm it, then tap the page to place it (works on touch screens). */
    toggleArm: (i: number) => useStudioStore.getState().set({ armed: armed === i ? null : i }),
    addToPage: (id: string) => placeAsset(id, null),
    setAsBackground: (id: string) => placeAsset(id, { bg: true }),
    remove: removeTrayItem,
    addFromLibrary: (p: LibraryPhoto) => addLibraryPhoto(p),
    deleteFromLibrary: (p: LibraryPhoto) => {
      if (deleting !== p.src) return setDeleting(p.src);
      setDeleting(null);
      void deleteLibraryPhoto(p);
    },
    onDragStart: (e: DragEvent, id: string) => {
      e.dataTransfer.setData(ASSET_MIME, id);
      e.dataTransfer.effectAllowed = 'copy';
    },
  };
}
