import { useEffect } from 'react';
import { addFiles, placeAsset } from '@/store/actions';

/** Pasting an image from the clipboard adds it to the tray and onto the page. */
export function usePasteHandler() {
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const fs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
      if (!fs.length) return;
      e.preventDefault();
      const ids = await addFiles(fs);
      if (ids[0]) placeAsset(ids[0], null);
    };
    addEventListener('paste', onPaste);
    return () => removeEventListener('paste', onPaste);
  }, []);
}
