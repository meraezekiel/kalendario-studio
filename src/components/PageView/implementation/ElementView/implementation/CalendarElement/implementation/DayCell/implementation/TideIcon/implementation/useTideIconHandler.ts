import type { TideKind } from '@/lib/calendar/moon';

/** Up and down arrows in a 40×40 box: tall and solid for a spring tide's big range, short and open for a neap tide. */
const ARROWS: Record<TideKind, { d: string; solid: boolean }> = {
  spring: { d: 'M20 2L31 15H24V25H31L20 38L9 25H16V15H9Z', solid: true },
  neap: { d: 'M20 9L29 18H24V22H29L20 31L11 22H16V18H11Z', solid: false },
};

export function useTideIconHandler(kind: TideKind) {
  return ARROWS[kind];
}
