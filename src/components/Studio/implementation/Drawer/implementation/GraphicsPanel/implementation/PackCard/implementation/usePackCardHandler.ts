import { useMemo } from 'react';
import { type GraphicCategory, thumbSrc } from '@/lib/graphics/library';

/** How many previews a pack card shows. */
const PREVIEWS = 6;

export function usePackCardHandler(pack: GraphicCategory) {
  const previews = useMemo(() => pack.items.slice(0, PREVIEWS).map((g) => ({ key: g.key, src: thumbSrc(g) })), [pack]);
  return { previews, count: `${pack.items.length} graphics` };
}
