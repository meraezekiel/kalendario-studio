import { describe, expect, it } from 'vitest';
import { CloudError, toCloudError } from './transport';

describe('toCloudError', () => {
  const code = (e: unknown) => {
    const r = toCloudError(e);
    return r instanceof CloudError ? r.code : null;
  };

  it('maps RLS and permission errors to denied', () => {
    expect(code({ code: '42501', message: 'new row violates row-level security policy for table "design_updates"' })).toBe('denied');
    expect(code({ code: '', message: 'new row violates row-level security policy' })).toBe('denied');
    expect(code({ code: '42501', message: 'not allowed' })).toBe('denied');
  });

  it('maps an expired or bad JWT to auth', () => {
    expect(code({ code: 'PGRST303', message: 'JWT expired' })).toBe('auth');
    expect(code({ code: 'PGRST301', message: 'JWSError JWSInvalidSignature' })).toBe('auth');
    expect(code({ code: '', message: 'JWT expired' })).toBe('auth');
  });

  it('maps network failures to offline', () => {
    expect(code(new TypeError('fetch failed'))).toBe('offline');
    expect(code({ code: '', message: 'TypeError: fetch failed', status: 0 })).toBe('offline');
    expect(code({ code: '', message: 'FetchError: network down' })).toBe('offline');
  });

  it('maps limit triggers to limit', () => {
    expect(code({ code: 'P0001', message: 'design limit reached' })).toBe('limit');
    expect(code({ code: 'P0001', message: 'photo storage limit reached' })).toBe('limit');
  });

  it('passes a CloudError through and leaves other errors as plain Errors', () => {
    const c = new CloudError('auth');
    expect(toCloudError(c)).toBe(c);
    const other = toCloudError({ code: '23505', message: 'duplicate key' });
    expect(other).not.toBeInstanceOf(CloudError);
    expect(other).toBeInstanceOf(Error);
    expect(other.message).toBe('duplicate key');
  });
});
