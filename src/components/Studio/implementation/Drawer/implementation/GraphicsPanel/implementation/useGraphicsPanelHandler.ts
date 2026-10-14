import { type DragEvent, useMemo, useState, useSyncExternalStore } from 'react';
import { GRAPHIC_MIME } from '@/lib/calendar/constants';
import { findGraphic, GRAPHIC_CATEGORIES, type Graphic, searchGraphics } from '@/lib/graphics/library';
import { getRecent, getRecentServer, subscribeRecent } from '@/lib/graphics/recent';
import { addGraphic } from '@/store/actions';

/** How many graphics a category shows before "See all". */
export const PREVIEW = 8;

export function useGraphicsPanelHandler() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const recentKeys = useSyncExternalStore(subscribeRecent, getRecent, getRecentServer);

  const recent = useMemo(() => recentKeys.flatMap((k) => findGraphic(k) ?? []), [recentKeys]);
  const results = useMemo(() => searchGraphics(query), [query]);
  const shown = open ? GRAPHIC_CATEGORIES.filter((c) => c.id === open) : GRAPHIC_CATEGORIES.filter((c) => !c.pack);

  return {
    query,
    setQuery,
    searching: query.trim().length > 0,
    results,
    recent,
    open,
    categories: shown,
    packs: open ? [] : GRAPHIC_CATEGORIES.filter((c) => c.pack),
    seeAll: (id: string) => setOpen(id),
    back: () => setOpen(null),
    add: (g: Graphic) => addGraphic(g.key),
    onDragStart: (e: DragEvent, g: Graphic) => {
      e.dataTransfer.setData(GRAPHIC_MIME, g.key);
      e.dataTransfer.effectAllowed = 'copy';
    },
  };
}
