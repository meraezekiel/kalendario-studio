import { describe, expect, it } from 'vitest';
import { safeNext } from './safeNext';

const ORIGIN = 'http://localhost:3101';
const go = (next: string | null) => safeNext(next, ORIGIN, '/designs');

describe('safeNext', () => {
  it('allows same-site paths', () => {
    expect(go('/d/0b6f3c1e-9a2d-4c1b-8f5e-2d3c4b5a6f70')).toBe('/d/0b6f3c1e-9a2d-4c1b-8f5e-2d3c4b5a6f70');
    expect(go('/designs?tab=shared#x')).toBe('/designs?tab=shared#x');
  });

  it('falls back when missing', () => {
    expect(go(null)).toBe('/designs');
    expect(go('')).toBe('/designs');
  });

  it('rejects other sites and schemes', () => {
    expect(go('//evil.com')).toBe('/designs');
    expect(go('/\\evil.com')).toBe('/designs');
    expect(go(new URLSearchParams('next=/%09/evil.com').get('next'))).toBe('/designs'); // "/\t/evil.com"
    expect(go('/\n/evil.com')).toBe('/designs');
    expect(go('https://evil.com')).toBe('/designs');
    expect(go('javascript:alert(1)')).toBe('/designs');
  });

  it('rejects paths that normalise to protocol-relative ones', () => {
    expect(go('/.//evil.com')).toBe('/designs');
    expect(go('/a/..//evil.com')).toBe('/designs');
    expect(go('/%2e//evil.com')).toBe('/designs');
    // Literal query strings decoded the way the app does (nextPath uses URLSearchParams).
    const fromQuery = (q: string) => go(new URLSearchParams(q).get('next'));
    expect(fromQuery('?next=/%09/evil.com')).toBe('/designs');
    expect(fromQuery('?next=/.//evil.com')).toBe('/designs');
    expect(fromQuery('?next=/%2e//evil.com')).toBe('/designs');
    expect(fromQuery('?next=%2Fd%2Fabc')).toBe('/d/abc');
  });
});
