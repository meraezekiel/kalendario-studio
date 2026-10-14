import { assetFor } from '@/lib/calendar/render';
import type { ImageEl } from '@/lib/calendar/types';
import { fitToPage, pickFiles } from '@/store/actions';
import { curPage, updateEl, useStudioStore } from '@/store/useStudioStore';
import { useBindHandler } from '../../handler/useBindHandler';

export function useImageSectionHandler(el: ImageEl) {
  const bind = useBindHandler(el);
  const has = useStudioStore((s) => !!el.src && !!assetFor(el.src, curPage(s.doc), s.doc.assets));
  const cropping = useStudioStore((s) => s.cropId === el.id);
  const set = useStudioStore.getState().set;

  return {
    bind,
    has,
    cropping,
    isSample: el.src === '@sample',
    upload: () => pickFiles({ img: el.id }, false),
    empty: () => {
      set({ cropId: null });
      updateEl<ImageEl>(el.id, { src: '' });
    },
    fitToPage: () => fitToPage(el.id),
    useSample: () => updateEl<ImageEl>(el.id, { src: '@sample' }),
    toggleCrop: () => set({ cropId: cropping ? null : el.id }),
    circle: () => {
      const s = Math.min(el.w, el.h);
      updateEl<ImageEl>(el.id, { x: el.x + (el.w - s) / 2, y: el.y + (el.h - s) / 2, w: s, h: s, radius: 50, fit: 'cover' });
    },
  };
}
