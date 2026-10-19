import { describe, expect, it } from 'vitest';
import { DESIGNS_FULL, MAX_DESIGNS, MAX_PHOTO_BYTES, megabytes, PHOTO_SPACE_BYTES } from './limits';

describe('limits', () => {
  it('match the server (SQL app_limits())', () => {
    expect(PHOTO_SPACE_BYTES).toBe(52428800);
    expect(MAX_DESIGNS).toBe(50);
    expect(MAX_PHOTO_BYTES).toBe(5242880);
  });

  it('formats byte limits as whole megabytes', () => {
    expect(megabytes(PHOTO_SPACE_BYTES)).toBe('50 MB');
    expect(megabytes(MAX_PHOTO_BYTES)).toBe('5 MB');
    expect(megabytes(1572864)).toBe('1.5 MB');
  });

  it('builds the design limit sentence from the number', () => {
    expect(DESIGNS_FULL).toBe("You've reached 50 designs. Delete one to make room.");
  });
});
