export type PaperKey = 'A4' | 'Letter' | 'Long' | 'Legal' | 'A5' | 'R5' | 'R4' | 'A3';
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
}

export type ShapeKind =
  | 'rect' | 'rounded' | 'ellipse' | 'line' | 'heart' | 'star' | 'flower'
  | 'burst' | 'wave' | 'banner' | 'tape' | 'blob' | 'holes';

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
}

export type El = TextEl | ImageEl | ShapeEl | CalEl | EventsEl;
export type ElType = El['type'];

export interface Page {
  id: string;
  month: number;
  paper: { size: PaperKey; o: Orientation };
  bg: string;
  els: El[];
  role: PageRole;
}

export interface Asset {
  src: string;
  w: number;
  h: number;
}

export interface CalendarDoc {
  v: 3;
  year: number;
  holidays: boolean;
  cur: number;
  assets: Record<string, Asset>;
  tray: string[];
  pages: Page[];
}

export interface PageDims {
  wmm: number;
  hmm: number;
  W: number;
  H: number;
  label: string;
}
