'use client';

import type { GraphicEl } from '@/lib/calendar/types';
import { useGraphicElementHandler } from './useGraphicElementHandler';

export default function GraphicElement({ el }: { el: GraphicEl }) {
  const { src, style } = useGraphicElementHandler(el);
  // eslint-disable-next-line @next/next/no-img-element -- static SVG that must also render in print and PNG export
  return <img className="gfx" src={src} alt="" draggable={false} style={style} />;
}
