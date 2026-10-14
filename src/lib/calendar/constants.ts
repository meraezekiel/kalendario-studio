import type { PaperKey, ShapeKind } from './types';

/** Design width of every page in CSS px. Heights follow the paper's aspect ratio. */
export const DW = 794;
export const STORAGE_KEY = 'kalendaryo-studio-v3';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const PILLS = ['#f39cbf', '#f7b875', '#8fcdea', '#b9a2df', '#f0d46b', '#93d9b8', '#ff9f8f'];
export const FONTS = ['Poppins', 'Fredoka', 'Anton', 'Archivo Black', 'Bebas Neue', 'Lilita One', 'Montserrat', 'Playfair Display', 'Cormorant Garamond', 'Caveat', 'Dancing Script', 'Pacifico', 'Figtree'];

export const PAPERS: Record<PaperKey, [string, number, number]> = {
  A4: ['A4', 210, 297],
  Letter: ['Short bond / Letter', 215.9, 279.4],
  Long: ['Long bond 8.5×13', 215.9, 330.2],
  Legal: ['Legal 8.5×14', 215.9, 355.6],
  A5: ['A5', 148, 210],
  R5: ['5R photo 5×7', 127, 177.8],
  R4: ['4R photo 4×6', 101.6, 152.4],
  A3: ['A3', 297, 420],
};

export const SHAPES: [ShapeKind, string][] = [
  ['rect', 'Square'], ['rounded', 'Rounded'], ['ellipse', 'Circle'], ['line', 'Line'], ['heart', 'Heart'],
  ['star', 'Star'], ['flower', 'Flower'], ['burst', 'Burst'], ['wave', 'Wave'], ['banner', 'Banner'],
  ['tape', 'Washi tape'], ['blob', 'Blob'], ['holes', 'Binding'],
];

export const SHAPE_PATHS: Partial<Record<ShapeKind, string>> = {
  heart: 'M50 92C16 66 3 50 3 31A23 23 0 0 1 50 20A23 23 0 0 1 97 31C97 50 84 66 50 92Z',
  star: 'M50 3L62 37L98 38L69 59L80 95L50 74L20 95L31 59L2 38L38 37Z',
  wave: 'M0 57C19 20 38 13 54 41C68 65 81 27 100 12V100H0Z',
  banner: 'M0 0H100L93 50L100 100H0L7 50Z',
  tape: 'M0 6L4 0L8 6L12 0L16 6L20 0L24 6L28 0L32 6L36 0L40 6L44 0L48 6L52 0L56 6L60 0L64 6L68 0L72 6L76 0L80 6L84 0L88 6L92 0L96 6L100 2V94L96 100L92 94L88 100L84 94L80 100L76 94L72 100L68 94L64 100L60 94L56 100L52 94L48 100L44 94L40 100L36 94L32 100L28 94L24 100L20 94L16 100L12 94L8 100L4 94L0 98Z',
  blob: 'M50 4C72 4 96 20 96 48C96 76 74 96 48 96C22 96 4 78 4 52C4 24 28 4 50 4Z',
  burst: 'M50 0L58 22L80 8L74 32L98 32L80 48L98 64L74 66L80 92L58 78L50 100L42 78L20 92L26 66L2 64L20 48L2 32L26 32L20 8L42 22Z',
};

/** Shapes that keep their proportions when resized from a corner. */
export const ASPECT_SHAPES: ShapeKind[] = ['heart', 'star', 'flower', 'burst'];

/** Drag-and-drop data type for photos dragged from the tray. */
export const ASSET_MIME = 'text/x-asset';
/** Drag data type for a graphic dragged from the Graphics panel. */
export const GRAPHIC_MIME = 'text/x-graphic';
