import { useRef, useState } from 'react';
import { imageFiles } from '../useAdminProductsHandler';

/** The "add products" area: drop or pick pictures, and each one becomes a new product. */
export function useAddZoneHandler(add: (files: File[]) => Promise<void>) {
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const take = (files: FileList | null | undefined) => {
    const pics = imageFiles(files);
    if (pics.length) void add(pics);
  };
  return {
    over,
    picker,
    openPicker: () => picker.current?.click(),
    picked: (e: React.ChangeEvent<HTMLInputElement>) => {
      take(e.target.files);
      e.target.value = '';
    },
    drop: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      },
    },
  };
}
