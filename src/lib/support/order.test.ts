import { describe, expect, it } from 'vitest';
import { mkPage } from '@/lib/calendar/factories';
import type { CalendarDoc } from '@/lib/calendar/types';
import { describeDesign, EMPTY_ORDER, orderMessage, orderProblem } from './order';

const order = { ...EMPTY_ORDER, copies: 10, name: ' Ana Cruz ', contact: '0917 123 4567' };

describe('orderProblem', () => {
  it('asks for copies, name, contact, and the address only for delivery', () => {
    expect(orderProblem({ ...order, copies: 0 })).toBe('How many copies?');
    expect(orderProblem({ ...order, copies: 1.5 })).toBe('How many copies?');
    expect(orderProblem({ ...order, name: ' ' })).toBe('Please add your name.');
    expect(orderProblem({ ...order, contact: '' })).toBe('Please add a contact number.');
    expect(orderProblem(order)).toBe('');
    expect(orderProblem({ ...order, delivery: true })).toBe('Please add the delivery address.');
    expect(orderProblem({ ...order, delivery: true, address: 'Brgy. 1, EB Magalona' })).toBe('');
  });
});

describe('orderMessage', () => {
  it('lists the order for the shop, trimmed, with the address and notes only when given', () => {
    const msg = orderMessage(order, 'A4, portrait · 13 pages · 2027', 'JM Craftworks', 'my-calendar-2027.kalendaryo');
    expect(msg).toBe(
      [
        "Hi JM Craftworks! I'd like to order printed calendars.",
        '',
        'Design: A4, portrait · 13 pages · 2027',
        'Design file: my-calendar-2027.kalendaryo (attached)',
        'Copies: 10',
        'Pickup or delivery: Pickup',
        'Name: Ana Cruz',
        'Contact number: 0917 123 4567',
        '',
        '(Sent from Kalendaryo Studio)',
      ].join('\n'),
    );
    const del = orderMessage({ ...order, delivery: true, address: 'Brgy. 1', notes: 'Spiral bound' }, 'x', 'Shop', 'f');
    expect(del).toContain('Pickup or delivery: Delivery\n');
    expect(del).toContain('Address: Brgy. 1\nNotes: Spiral bound\n');
  });
});

describe('describeDesign', () => {
  it('names each page size once, the page count and the year', () => {
    const doc = { year: 2027, pages: [mkPage('A4', 'p', '#fff', []), mkPage('A4', 'p', '#fff', []), mkPage('Desk', 'l', '#fff', [])] } as CalendarDoc;
    expect(describeDesign(doc)).toBe('A4, portrait + Desk calendar 8×5 in, landscape · 3 pages · 2027');
    expect(describeDesign({ ...doc, pages: doc.pages.slice(0, 1) })).toBe('A4, portrait · 1 page · 2027');
  });
});
