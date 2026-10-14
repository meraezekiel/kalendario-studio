import type { DragEvent } from 'react';
import { addFiles, addGraphic, placeAsset } from '@/store/actions';
import { useStudioStore } from '@/store/useStudioStore';
import { ASSET_MIME, GRAPHIC_MIME } from '@/lib/calendar/constants';
import { dropTarget } from './usePointerHandler';

/** Dropping graphics, tray photos or files from the computer onto frames, days or the page. */
export function useDropHandler(pagePt: (e: { clientX: number; clientY: number }) => { x: number; y: number }) {
  const clearOver = (root: HTMLElement) => root.querySelectorAll('.dropover').forEach((x) => x.classList.remove('dropover'));

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    clearOver(e.currentTarget);
    const t = e.target as HTMLElement;
    (t.closest('.cell[data-day]') || t.closest('.el-image'))?.classList.add('dropover');
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) clearOver(e.currentTarget);
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    clearOver(e.currentTarget);
    if (!e.currentTarget.querySelector('.page')) return;
    const pt = pagePt(e);
    const graphic = e.dataTransfer.getData(GRAPHIC_MIME);
    if (graphic) return addGraphic(graphic, pt);
    const tg = dropTarget(e.target as HTMLElement);
    let id = e.dataTransfer.getData(ASSET_MIME);
    if (!id && e.dataTransfer.files.length) id = (await addFiles([...e.dataTransfer.files]))[0];
    if (id && useStudioStore.getState().doc.assets[id]) placeAsset(id, tg, pt);
  };

  return { onDragOver, onDragLeave, onDrop };
}
