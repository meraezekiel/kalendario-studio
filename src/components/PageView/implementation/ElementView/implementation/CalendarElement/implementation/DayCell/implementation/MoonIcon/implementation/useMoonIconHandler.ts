import type { MoonPhase } from '@/lib/calendar/moon';

/** The dark part of the moon for each phase, in a 40×40 box (as seen from the Philippines). */
const DARK: Record<MoonPhase, string | null> = {
  0: 'M20 2A18 18 0 1 1 20 38A18 18 0 1 1 20 2Z',
  1: 'M20 2A18 18 0 0 0 20 38Z',
  2: null,
  3: 'M20 2A18 18 0 0 1 20 38Z',
};

export function useMoonIconHandler(phase: MoonPhase) {
  return { dark: DARK[phase] };
}
