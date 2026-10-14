import { DECOS, PALETTE_IDS, PALETTES, type PaletteId } from '@/lib/graphics/deco';
import { findGraphic, isDeco } from '@/lib/graphics/library';
import type { GraphicEl } from '@/lib/calendar/types';
import { updateEl } from '@/store/useStudioStore';

export const PALETTE_SWATCHES = PALETTE_IDS.map((id) => ({ id, label: PALETTES[id].label, colors: PALETTES[id].colors.slice(0, 4) }));

export function useGraphicSectionHandler(el: GraphicEl) {
  const kind = isDeco(el.key) ? findGraphic(el.key)?.deco?.kind : undefined;
  const info = kind ? DECOS[kind] : undefined;
  return {
    deco: !!info,
    random: !!info?.random,
    density: !!info && (info.random || kind === 'dots' || kind === 'vine'),
    palette: (el.palette ?? 'rainbow') as PaletteId,
    amount: el.amount ?? 1,
    setPalette: (palette: PaletteId) => updateEl<GraphicEl>(el.id, { palette }),
    shuffle: () => updateEl<GraphicEl>(el.id, { seed: Math.floor(Math.random() * 1e9) }),
    setAmount: (amount: number) => updateEl<GraphicEl>(el.id, { amount }, `f:${el.id}:amount`),
    flipX: () => updateEl<GraphicEl>(el.id, { flipX: !el.flipX }),
    flipY: () => updateEl<GraphicEl>(el.id, { flipY: !el.flipY }),
  };
}
