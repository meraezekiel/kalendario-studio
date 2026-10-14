import type { CalEl, El, EventsEl, GraphicEl, ImageEl, Orientation, Page, PageRole, PaperKey, ShapeEl, TextEl } from './types';
import { uid } from './utils';

type Init<T> = Partial<Omit<T, 'type'>>;

const base = () => ({ id: uid(), x: 100, y: 100, w: 300, h: 100, rot: 0, op: 1, locked: false, hidden: false });

export const mkText = (o: Init<TextEl> = {}): TextEl => ({
  ...base(), type: 'text', w: 420, h: 70, text: 'Your text', font: 'Poppins', size: 32, color: '#222222',
  bold: false, italic: false, upper: false, align: 'center', valign: 'center', ls: 0, lh: 1.15,
  outline: 0, outlineColor: '#1b1b2b', shadow: false, bg: '', ...o,
});

export const mkImage = (o: Init<ImageEl> = {}): ImageEl => ({
  ...base(), type: 'image', w: 360, h: 260, src: '', fit: 'cover', zoom: 1, px: 50, py: 50,
  radius: 0, bw: 0, bc: '#ffffff', shadow: false, ...o,
});

export const mkShape = (o: Init<ShapeEl> = {}): ShapeEl => ({
  ...base(), type: 'shape', shape: 'rect', w: 200, h: 140, fill: '#f39cbf', stroke: '#222222', sw: 0, radius: 0, dash: false, ...o,
});

export const mkCal = (o: Init<CalEl> = {}): CalEl => ({
  ...base(), type: 'cal', mo: 0, w: 714, h: 520, startDay: 0,
  head: false, headText: '{MONTH} {YEAR}', headFont: 'Anton', headColor: '#ffffff', headBg: '#1b3a8f', headAlign: 'center', headScale: 1,
  wk: true, wkStyle: 'plain', wkLen: 'short', wkFont: 'Poppins', wkColor: '#222222', wkBg: '#eeeeee', rainbow: false,
  numFont: 'Poppins', numColor: '#222222', numPos: 'center', numScale: 1, numBold: false,
  hiColor: '#e0262b', hiDays: [0], labels: true,
  lines: true, lineColor: '#e3e3e3', cellBg: '#ffffff', gap: 0, radius: 0, border: 0, borderColor: '#1b3a8f', adjacent: false, days: {},
  ...o,
});

export const mkEvents = (o: Init<EventsEl> = {}): EventsEl => ({
  ...base(), type: 'events', mo: 0, w: 210, h: 240, font: 'Poppins', size: 12, color: '#333333', hiColor: '#e0262b',
  title: true, titleFont: 'Anton', titleColor: '#1b3a8f', cols: 1, ...o,
});

export const mkGraphic = (o: Init<GraphicEl> = {}): GraphicEl => ({
  ...base(), type: 'graphic', w: 160, h: 160, key: 'fluent/party-popper', flipX: false, flipY: false, ...o,
});

export const mkPage = (size: PaperKey, o: Orientation, bg: string, els: El[], role: PageRole = 'main'): Page => ({
  id: uid(), month: 0, paper: { size, o }, bg, els, role,
});
