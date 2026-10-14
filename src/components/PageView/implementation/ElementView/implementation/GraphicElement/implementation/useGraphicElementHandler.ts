import { type CSSProperties, useMemo } from 'react';
import { decoDataUrl, type DecoKind, type PaletteId } from '@/lib/graphics/deco';
import { findGraphic, graphicUrl, isDeco } from '@/lib/graphics/library';
import type { GraphicEl } from '@/lib/calendar/types';

export function useGraphicElementHandler(el: GraphicEl) {
  const g = findGraphic(el.key);
  const deco = isDeco(el.key) && g?.deco ? g.deco.kind : null;
  // Decorations are re-drawn for the element's size, so they never look stretched.
  const src = useMemo(
    () =>
      deco
        ? decoDataUrl(deco as DecoKind, el.w, el.h, { palette: (el.palette ?? 'rainbow') as PaletteId, seed: el.seed ?? 1, amount: el.amount ?? 1 })
        : graphicUrl(el.key),
    [deco, el.key, el.w, el.h, el.palette, el.seed, el.amount],
  );
  const style: CSSProperties = {
    objectFit: g?.stretch ? 'fill' : 'contain',
    transform: el.flipX || el.flipY ? `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})` : undefined,
  };
  return { src, style };
}
