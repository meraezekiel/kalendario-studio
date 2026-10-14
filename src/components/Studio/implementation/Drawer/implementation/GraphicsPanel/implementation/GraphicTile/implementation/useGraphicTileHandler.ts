import { useMemo } from 'react';
import { type Graphic, thumbSrc } from '@/lib/graphics/library';

export function useGraphicTileHandler(g: Graphic) {
  const src = useMemo(() => thumbSrc(g), [g]);
  return { src, className: `gtile${g.stretch && !g.deco ? ' stretch' : ''}` };
}
