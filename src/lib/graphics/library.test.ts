import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findGraphic, GRAPHIC_CATEGORIES, searchGraphics } from './library';

describe('graphics library', () => {
  it('has an SVG file for every graphic', () => {
    const missing = GRAPHIC_CATEGORIES.flatMap((c) => c.items).filter((g) => !g.deco).filter((g) => !existsSync(join(process.cwd(), 'public/graphics', `${g.key}.svg`)));
    expect(missing).toEqual([]);
  });
  it('has unique keys', () => {
    const keys = GRAPHIC_CATEGORIES.flatMap((c) => c.items.map((g) => g.key));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('searches names, tags and Filipino words', () => {
    expect(searchGraphics('pasko').map((g) => g.key)).toContain('fluent/christmas-tree');
    expect(searchGraphics('carabao').map((g) => g.key)).toEqual(['fluent/water-buffalo']);
    expect(searchGraphics('  ')).toEqual([]);
    expect(searchGraphics('fb').map((g) => g.key)).toContain('social/facebook-badge');
    expect(searchGraphics('tiktok').map((g) => g.key)).toEqual(['social/tiktok-badge', 'social/tiktok-color', 'social/tiktok-black']);
    expect(searchGraphics('telepono').map((g) => g.key)).toContain('social/phone-color');
    expect(findGraphic('social/instagram-badge')?.stretch).toBe(false);
    expect(findGraphic('gradient/sunset')?.stretch).toBe(true);
    expect(findGraphic('fluent/mango')?.stretch).toBe(false);
  });
});
