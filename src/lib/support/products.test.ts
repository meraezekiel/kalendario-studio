import { describe, expect, it } from 'vitest';
import { formatPrice, isProductUrl, moveItem, parsePrice, priceAsOf, type Product, visibleProducts } from './products';

const product = (p: Partial<Product>): Product => ({
  id: 'x', name: 'Stand', note: '', price: null, price_checked_at: null, url: 'https://s.shopee.ph/abc', image: null, position: 0, hidden: false, ...p,
});

describe('formatPrice', () => {
  it('drops centavos on whole pesos and groups thousands', () => {
    expect(formatPrice(249)).toBe('₱249');
    expect(formatPrice(1249.5)).toBe('₱1,249.50');
    expect(formatPrice(null)).toBe('');
  });
});

describe('parsePrice', () => {
  it('reads what people type', () => {
    expect(parsePrice('₱1,249.50')).toBe(1249.5);
    expect(parsePrice(' 249 ')).toBe(249);
    expect(parsePrice('PHP 99')).toBe(99);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('cheap')).toBeNaN();
    expect(parsePrice('1.234')).toBeNaN();
  });
});

describe('priceAsOf', () => {
  const now = new Date('2026-10-22T08:00:00Z');
  it('shows the day, and the year only when it is not this year', () => {
    expect(priceAsOf('2026-10-22T03:00:00Z', now)).toBe('Price as of Oct 22');
    expect(priceAsOf('2025-12-01T03:00:00Z', now)).toBe('Price as of Dec 1, 2025');
    expect(priceAsOf(null, now)).toBe('');
  });
});

describe('isProductUrl', () => {
  it('takes https links only', () => {
    expect(isProductUrl('https://s.shopee.ph/9zX')).toBe(true);
    expect(isProductUrl('http://shopee.ph')).toBe(false);
    expect(isProductUrl('javascript:alert(1)')).toBe(false);
    expect(isProductUrl('')).toBe(false);
  });
});

describe('visibleProducts', () => {
  it('hides hidden and unfinished products, and keeps the admin order', () => {
    const list = [
      product({ id: 'b', position: 2 }),
      product({ id: 'a', position: 1 }),
      product({ id: 'hidden', hidden: true }),
      product({ id: 'no-name', name: ' ' }),
      product({ id: 'no-link', url: '' }),
    ];
    expect(visibleProducts(list).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('moveItem', () => {
  it('moves one item and leaves the rest in order', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(['a', 'b'], 1, 9)).toEqual(['a', 'b']);
  });
});
