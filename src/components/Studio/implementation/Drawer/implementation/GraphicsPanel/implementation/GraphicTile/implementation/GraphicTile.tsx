'use client';

import type { DragEvent } from 'react';
import type { Graphic } from '@/lib/graphics/library';
import { useGraphicTileHandler } from './useGraphicTileHandler';

interface Props {
  g: Graphic;
  onAdd: (g: Graphic) => void;
  onDragStart: (e: DragEvent, g: Graphic) => void;
}

/** One clickable, draggable graphic in the library. */
export default function GraphicTile({ g, onAdd, onDragStart }: Props) {
  const { src, className } = useGraphicTileHandler(g);
  return (
    <button className={className} title={g.label} aria-label={g.label} draggable onClick={() => onAdd(g)} onDragStart={(e) => onDragStart(e, g)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG thumbnail */}
      <img src={src} alt="" loading="lazy" draggable={false} />
    </button>
  );
}
