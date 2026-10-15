import catalog from './catalog.json';
import { DECOS, type DecoKind, decoThumb, PALETTES, type PaletteId } from './deco';
import { PACK_KINDS } from './packs';
import { PACK2_KINDS } from './packs2';
import peeps from './peeps.json';
import social from './social.json';

export interface Graphic {
  /**
   * `fluent/<name>` or `gradient/<name>` (file public/graphics/<key>.svg), or `deco/<kind>:<palette>`
   * for a generated decoration in the library (the element itself stores `deco/<kind>` plus its palette).
   */
  key: string;
  label: string;
  /** Words matched by search. */
  words: string;
  /** Resizes freely (gradients stretch, decorations re-draw); illustrations keep their shape. */
  stretch: boolean;
  deco?: { kind: DecoKind; palette: PaletteId };
}

export interface GraphicCategory {
  id: string;
  label: string;
  items: Graphic[];
  /** Illustration packs are shown as cards and opened to browse. */
  pack?: boolean;
}

const GRADIENTS: [string, string][] = [
  ['fade-dark', 'Dark fade'], ['fade-light', 'White fade'], ['sky', 'Sky'], ['sunset', 'Sunset'], ['pastel', 'Pastel'],
  ['blue-stripe', 'Blue stripe'], ['glow-pink', 'Pink glow'], ['glow-sun', 'Sun glow'], ['glow-rainbow', 'Rainbow glow'], ['vignette', 'Vignette'],
];

/** Decorations shown in the library, as [kind, palette] pairs; each can be recoloured after adding. */
const DECO_SETS: { id: string; label: string; items: [DecoKind, PaletteId][] }[] = [
  {
    id: 'bunting',
    label: 'Bunting & banners',
    items: [
      ['bunting-tri', 'rainbow'], ['bunting-tri', 'pastel'], ['bunting-round', 'pastel'], ['bunting-swallow', 'pinoy'],
      ['bunting-tri', 'christmas'], ['bunting-round', 'valentine'], ['bunting-swallow', 'gold'], ['bunting-tri', 'ocean'],
      ['lights', 'rainbow'], ['lights', 'gold'], ['ribbon', 'christmas'], ['ribbon', 'ocean'], ['ribbon', 'gold'], ['ribbon', 'valentine'],
    ],
  },
  {
    id: 'party',
    label: 'Confetti & party',
    items: [
      ['confetti', 'rainbow'], ['balloons', 'rainbow'], ['confetti-burst', 'rainbow'], ['streamers', 'rainbow'],
      ['sparkles', 'gold'], ['balloons', 'pastel'], ['confetti-fall', 'gold'], ['dots', 'pastel'],
      ['confetti', 'gold'], ['confetti-burst', 'pastel'], ['confetti-fall', 'rainbow'], ['streamers', 'pastel'],
      ['balloons', 'gold'], ['balloons', 'valentine'], ['sparkles', 'pastel'], ['dots', 'rainbow'],
    ],
  },
  {
    id: 'frames',
    label: 'Frames, borders & doodles',
    items: [
      ['frame-scallop', 'pastel'], ['frame-dots', 'ocean'], ['frame-double', 'ink'], ['frame-corners', 'gold'],
      ['vine', 'leaf'], ['vine', 'pastel'], ['divider', 'valentine'], ['divider', 'ink'],
      ['sunburst', 'gold'], ['sunburst', 'pastel'], ['doodle-underline', 'valentine'], ['doodle-circle', 'christmas'], ['doodle-arrow', 'ink'],
    ],
  },
];

const tags = catalog.tags as Record<string, string>;
const title = (name: string) => name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Illustration packs: generated art in a few colourways, illustrated stickers, and hand-drawn people. */
const both = (kinds: string[], palettes: PaletteId[]) => palettes.flatMap((p) => kinds.map((k): [DecoKind, PaletteId] => [k, p]));
const cycle = (kinds: string[], palettes: PaletteId[], offset = 0) => kinds.map((k, i): [DecoKind, PaletteId] => [k, palettes[(i + offset) % palettes.length]]);
const BADGE_COLORS: PaletteId[] = ['vivid', 'ocean', 'valentine', 'gold', 'christmas', 'summer', 'halloween', 'boho'];
type PackDef = { id: string; label: string; items: [DecoKind, PaletteId][] } | { id: string; label: string; files: { dir: string; names: [string, string][]; words: string } };
const illustrated = (id: string) => {
  const p = catalog.illustrated.find((x) => x.id === id)!;
  return { id: p.id, label: p.label, files: { dir: 'fluent3d', names: p.items.map((n): [string, string] => [n, title(n)]), words: p.label } };
};
const people = (id: string, label: string, group: keyof typeof peeps) => ({ id, label, files: { dir: 'peeps', names: peeps[group] as [string, string][], words: `${label} person people avatar character hand drawn` } });

const PACKS: PackDef[] = [
  { id: 'pack-badges', label: 'Colorful badges', items: [...cycle(PACK2_KINDS.badges, BADGE_COLORS), ...cycle(PACK2_KINDS.badges, BADGE_COLORS, 3)] },
  { id: 'pack-bold-foliage', label: 'Bold foliage', items: both([...PACK_KINDS.leaves, ...PACK2_KINDS.vleaves], ['bold']) },
  { id: 'pack-zodiac', label: 'Zodiac symbols', items: cycle(PACK_KINDS.zodiac, ['vivid', 'boho', 'ocean', 'valentine']) },
  { id: 'pack-objects', label: 'Simple drawn objects', items: both(PACK2_KINDS.objects, ['boho', 'sage']) },
  illustrated('pack-camping'),
  { id: 'pack-flowers', label: 'Sketchy flowers', items: both(PACK_KINDS.flowers, ['vivid', 'pastel']) },
  illustrated('pack-animals'),
  { id: 'pack-love', label: 'Hand-drawn love', items: both(PACK2_KINDS.love, ['valentine', 'pastel']) },
  { id: 'pack-rainbows', label: 'Organic rainbows', items: both(PACK_KINDS.rainbows, ['boho', 'pastel']) },
  { id: 'pack-fruits', label: 'Organic sketched fruits', items: both(PACK2_KINDS.fruits, ['fruit', 'vivid']) },
  { id: 'pack-leaves', label: 'Bright leaves', items: both(PACK_KINDS.leaves, ['leaf', 'vivid']) },
  people('pack-girl-power', 'Girl power', 'girl'),
  people('pack-pastel-ladies', 'Pastel ladies', 'pastel'),
  people('pack-duo', 'Duo color avatars', 'duo'),
  illustrated('pack-food'),
  illustrated('pack-travel'),
  { id: 'pack-monoline', label: 'Monoline elements', items: both(PACK_KINDS.monoline, ['ink']) },
  { id: 'pack-summer', label: 'Organic summer', items: both(PACK2_KINDS.summer, ['summer', 'pastel']) },
  { id: 'pack-vivid', label: 'Vivid contrast objects', items: both(PACK2_KINDS.vivid, ['vivid', 'halloween']) },
  { id: 'pack-vivid-leaves', label: 'Vivid leaves', items: both(PACK2_KINDS.vleaves, ['vivid', 'summer']) },
  people('pack-people', 'Hand-drawn people', 'people'),
];
/** Social media logos and contact icons, each as a round badge, in colour and in black. */
const SOCIAL: GraphicCategory = {
  id: 'social',
  label: 'Social media & contact',
  items: social.icons.flatMap((i) =>
    social.variants.map(([v, name]) => ({
      key: `social/${i.id}-${v}`,
      label: `${i.label} (${name})`,
      words: `${i.label} ${i.id} ${i.words} ${name} social media socmed contact logo icon`.toLowerCase(),
      stretch: false,
    })),
  ),
};

const decoItem = (kind: DecoKind, palette: PaletteId, cat: string): Graphic => ({
  key: `deco/${kind}:${palette}`,
  label: `${DECOS[kind].label} (${PALETTES[palette].label})`,
  words: `${DECOS[kind].label} ${DECOS[kind].words} ${PALETTES[palette].label} ${cat}`.toLowerCase(),
  stretch: true,
  deco: { kind, palette },
});


export const GRAPHIC_CATEGORIES: GraphicCategory[] = [
  ...PACKS.map((c): GraphicCategory => ({
    id: c.id,
    label: c.label,
    pack: true,
    items: 'items' in c
      ? c.items.map(([k, p]) => decoItem(k, p, c.label))
      : c.files.names.map(([file, label]) => ({ key: `${c.files.dir}/${file}`, label, words: `${label} ${file.replace(/-/g, ' ')} ${c.files.words}`.toLowerCase(), stretch: false })),
  })),
  SOCIAL,
  ...DECO_SETS.map((c) => ({ id: c.id, label: c.label, items: c.items.map(([k, p]) => decoItem(k, p, c.label)) })),
  ...catalog.categories.map((c) => ({
    id: c.id,
    label: c.label,
    items: c.items.map((name) => ({
      key: `fluent/${name}`,
      label: title(name),
      words: `${name.replace(/-/g, ' ')} ${tags[name] ?? ''} ${c.label}`.toLowerCase(),
      stretch: false,
    })),
  })),
  {
    id: 'gradients',
    label: 'Gradients',
    items: GRADIENTS.map(([name, label]) => ({ key: `gradient/${name}`, label, words: `${label} gradient fade glow`.toLowerCase(), stretch: true })),
  },
];

const LIBRARY = GRAPHIC_CATEGORIES.flatMap((c) => c.items);
const BY_KEY = new Map(LIBRARY.map((g) => [g.key, g] as const));
// Placed decorations are stored as `deco/<kind>`; look those up by kind.
for (const kind of Object.keys(DECOS) as DecoKind[]) {
  BY_KEY.set(`deco/${kind}`, { key: `deco/${kind}`, label: DECOS[kind].label, words: '', stretch: true, deco: { kind, palette: 'rainbow' } });
}

export const findGraphic = (key: string): Graphic | undefined => BY_KEY.get(key);
export const graphicUrl = (key: string) => `/graphics/${key}.svg`;
/** Image source for a library thumbnail. */
export const thumbSrc = (g: Graphic) => (g.deco ? decoThumb(g.deco.kind, g.deco.palette) : graphicUrl(g.key));
export const isDeco = (key: string) => key.startsWith('deco/');

/** Graphics whose name, tags or category contain every word of the query. */
export function searchGraphics(query: string): Graphic[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return LIBRARY.filter((g) => words.every((w) => g.words.includes(w)));
}
