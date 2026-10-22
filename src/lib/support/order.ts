import { dims } from '@/lib/calendar/document';
import type { CalendarDoc } from '@/lib/calendar/types';

/** What the customer fills in to have their calendar printed by the print shop. */
export interface PrintOrder {
  copies: number;
  delivery: boolean;
  name: string;
  contact: string;
  address: string;
  notes: string;
}

export const EMPTY_ORDER: PrintOrder = { copies: 1, delivery: false, name: '', contact: '', address: '', notes: '' };

/** "A4, portrait · 13 pages · 2027", the part of the order the shop can't guess from a chat. */
export function describeDesign(doc: CalendarDoc) {
  const sizes = [...new Set(doc.pages.map((pg) => dims(pg).label))];
  const n = doc.pages.length;
  return `${sizes.join(' + ')} · ${n} page${n > 1 ? 's' : ''} · ${doc.year}`;
}

/** What's missing before the order can be sent, or '' when it's ready. */
export function orderProblem(o: PrintOrder) {
  if (!Number.isInteger(o.copies) || o.copies < 1) return 'How many copies?';
  if (!o.name.trim()) return 'Please add your name.';
  if (!o.contact.trim()) return 'Please add a contact number.';
  if (o.delivery && !o.address.trim()) return 'Please add the delivery address.';
  return '';
}

/** The message pasted into the shop's Messenger, with the design file attached next to it. */
export function orderMessage(o: PrintOrder, design: string, shop: string, file: string) {
  const lines = [
    `Hi ${shop}! I'd like to order printed calendars.`,
    '',
    `Design: ${design}`,
    `Design file: ${file} (attached)`,
    `Copies: ${o.copies}`,
    `Pickup or delivery: ${o.delivery ? 'Delivery' : 'Pickup'}`,
    `Name: ${o.name.trim()}`,
    `Contact number: ${o.contact.trim()}`,
  ];
  if (o.delivery) lines.push(`Address: ${o.address.trim()}`);
  if (o.notes.trim()) lines.push(`Notes: ${o.notes.trim()}`);
  lines.push('', '(Sent from Kalendaryo Studio)');
  return lines.join('\n');
}
