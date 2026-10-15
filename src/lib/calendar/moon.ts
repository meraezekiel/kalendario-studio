/**
 * Moon phases from Jean Meeus, "Astronomical Algorithms" (ch. 49), accurate to a few minutes.
 * Dates are given in Philippine time (UTC+8) by default.
 */
export type MoonPhase = 0 | 1 | 2 | 3;
export const MOON_NAMES = ['New moon', 'First quarter', 'Full moon', 'Last quarter'] as const;

const rad = (d: number) => (d * Math.PI) / 180;

/** Julian Ephemeris Day of lunation `k` (integer) plus `phase` quarters. */
function phaseJDE(k: number, phase: MoonPhase): number {
  k += phase / 4;
  const T = k / 1236.85;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = rad(2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3);
  const Mp = rad(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4);
  const F = rad(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4);
  const O = rad(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3);
  const s = Math.sin;
  if (phase === 0 || phase === 2) {
    const full = phase === 2;
    jde += (full ? -0.40614 : -0.4072) * s(Mp) + (full ? 0.17302 : 0.17241) * E * s(M) + (full ? 0.01614 : 0.01608) * s(2 * Mp)
      + (full ? 0.01043 : 0.01039) * s(2 * F) + (full ? 0.00734 : 0.00739) * E * s(Mp - M) - (full ? 0.00515 : 0.00514) * E * s(Mp + M)
      + (full ? 0.00209 : 0.00208) * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M)
      - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O);
  } else {
    jde += -0.62801 * s(Mp) + 0.17172 * E * s(M) - 0.01183 * E * s(Mp + M) + 0.00862 * s(2 * Mp) + 0.00804 * s(2 * F)
      + 0.00454 * E * s(Mp - M) + 0.00204 * E * E * s(2 * M) - 0.0018 * s(Mp - 2 * F) - 0.0007 * s(Mp + 2 * F) - 0.0004 * s(3 * Mp)
      - 0.00034 * E * s(2 * Mp - M) + 0.00032 * E * s(M + 2 * F) + 0.00032 * E * s(M - 2 * F) - 0.00028 * E * E * s(Mp + 2 * M)
      + 0.00027 * E * s(2 * Mp + M) - 0.00017 * s(O);
    const c = Math.cos;
    const W = 0.00306 - 0.00038 * E * c(M) + 0.00026 * c(Mp) - 0.00002 * c(Mp - M) + 0.00002 * c(Mp + M) + 0.00002 * c(2 * F);
    jde += phase === 1 ? W : -W;
  }
  return jde;
}

export interface MoonEvent {
  day: number;
  phase: MoonPhase;
  /** Exact moment as a JS Date (UTC). */
  at: Date;
}

/** The moon phases that fall in month `m` (0-11) of year `y`, in date order. */
export function moonPhases(y: number, m: number, tzHours = 8): MoonEvent[] {
  const k0 = Math.floor((y + m / 12 - 2000) * 12.3685) - 2;
  const out: MoonEvent[] = [];
  for (let k = k0; k < k0 + 5; k++) {
    for (const phase of [0, 1, 2, 3] as MoonPhase[]) {
      const at = new Date((phaseJDE(k, phase) - 2440587.5) * 86400000);
      const local = new Date(at.getTime() + tzHours * 3600000);
      if (local.getUTCFullYear() === y && local.getUTCMonth() === m) out.push({ day: local.getUTCDate(), phase, at });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
