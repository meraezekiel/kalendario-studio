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
  business: {
    name: 'Classic business',
    make: () => {
      const red = '#e3212b', navy = '#1f2a4d';
      const side = (mo: number, x: number) => mkCal({
        mo, side: true, x, y: 1000, w: 214, h: 176, head: true, headText: '{YEAR}|{MONTH}', headFont: 'Archivo Black', headBg: '', headColor: red, headScale: 1.1,
        wkFont: 'Archivo Black', wkColor: navy, numFont: 'Anton', numColor: navy, hiColor: red, labels: false, lines: false,
      });
      return [mkPage('Long', 'p', '#ffffff', [
        mkShape({ shape: 'rect', x: 28, y: 22, w: 738, h: 258, radius: 8, fill: 'transparent', stroke: red, sw: 2.5, name: 'Header box' }),
        mkImage({ x: 48, y: 44, w: 130, h: 110, fit: 'contain', name: 'Logo' }),
        mkText({ x: 190, y: 38, w: 560, h: 124, text: 'BITUIN TRADING\nCORPORATION', font: 'Anton', size: 50, color: red, lh: 1.08, ls: 0.5, name: 'Business name' }),
        mkText({ x: 48, y: 170, w: 698, h: 64, text: 'Purok 3, Brgy. Poblacion, Your Town 6100\nTEL. #: (034) 123-4567   •   0912 345 6789', font: 'Archivo Black', size: 17, color: red, lh: 1.35, name: 'Address and phone' }),
        mkShape({ shape: 'rect', x: 120, y: 246, w: 554, h: 5, fill: red, name: 'Red line' }),
        mkShape({ shape: 'rect', x: 470, y: 296, w: 296, h: 74, fill: navy, name: 'Year bar' }),
        mkShape({ shape: 'slant', x: 28, y: 296, w: 532, h: 74, fill: red, name: 'Month bar' }),
        mkShape({ shape: 'ellipse', x: 40, y: 299, w: 68, h: 68, fill: navy, stroke: '#ffffff', sw: 3, name: 'Month number circle' }),
        mkText({ x: 40, y: 299, w: 68, h: 68, text: '{NUM}', font: 'Anton', size: 34, color: '#ffffff', name: 'Month number' }),
        mkText({ x: 116, y: 294, w: 400, h: 78, text: '{MONTH}', font: 'Anton', size: 62, color: '#ffffff', ls: 2, name: 'Month name' }),
        mkText({ x: 560, y: 294, w: 196, h: 78, text: '{YEAR}', font: 'Anton', size: 56, color: '#ffffff', ls: 1, name: 'Year' }),
        mkCal({
          x: 28, y: 374, w: 738, h: 612, moon: true, wkFont: 'Archivo Black', wkColor: navy, numFont: 'Anton', numColor: navy, numScale: 1.15,
          hiColor: red, labels: false, lineColor: '#9aa0ad', border: 1.5, borderColor: '#5b6170', name: 'Main calendar',
        }),
        side(-1, 28),
        mkShape({ shape: 'rect', x: 252, y: 1000, w: 290, h: 176, radius: 4, fill: 'transparent', stroke: red, sw: 1.5, name: 'Holiday box' }),
        mkEvents({ scope: 'year', x: 260, y: 1005, w: 276, h: 168, size: 8.5, cols: 2, color: red, hiColor: red, titleColor: red, titleFont: 'Anton', name: 'Holidays' }),
        side(1, 552),
        mkText({ x: 28, y: 1182, w: 738, h: 24, text: 'Red days are Sundays and holidays • Moon phases in Philippine time • Not responsible for typographical errors', font: 'Poppins', size: 9, bold: true, upper: true, color: navy, name: 'Footnote' }),
      ])];
    },
  },
  business2: {
    name: 'Business · 2 months',
    make: () => {
      const red = '#e3212b', navy = '#1f2a6b';
      const branch = (x: number, name: string, lines: string) => [
        mkText({ x, y: 196, w: 236, h: 30, text: name, font: 'Archivo Black', size: 17, color: red, name: `${name[0]}${name.slice(1).toLowerCase()}` }),
        mkText({ x, y: 226, w: 236, h: 84, text: lines, font: 'Poppins', size: 10.5, bold: true, color: red, lh: 1.35, valign: 'top', name: `${name[0]}${name.slice(1).toLowerCase()} details` }),
      ];
      // "9 | SEPTEMBER | 2026" bar above each big month; `o` is the month offset (0 or 1).
      const banner = (o: number, x: number, y: number, w: number): El[] => {
        const t = (s: string) => (o ? s.replace('}', `+${o}}`) : s);
        return [
          mkShape({ shape: 'rect', x, y: y + 8, w, h: 42, fill: navy, name: 'Month bar' }),
          mkShape({ shape: 'rect', x: x + 6, y: y + 11, w: 42, h: 36, radius: 3, fill: '#ffffff', stroke: navy, sw: 2, name: 'Month number box' }),
          mkText({ x: x + 6, y: y + 11, w: 42, h: 36, text: t('{NUM}'), font: 'Archivo Black', size: 24, color: navy, name: 'Month number' }),
          mkShape({ shape: 'rect', x: x + 56, y: y + 11, w: w - 214, h: 36, radius: 18, fill: '#ffffff', name: 'Month name box' }),
          mkText({ x: x + 56, y: y + 9, w: w - 214, h: 40, text: t('{MONTH}'), font: 'Archivo Black', size: 30, color: red, ls: 3, name: 'Month name' }),
          mkText({ x: x + w - 152, y: y - 4, w: 148, h: 58, text: t('{YEAR}'), font: 'Anton', size: 50, color: red, outline: 2, outlineColor: '#ffffff', ls: 1, name: 'Year' }),
        ];
      };
      const big = (mo: number, x: number, y: number, w: number, h: number) => mkCal({
        mo, x, y, w, h, moon: true, wkFont: 'Archivo Black', wkColor: navy, numFont: 'Archivo Black', numColor: navy, numScale: 1.1,
        hiColor: red, labels: false, lineColor: '#8b93ad', border: 1.5, borderColor: navy, name: mo ? 'Second month' : 'First month',
      });
      const side = (mo: number, x: number, y: number) => mkCal({
        mo, side: true, x, y, w: 236, h: 204, head: true, headText: '{NUM}|{MONTH}|{YEAR}', headFont: 'Archivo Black', headBg: '', headColor: red, headScale: 1.05,
        wkFont: 'Archivo Black', wkColor: navy, numFont: 'Archivo Black', numColor: navy, hiColor: red, labels: false, lines: false,
        border: 1.5, borderColor: navy, name: mo < 0 ? 'Previous month' : 'Month after',
      });
      const memoLines = Array.from({ length: 8 }, (_, i) =>
        mkShape({ shape: 'rect', x: 42, y: 594 + i * 21, w: 204, h: 1, fill: '#9aa0ad', name: 'Memo line' }));
      return [mkPage('Long', 'p', '#ffffff', [
        mkShape({ shape: 'rect', x: 20, y: 14, w: 754, h: 300, fill: 'transparent', stroke: red, sw: 3, name: 'Header border' }),
        mkShape({ shape: 'rect', x: 27, y: 21, w: 740, h: 286, fill: 'transparent', stroke: red, sw: 1, name: 'Header inner border' }),
        mkText({ x: 60, y: 32, w: 674, h: 34, text: 'Authorized Dealer of Your Brand', font: 'Playfair Display', size: 22, bold: true, color: red, name: 'Tagline' }),
        mkImage({ x: 40, y: 72, w: 96, h: 96, radius: 50, fit: 'contain', name: 'Logo' }),
        mkText({ x: 140, y: 64, w: 520, h: 108, text: 'BITUIN MOTORS, INC.', font: 'Anton', size: 60, color: red, name: 'Business name' }),
        mkImage({ x: 666, y: 82, w: 92, h: 80, fit: 'contain', name: 'Brand logo' }),
        mkShape({ shape: 'rect', x: 150, y: 176, w: 494, h: 2, fill: red, name: 'Red line' }),
        ...branch(34, 'MAIN BRANCH', '123 Rizal St., Poblacion, Your City\nSALES: (033) 123-4567\nPARTS: (033) 123-4568\nSERVICE: (033) 123-4569\nMOBILE: 0912 345 6789'),
        ...branch(279, 'NORTH BRANCH', 'National Highway, Your Town\nSALES: (034) 123-4567\nPARTS: (034) 123-4568\nSERVICE: (034) 123-4569\nMOBILE: 0917 345 6789'),
        ...branch(524, 'SOUTH BRANCH', 'Km. 1, Your Town\nSALES: (036) 123-4567\nPARTS: (036) 123-4568\nSERVICE: (036) 123-4569\nMOBILE: 0998 345 6789'),
        // Top row: previous month and memo on the left, first month on the right.
        side(-1, 22, 324),
        mkShape({ shape: 'rect', x: 22, y: 540, w: 236, h: 230, radius: 6, fill: 'transparent', stroke: navy, sw: 1.5, name: 'Memo box' }),
        mkText({ x: 22, y: 552, w: 236, h: 24, text: 'MEMORANDUM', font: 'Poppins', size: 12, bold: true, color: '#333333', ls: 3, name: 'Memo title' }),
        ...memoLines,
        ...banner(0, 268, 318, 504),
        big(0, 268, 370, 504, 400),
        // Bottom row: second month on the left, month after and holidays on the right.
        ...banner(1, 22, 780, 504),
        big(1, 22, 832, 504, 352),
        side(2, 536, 786),
        mkShape({ shape: 'rect', x: 536, y: 1000, w: 236, h: 184, radius: 6, fill: 'transparent', stroke: navy, sw: 1.5, name: 'Holiday box' }),
        mkText({ x: 536, y: 1003, w: 236, h: 26, text: 'Legal Holidays', font: 'Playfair Display', size: 17, bold: true, italic: true, color: red, name: 'Holidays title' }),
        mkEvents({ scope: 'year', regular: true, title: false, x: 544, y: 1032, w: 222, h: 148, size: 9.5, cols: 1, color: navy, hiColor: red, name: 'Holidays' }),
        mkText({ x: 22, y: 1188, w: 750, h: 20, text: 'Red days are Sundays and holidays • Moon phases in Philippine time • Not responsible for typographical errors', font: 'Poppins', size: 8.5, bold: true, upper: true, color: navy, name: 'Footnote' }),
      ])];
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
      mkCal({ x: 500, y: 100, w: 256, h: 300, wkFont: 'Poppins', numFont: 'Poppins', numColor: '#20263a', wkColor: '#7a8199', lineColor: 'transparent', hiColor: '#e2557f' }),
    ])],
  },
  mini3: {
    name: 'Mini 3×3 in',
    make: () => [mkPage('Sq3', 'p', '#fdf6fa', [
      mkText({ x: 30, y: 26, w: 734, h: 120, text: '{MONTH}', font: 'Fredoka', size: 88, bold: true, color: '#c76a9a', ls: 4, name: 'Month name' }),
      mkText({ x: 30, y: 136, w: 734, h: 60, text: '{YEAR}', font: 'Fredoka', size: 44, bold: true, color: '#dcc8d4', name: 'Year' }),
      pastelCal({ x: 30, y: 214, w: 734, h: 550 }),
    ])],
  },
  blank: { name: 'Blank page', make: () => [mkPage('A4', 'p', '#ffffff', [])] },
};

export type TemplateKey = keyof typeof TEMPLATES;
