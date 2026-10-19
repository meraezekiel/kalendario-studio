import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '../calendar/templates';
import type { CalendarDoc } from '../calendar/types';
import { hasTransparency } from '../calendar/samplePhoto';
import { canDeleteCloudPhoto, cloudPath, isCloudSrc, photoError, photosOf, PhotoTooLarge } from './photos';
import { CloudError } from './transport';

const mkDoc = (assets: CalendarDoc['assets']): CalendarDoc => ({ v: 3, year: 2027, holidays: true, cur: 0, assets, tray: Object.keys(assets), pages: TEMPLATES.pastel.make() });

describe('photosOf', () => {
  it('photosOf lists sb: paths only', () => {
    const doc = mkDoc({
      a: { src: 'sb:d1/one.jpg', w: 1, h: 1 },
      b: { src: 'data:image/png;base64,AAAA', w: 1, h: 1 },
      c: { src: 'sb:d1/two.png', w: 1, h: 1 },
      d: { src: 'blob:http://x/123', w: 1, h: 1 },
      e: { src: 'sb:d1/one.jpg', w: 1, h: 1 }, // the same photo twice is listed once
    });
    expect(photosOf(doc).sort()).toEqual(['d1/one.jpg', 'd1/two.png']);
  });

  it('is empty for a doc without cloud photos', () => {
    expect(photosOf(mkDoc({}))).toEqual([]);
  });
});

describe('canDeleteCloudPhoto', () => {
  const doc = mkDoc({
    own: { src: 'sb:d1/one.jpg', w: 1, h: 1 },
    shared1: { src: 'sb:d1/two.jpg', w: 1, h: 1 },
    shared2: { src: 'sb:d1/two.jpg', w: 1, h: 1 },
    other: { src: 'sb:d2/three.jpg', w: 1, h: 1 }, // came in with a template saved from design d2
    local: { src: 'data:image/png;base64,AAAA', w: 1, h: 1 },
  });

  it("is true for this design's own photo that no other asset shares", () => {
    expect(canDeleteCloudPhoto(doc, 'own', 'd1')).toBe(true);
  });

  it("is false for another design's photo", () => {
    expect(canDeleteCloudPhoto(doc, 'other', 'd1')).toBe(false);
    expect(canDeleteCloudPhoto(doc, 'own', 'd10')).toBe(false); // prefix must end at the slash
  });

  it('is false while another asset has the same source', () => {
    expect(canDeleteCloudPhoto(doc, 'shared1', 'd1')).toBe(false);
  });

  it('is false for non-cloud and missing assets', () => {
    expect(canDeleteCloudPhoto(doc, 'local', 'd1')).toBe(false);
    expect(canDeleteCloudPhoto(doc, 'nope', 'd1')).toBe(false);
  });
});

describe('hasTransparency', () => {
  const px = (...alphas: number[]) => new Uint8ClampedArray(alphas.flatMap((a) => [10, 20, 30, a]));
  it('is false when every pixel is opaque', () => {
    expect(hasTransparency(px(255, 255, 255))).toBe(false);
  });
  it('is true when any pixel is (partly) transparent', () => {
    expect(hasTransparency(px(255, 254, 255))).toBe(true);
    expect(hasTransparency(px(0))).toBe(true);
  });
});

describe('isCloudSrc', () => {
  it('is true only for sb: sources', () => {
    expect(isCloudSrc('sb:d1/one.jpg')).toBe(true);
    expect(isCloudSrc('data:image/jpeg;base64,AAAA')).toBe(false);
    expect(isCloudSrc('blob:http://localhost/abc')).toBe(false);
    expect(isCloudSrc('@sample')).toBe(false);
    expect(isCloudSrc('')).toBe(false);
    expect(isCloudSrc(null)).toBe(false);
    expect(isCloudSrc(undefined)).toBe(false);
  });

  it('cloudPath strips the prefix, and is null for anything else', () => {
    expect(cloudPath('sb:d1/one.jpg')).toBe('d1/one.jpg');
    expect(cloudPath('data:x')).toBeNull();
    expect(cloudPath(null)).toBeNull();
  });
});

describe('photoError', () => {
  const code = (e: unknown) => {
    const c = photoError(e);
    return c instanceof CloudError ? c.code : 'other';
  };

  it('maps the quota refusals to limit', () => {
    expect(code({ code: 'P0001', message: 'photo storage limit reached' })).toBe('limit');
    // Storage reports the re-checked quota (its trigger) only as a database error.
    expect(code({ name: 'StorageApiError', message: 'database error, code: P0001', status: 500, statusCode: '500' })).toBe('limit');
  });

  it('maps the per-photo size refusals to PhotoTooLarge, not limit', () => {
    expect(photoError({ code: 'P0001', message: 'photo too large' })).toBeInstanceOf(PhotoTooLarge);
    expect(photoError({ name: 'StorageApiError', message: 'The object exceeded the maximum allowed size', status: 413, statusCode: '413' })).toBeInstanceOf(PhotoTooLarge);
  });

  it('maps a failed fetch to offline', () => {
    expect(code(new TypeError('Failed to fetch'))).toBe('offline');
    expect(code({ name: 'StorageUnknownError', message: 'Failed to fetch', originalError: new TypeError('Failed to fetch') })).toBe('offline');
  });

  it('maps row-level security to denied', () => {
    expect(code({ code: '42501', message: 'new row violates row-level security policy' })).toBe('denied');
  });
});
