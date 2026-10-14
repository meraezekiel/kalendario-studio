'use client';

import type { GraphicCategory } from '@/lib/graphics/library';
import { usePackCardHandler } from './usePackCardHandler';

/** An illustration pack: six previews, its name and size. Opens the pack. */
export default function PackCard({ pack, onOpen }: { pack: GraphicCategory; onOpen: (id: string) => void }) {
  const { previews, count } = usePackCardHandler(pack);
  return (
    <button className="pack" onClick={() => onOpen(pack.id)} aria-label={`${pack.label}, ${count}`} data-testid={`pack-${pack.id}`}>
      <span className="pack-prev">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG previews */}
        {previews.map((p) => <img key={p.key} src={p.src} alt="" loading="lazy" draggable={false} />)}
      </span>
      <b>{pack.label}</b>
      <small>{count}</small>
    </button>
  );
}
