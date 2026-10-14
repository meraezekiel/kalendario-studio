import { useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
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
