import { describe, expect, it } from 'vitest';
import { cleanName, isShopeeUrl, metaOf, shopeeItem } from './shopeeLink';

describe('isShopeeUrl', () => {
  it('takes only https links on Shopee', () => {
    expect(isShopeeUrl('https://s.shopee.ph/6q1gLhDJxr')).toBe(true);
    expect(isShopeeUrl(' https://shopee.ph/product/1/2 ')).toBe(true);
    expect(isShopeeUrl('https://shp.ee/abc')).toBe(true);
    expect(isShopeeUrl('http://shopee.ph/x')).toBe(false);
    expect(isShopeeUrl('https://notshopee.ph/x')).toBe(false);
    expect(isShopeeUrl('https://shopee.ph.evil.com/x')).toBe(false);
    expect(isShopeeUrl('https://localhost/x')).toBe(false);
    expect(isShopeeUrl('not a link')).toBe(false);
  });
});

describe('shopeeItem', () => {
  it('finds the shop and item numbers in each product address style', () => {
    expect(shopeeItem('https://shopee.ph/opaanlp/1167612529/24517746644?__mobile__=1')).toEqual({ shop: '1167612529', item: '24517746644' });
    expect(shopeeItem('https://shopee.ph/product/11/22')).toEqual({ shop: '11', item: '22' });
    expect(shopeeItem('https://shopee.ph/Ring-binder-A4-i.11.22?sp_atk=x')).toEqual({ shop: '11', item: '22' });
    expect(shopeeItem('https://s.shopee.ph/6q1gLhDJxr')).toBeNull();
    expect(shopeeItem('https://shopee.ph/search/1/2/3')).toBeNull();
  });
});

describe('metaOf and cleanName', () => {
  it('reads og: tags with either attribute order and decodes them', () => {
    const html = `<meta property="og:title" content="Stand &amp; holder | Shopee Philippines"/><meta content="https://x/y.jpg" property="og:image">`;
    expect(metaOf(html, 'og:title')).toBe('Stand & holder | Shopee Philippines');
    expect(metaOf(html, 'og:image')).toBe('https://x/y.jpg');
    expect(metaOf(html, 'og:price')).toBe('');
    expect(cleanName(metaOf(html, 'og:title'))).toBe('Stand & holder');
    expect(cleanName('  Ring   binder ')).toBe('Ring binder');
  });
});
