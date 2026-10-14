import { MONTHS, SHAPES } from './constants';
import { monthOf } from './document';
import type { El, ElType, Page } from './types';

export const TYPE_LABEL: Record<ElType, string> = { text: 'Text', image: 'Img', shape: 'Shape', cal: 'Cal', events: 'List' };

/** Human name for an element in the layers list and inspector title. */
export function elName(e: El, year: number, pg: Page): string {
  if (e.name) return e.name;
  switch (e.type) {
    case 'text': return (e.text || 'Text').split('\n')[0].slice(0, 26);
    case 'image': return 'Photo';
    case 'shape': return (SHAPES.find((s) => s[0] === e.shape) || ['', 'Shape'])[1];
    case 'cal': return `Calendar · ${MONTHS[monthOf(year, pg, e.mo).m]}`;
    default: return 'Holiday list';
  }
}

/** Options for "which month does this calendar show", relative to the page's month. */
export function monthOffsetOptions(year: number, pg: Page) {
  return Array.from({ length: 12 }, (_, o) => [o, `${MONTHS[monthOf(year, pg, o).m]}${o === 0 ? ' (page month)' : ` (+${o})`}`] as const);
}
