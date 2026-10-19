import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '../calendar/templates';
import type { CalendarDoc } from '../calendar/types';
import { cloudPath, isCloudSrc, photoError, photosOf } from './photos';
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

  it('maps the quota and size refusals to limit', () => {
    expect(code({ code: 'P0001', message: 'photo storage limit reached' })).toBe('limit');
    expect(code({ code: 'P0001', message: 'photo too large' })).toBe('limit');
    // Storage reports the re-checked quota (its trigger) only as a database error.
    expect(code({ name: 'StorageApiError', message: 'database error, code: P0001', status: 500, statusCode: '500' })).toBe('limit');
    expect(code({ name: 'StorageApiError', message: 'The object exceeded the maximum allowed size', status: 413, statusCode: '413' })).toBe('limit');
  });

  it('maps a failed fetch to offline', () => {
    expect(code(new TypeError('Failed to fetch'))).toBe('offline');
    expect(code({ name: 'StorageUnknownError', message: 'Failed to fetch', originalError: new TypeError('Failed to fetch') })).toBe('offline');
  });

  it('maps row-level security to denied', () => {
    expect(code({ code: '42501', message: 'new row violates row-level security policy' })).toBe('denied');
  });
});
