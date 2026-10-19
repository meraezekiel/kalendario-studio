/**
 * The account limits, as the app shows and pre-checks them. The server enforces the same numbers in
 * SQL `app_limits()`: change both together.
 */

/** Photo space per account. */
export const PHOTO_SPACE_BYTES = 52428800;
/** Designs one account can own. */
export const MAX_DESIGNS = 50;
/** Largest single photo (after downscaling). */
export const MAX_PHOTO_BYTES = 5242880;

/** A byte count as megabytes for people, e.g. "50 MB" or "1.5 MB". */
export function megabytes(bytes: number): string {
  const n = Math.round((bytes / 1048576) * 10) / 10;
  return `${n} MB`;
}

/** Said when the account already owns MAX_DESIGNS designs. */
export const DESIGNS_FULL = `You've reached ${MAX_DESIGNS} designs. Delete one to make room.`;
