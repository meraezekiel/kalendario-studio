export type PaperKey = 'A4' | 'Letter' | 'Long' | 'Legal' | 'A5' | 'R5' | 'R4' | 'A3' | 'Desk' | 'Sq3' | 'Sq6' | 'Screen' | 'Custom';
export type SizeUnit = 'in' | 'cm' | 'mm' | 'px';
export type Orientation = 'p' | 'l';
export type PageRole = 'main' | 'photo' | 'cal';

interface BaseEl {
  id: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  op: number;
  locked: boolean;
  hidden: boolean;
}

export interface TextEl extends BaseEl {
  type: 'text';
  text: string;
  font: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  upper: boolean;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'center' | 'bottom';
  ls: number;
  lh: number;
  outline: number;
  outlineColor: string;
  shadow: boolean;
  bg: string;
}

export interface ImageEl extends BaseEl {
  type: 'image';
  src: string;
  fit: 'cover' | 'contain';
  zoom: number;
  px: number;
  py: number;
  radius: number;
  bw: number;
  bc: string;
  shadow: boolean;
  /** A background image: added behind everything, and matched to other months' backgrounds by Apply design. */
  isBg?: boolean;
}

export type ShapeKind =
  | 'rect' | 'rounded' | 'ellipse' | 'line' | 'heart' | 'star' | 'flower'
  | 'burst' | 'wave' | 'banner' | 'tape' | 'blob' | 'holes' | 'slant';

export interface ShapeEl extends BaseEl {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  stroke: string;
  sw: number;
  radius: number;
  dash: boolean;
}

export interface DayInfo {
  num?: string;
  label?: string;
  bg?: string;
  img?: string;
  hideHol?: boolean;
}

export interface CalEl extends BaseEl {
  type: 'cal';
  mo: number;
  startDay: 0 | 1;
  head: boolean;
  headText: string;
  headFont: string;
  headColor: string;
  headBg: string;
  headAlign: 'left' | 'center' | 'right';
  headScale: number;
  wk: boolean;
  wkStyle: 'plain' | 'bar' | 'pills';
  wkLen: 'short' | 'long' | 'letter';
  wkFont: string;
  wkColor: string;
  wkBg: string;
  rainbow: boolean;
  numFont: string;
  numColor: string;
  numPos: 'center' | 'tl' | 'tr';
  numScale: number;
  numBold: boolean;
  hiColor: string;
  hiDays: number[];
  labels: boolean;
  lines: boolean;
  lineColor: string;
  cellBg: string;
  gap: number;
  radius: number;
  border: number;
  borderColor: string;
  adjacent: boolean;
  /** Shows the moon phases, in the empty boxes when there is room, otherwise as small icons on their days. */
  moon?: boolean;
  /** A small side calendar (e.g. last or next month); not counted when filling the year. */
  side?: boolean;
  days: Record<number, DayInfo>;
}

export interface EventsEl extends BaseEl {
  type: 'events';
  mo: number;
  font: string;
  size: number;
  color: string;
  hiColor: string;
  title: boolean;
  titleFont: string;
  titleColor: string;
  cols: number;
  /** 'year' lists every holiday of the year instead of one month's. */
  scope?: 'month' | 'year';
  /** Whole-year list only: regular holidays, without the special non-working days. */
  regular?: boolean;
}

/** A ready-made illustration or gradient from the Graphics library. */
export interface GraphicEl extends BaseEl {
  type: 'graphic';
  /** Library key, e.g. `fluent/party-popper` or `gradient/sunset`. */
  key: string;
  flipX: boolean;
  flipY: boolean;
  /** Decorations (`deco/…` keys) only: colour palette id, scatter seed and density. */
  palette?: string;
  seed?: number;
  amount?: number;
}

export type El = TextEl | ImageEl | ShapeEl | CalEl | EventsEl | GraphicEl;
export type ElType = El['type'];

export interface Page {
  id: string;
  month: number;
  /** `cw`/`ch` hold a custom paper's width and height in mm; `unit` is how the size is shown. */
  paper: { size: PaperKey; o: Orientation; cw?: number; ch?: number; unit?: SizeUnit };
  bg: string;
  els: El[];
  role: PageRole;
}

export interface Asset {
  src: string;
  w: number;
  h: number;
}

/** Sheets that several small pages are printed on, then cut apart. */
export type SheetPaper = 'A4' | 'Letter' | 'Long' | 'Legal' | 'A3';

export interface SheetSettings {
  on: boolean;
  paper: SheetPaper;
  /** Space between pages, in mm. 0 means neighbours share one cut. */
  gap: number;
  marks: boolean;
  /** true = fill each sheet with copies of one page; false = pages one after another. */
  fill: boolean;
}

export interface CalendarDoc {
  v: 3;
  year: number;
  holidays: boolean;
  cur: number;
  assets: Record<string, Asset>;
  tray: string[];
  pages: Page[];
  /** Print several pages per sheet with cut marks; off when missing. */
  sheet?: SheetSettings;
}

export interface PageDims {
  wmm: number;
  hmm: number;
  W: number;
  H: number;
  label: string;
}
