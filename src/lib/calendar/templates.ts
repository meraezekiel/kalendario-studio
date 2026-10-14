import { mkCal, mkEvents, mkImage, mkPage, mkShape, mkText } from './factories';
import type { CalEl, El, Page } from './types';

const holes = () => mkShape({ shape: 'holes', x: 44, y: 12, w: 706, h: 15, fill: '#3b3540', name: 'Binding holes' });

/** Business ad block that fills the bottom of the giveaway sheets. */
function adEls(H: number): El[] {
  const y = H - 22 - 314;
  return [
    mkShape({ shape: 'rect', x: 26, y, w: 742, h: 314, radius: 5, fill: '#f5f7fc', stroke: '#1b3a8f', sw: 2, name: 'Ad box' }),
    mkImage({ x: 48, y: y + 22, w: 150, h: 150, radius: 50, bw: 4, bc: '#1b3a8f', name: 'Logo' }),
    mkText({ x: 210, y: y + 18, w: 548, h: 104, text: 'BITUIN PRINTING', font: 'Anton', size: 76, color: '#f5b800', outline: 3, shadow: true, ls: 1, name: 'Business name' }),
    mkShape({ shape: 'banner', x: 310, y: y + 128, w: 340, h: 44, fill: '#e3212b', name: 'Tagline banner' }),
    mkText({ x: 310, y: y + 128, w: 340, h: 44, text: 'PRINTING SERVICES', font: 'Archivo Black', size: 19, color: '#ffffff', ls: 4, name: 'Tagline' }),
    mkText({
      x: 42, y: y + 188, w: 710, h: 64,
      text: 'Tarpaulin printing • ID & passport photos • Photocopy & scanning • Book binding\nCalling cards • Invitations & souvenirs • Mug & T-shirt printing • Lamination',
      font: 'Poppins', size: 13.5, bold: true, upper: true, color: '#1b3a8f', lh: 1.6, name: 'Services',
    }),
    mkShape({ shape: 'line', x: 46, y: y + 256, w: 702, h: 6, stroke: '#c7cde0', sw: 1.5, dash: true }),
    mkText({ x: 42, y: y + 264, w: 710, h: 34, text: 'Purok 3, Brgy. Poblacion, Your Town   •   0912 345 6789   •   facebook.com/yourpage', font: 'Poppins', size: 15, bold: true, color: '#222222', name: 'Contact details' }),
  ];
}

export const giveCal = (o: Partial<CalEl>) => mkCal({
  head: true, headText: '{YEAR}|{MONTH}|{YEAR}', headFont: 'Anton', headBg: '#1b3a8f', headColor: '#ffffff',
  wkFont: 'Archivo Black', wkColor: '#1b3a8f', numFont: 'Anton', numColor: '#1b3a8f', hiColor: '#e3212b',
  lineColor: '#d5dbea', border: 1.5, borderColor: '#1b3a8f', ...o,
});

const pastelCal = (o: Partial<CalEl>) => mkCal({
  wkStyle: 'pills', rainbow: true, wkFont: 'Fredoka', wkColor: '#ffffff', numFont: 'Fredoka', numColor: '#5a4f58',
  numPos: 'tl', numBold: true, hiColor: '#e2557f', lineColor: '#f1e3ec', gap: 6, radius: 12, ...o,
});

export interface Template {
  name: string;
  make: () => Page[];
}

export const TEMPLATES: Record<string, Template> = {
  pastel: {
    name: 'Pastel planner',
    make: () => [mkPage('A4', 'p', '#fdf6fa', [
      holes(),
      mkImage({ x: 28, y: 36, w: 738, h: 420, src: '@sample', radius: 6, name: 'Main photo' }),
      mkText({ x: 28, y: 356, w: 738, h: 90, text: 'Our Family {YEAR}', font: 'Caveat', size: 74, bold: true, color: '#ffffff', shadow: true, name: 'Caption' }),
      mkText({ x: 30, y: 470, w: 520, h: 70, text: '{MONTH}', font: 'Fredoka', size: 60, bold: true, color: '#c76a9a', align: 'left', ls: 3, name: 'Month name' }),
      mkText({ x: 560, y: 478, w: 204, h: 56, text: '{YEAR}', font: 'Fredoka', size: 42, bold: true, color: '#dcc8d4', align: 'right', name: 'Year' }),
      pastelCal({ x: 28, y: 550, w: 738, h: 547 }),
    ])],
  },
  classic: {
    name: 'Classic photo',
    make: () => [mkPage('A4', 'p', '#ffffff', [
      mkImage({ x: 0, y: 0, w: 794, h: 540, src: '@sample', name: 'Main photo' }), holes(),
      mkText({ x: 22, y: 478, w: 420, h: 50, text: 'Our Family {YEAR}', font: 'Caveat', size: 34, bold: true, color: '#ffffff', align: 'left', shadow: true, name: 'Caption' }),
      mkText({ x: 0, y: 556, w: 794, h: 66, text: '{MONTH} {YEAR}', font: 'Cormorant Garamond', size: 50, bold: true, color: '#b4a782', ls: 1.5, name: 'Month title' }),
      mkCal({ x: 64, y: 636, w: 666, h: 433, wkStyle: 'bar', wkBg: '#b4a782', wkColor: '#ffffff', wkLen: 'long', numFont: 'Cormorant Garamond', numBold: true, numColor: '#1f1f1f', lineColor: '#e6e1d4' }),
    ])],
  },
  modern: {
    name: 'Modern wave',
    make: () => [mkPage('A4', 'p', '#ffffff', [
      mkImage({ x: 0, y: 0, w: 794, h: 430, src: '@sample', name: 'Main photo' }),
      mkShape({ shape: 'wave', x: 0, y: 281, w: 794, h: 150, fill: '#4b1f50', name: 'Wave' }), holes(),
      mkText({ x: 30, y: 34, w: 420, h: 56, text: 'Our Family {YEAR}', font: 'Caveat', size: 38, bold: true, color: '#ffffff', align: 'left', shadow: true, name: 'Caption' }),
      mkText({ x: 420, y: 330, w: 330, h: 90, text: '{YEAR}', font: 'Poppins', size: 80, bold: true, color: '#ffffff', align: 'right', name: 'Year' }),
      mkShape({ shape: 'rect', x: -30, y: 456, w: 122, h: 633, radius: 20, fill: '#4b1f50', name: 'Month band' }),
      mkText({ x: -254, y: 732, w: 600, h: 80, rot: -90, text: '{MONTH}', font: 'Poppins', size: 46, color: '#ffffff', ls: 8, upper: true, name: 'Month name' }),
      mkCal({ x: 116, y: 456, w: 632, h: 503, hiDays: [5, 6], adjacent: true, wkFont: 'Poppins', numFont: 'Poppins', lineColor: '#e8e8e8' }),
      mkText({ x: 116, y: 972, w: 200, h: 34, text: 'Note', font: 'Poppins', size: 18, bold: true, color: '#333333', align: 'left' }),
      mkShape({ shape: 'line', x: 116, y: 1012, w: 632, h: 4, stroke: '#e3e3e3', sw: 1.5 }),
      mkShape({ shape: 'line', x: 116, y: 1046, w: 632, h: 4, stroke: '#e3e3e3', sw: 1.5 }),
      mkShape({ shape: 'line', x: 116, y: 1080, w: 632, h: 4, stroke: '#e3e3e3', sw: 1.5 }),
    ])],
  },
  split: {
    name: 'Photo + calendar on separate sheets',
    make: () => [
      mkPage('A4', 'l', '#ffffff', [
        mkImage({ x: 0, y: 0, w: 794, h: 561, src: '@sample', name: 'Main photo' }), holes(),
        mkText({ x: 0, y: 460, w: 794, h: 80, text: 'Our Family {YEAR}', font: 'Caveat', size: 60, bold: true, color: '#ffffff', shadow: true, name: 'Caption' }),
      ], 'photo'),
      mkPage('A4', 'l', '#fdf6fa', [
        holes(),
        mkText({ x: 40, y: 36, w: 420, h: 58, text: '{MONTH}', font: 'Fredoka', size: 46, bold: true, color: '#c76a9a', align: 'left', ls: 3, name: 'Month name' }),
        mkText({ x: 554, y: 42, w: 200, h: 50, text: '{YEAR}', font: 'Fredoka', size: 36, bold: true, color: '#dcc8d4', align: 'right', name: 'Year' }),
        pastelCal({ x: 40, y: 104, w: 714, h: 432 }),
      ], 'cal'),
    ],
  },
  give3: {
    name: 'Giveaway · 3 months',
    make: () => {
      const H = 1308;
      const els: El[] = [holes()];
      for (let k = 0; k < 3; k++) {
        const y = 42 + k * 310;
        els.push(giveCal({ mo: k, x: 26, y, w: 520, h: 296 }), mkEvents({ mo: k, x: 560, y, w: 208, h: 296, size: 12.5, hiColor: '#e3212b' }));
      }
      return [mkPage('Legal', 'p', '#ffffff', els.concat(adEls(H)))];
    },
  },
  give12: {
    name: 'Giveaway · whole year',
    make: () => {
      const H = 1308;
      const els: El[] = [holes()];
      const bw = 238, bh = 218.5;
      for (let k = 0; k < 12; k++) {
        const c = k % 3, r = Math.floor(k / 3);
        els.push(giveCal({ mo: k, x: 26 + c * (bw + 14), y: 42 + r * (bh + 14), w: bw, h: bh, labels: false }));
      }
      return [mkPage('Legal', 'p', '#ffffff', els.concat(adEls(H)))];
    },
  },
  desk: {
    name: 'Desk calendar 8×5 in',
    make: () => [mkPage('Desk', 'l', '#fffaf3', [
      holes(),
      mkImage({ x: 24, y: 40, w: 330, h: 432, src: '@sample', radius: 10, name: 'Main photo' }),
      mkText({ x: 376, y: 38, w: 260, h: 60, text: '{MONTH}', font: 'Fredoka', size: 40, bold: true, color: '#c76a9a', align: 'left', ls: 2, name: 'Month name' }),
      mkText({ x: 640, y: 44, w: 130, h: 50, text: '{YEAR}', font: 'Fredoka', size: 30, bold: true, color: '#dcc8d4', align: 'right', name: 'Year' }),
      pastelCal({ x: 376, y: 106, w: 394, h: 366, gap: 4, radius: 8 }),
    ])],
  },
  wallpaper: {
    name: 'Desktop wallpaper',
    make: () => [mkPage('Screen', 'l', '#20263a', [
      mkImage({ x: 0, y: 0, w: 794, h: 447, src: '@sample', isBg: true, name: 'Background' }),
      mkShape({ shape: 'rect', x: 488, y: 34, w: 280, h: 379, radius: 16, fill: '#ffffff', op: 0.86, name: 'Calendar card' }),
      mkText({ x: 500, y: 44, w: 256, h: 50, text: '{Month} {YEAR}', font: 'Poppins', size: 26, bold: true, color: '#20263a', name: 'Month title' }),
      mkCal({ x: 500, y: 100, w: 256, h: 300, wkFont: 'Poppins', numFont: 'Poppins', numColor: '#20263a', wkColor: '#7a8199', lineColor: 'transparent', hiColor: '#e2557f', labels: false }),
    ])],
  },
  mini3: {
    name: 'Mini 3×3 in',
    make: () => [mkPage('Sq3', 'p', '#fdf6fa', [
      mkText({ x: 30, y: 26, w: 734, h: 120, text: '{MONTH}', font: 'Fredoka', size: 88, bold: true, color: '#c76a9a', ls: 4, name: 'Month name' }),
      mkText({ x: 30, y: 136, w: 734, h: 60, text: '{YEAR}', font: 'Fredoka', size: 44, bold: true, color: '#dcc8d4', name: 'Year' }),
      pastelCal({ x: 30, y: 214, w: 734, h: 550, labels: false }),
    ])],
  },
  blank: { name: 'Blank page', make: () => [mkPage('A4', 'p', '#ffffff', [])] },
};

export type TemplateKey = keyof typeof TEMPLATES;
