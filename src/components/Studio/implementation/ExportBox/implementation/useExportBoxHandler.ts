import { useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { offerThanks } from '@/store/actions';
import { loadPhotos } from '@/store/usePhotoUrlStore';
import { curPage, toast, useStudioStore } from '@/store/useStudioStore';

/** While exporting, renders the current page offscreen and downloads it as a 2.5× PNG. */
export function useExportBoxHandler() {
  const exporting = useStudioStore((s) => s.exporting);
  const page = useStudioStore((s) => (s.exporting ? curPage(s.doc) : null));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exporting) return;
    let cancelled = false;
    (async () => {
      try {
        await document.fonts.ready;
        // Cloud photos must be downloaded and drawn first, or the PNG gets empty frames.
        await loadPhotos(Object.values(useStudioStore.getState().doc.assets).map((a) => a.src));
        const node = ref.current?.firstElementChild as HTMLElement | null;
        if (!node || cancelled) return;
        const url = await toPng(node, { pixelRatio: 2.5 });
        const { doc } = useStudioStore.getState();
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar-${doc.year}-page-${doc.cur + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast('PNG saved to your downloads.');
        offerThanks();
      } catch {
        toast('PNG export failed. Use Print and choose “Save as PDF” instead.');
      } finally {
        if (!cancelled) useStudioStore.getState().set({ exporting: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exporting]);

  return { ref, page };
}
