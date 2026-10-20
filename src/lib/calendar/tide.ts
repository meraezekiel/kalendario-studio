/**
 * Tide prediction from harmonic constants (the same method official tide tables use).
 * The constants for each place come from scripts/build-tides.mjs, fitted to UHSLC tide gauge records.
 * Kept free of `@/` imports so that script can load it directly.
 */

/** Height above the gauge's mean level (m) = z0 + Σ f·H·cos(V + u − g). */
export interface TideStation {
  id: string;
  name: string;
  /** Mean level (m) over the fitted records. */
  z0: number;
  /** Mean lower low water (m, same reference as z0): printed heights are measured from it, as in Philippine tide tables. */
  datum: number;
  /** Constituent name → [amplitude in m, phase lag g in degrees]. */
  c: Record<string, [number, number]>;
}

type Nodal = 'none' | 'M2' | 'K1' | 'O1' | 'K2' | 'Mf' | 'Mm' | 'M2^2' | 'M2^3' | 'M2K1';

/** Doodson multipliers of (τ, s, h, p, p1), a fixed phase in degrees, and how the 18.6-year lunar node cycle affects it. */
export const CONSTITUENTS: Record<string, [number[], number, Nodal]> = {
  M2: [[2, 0, 0, 0, 0], 0, 'M2'],
  S2: [[2, 2, -2, 0, 0], 0, 'none'],
  N2: [[2, -1, 0, 1, 0], 0, 'M2'],
  K2: [[2, 2, 0, 0, 0], 0, 'K2'],
  '2N2': [[2, -2, 0, 2, 0], 0, 'M2'],
  MU2: [[2, -2, 2, 0, 0], 0, 'M2'],
  NU2: [[2, -1, 2, -1, 0], 0, 'M2'],
  L2: [[2, 1, 0, -1, 0], 180, 'M2'],
  T2: [[2, 2, -3, 0, 1], 0, 'none'],
  K1: [[1, 1, 0, 0, 0], 90, 'K1'],
  O1: [[1, -1, 0, 0, 0], -90, 'O1'],
  P1: [[1, 1, -2, 0, 0], -90, 'none'],
  S1: [[1, 1, -1, 0, 0], 90, 'none'],
  Q1: [[1, -2, 0, 1, 0], -90, 'O1'],
  '2Q1': [[1, -3, 0, 2, 0], -90, 'O1'],
  RHO1: [[1, -3, 2, 0, 0], -90, 'O1'],
  J1: [[1, 2, 0, -1, 0], 90, 'K1'],
  M4: [[4, 0, 0, 0, 0], 0, 'M2^2'],
  MS4: [[4, 2, -2, 0, 0], 0, 'M2'],
  MN4: [[4, -1, 0, 1, 0], 0, 'M2^2'],
  M6: [[6, 0, 0, 0, 0], 0, 'M2^3'],
  MK3: [[3, 1, 0, 0, 0], 90, 'M2K1'],
  Mf: [[0, 2, 0, 0, 0], 0, 'Mf'],
  Mm: [[0, 1, 0, -1, 0], 0, 'Mm'],
  Sa: [[0, 0, 1, 0, 0], 0, 'none'],
  Ssa: [[0, 0, 2, 0, 0], 0, 'none'],
};

const RAD = Math.PI / 180;

/** Mean longitudes (degrees) of the moon s, sun h, lunar perigee p, solar perigee p1, the lunar node N, and lunar time τ, at `t` (ms, UTC). */
export function astro(t: number) {
  const T = (t / 86400000 + 2440587.5 - 2451545) / 36525;
  const s = 218.3164477 + 481267.88123421 * T;
  const h = 280.46646 + 36000.76983 * T;
  const p = 83.3532465 + 4069.0137287 * T;
  const p1 = 282.93735 + 1.71946 * T;
  const N = 125.04452 - 1934.136261 * T;
  const hours = (((t / 3600000) % 24) + 24) % 24;
  const tau = 15 * hours + 180 - s + h;
  return { tau, s, h, p, p1, N };
}

/** Node factor f and phase correction u (degrees) for each kind (Pugh, "Tides, Surges and Mean Sea-Level", table 4.3). */
function nodal(kind: Nodal, N: number): [number, number] {
  const c = Math.cos(N * RAD), c2 = Math.cos(2 * N * RAD);
  const sn = Math.sin(N * RAD), s2 = Math.sin(2 * N * RAD), s3 = Math.sin(3 * N * RAD);
  const m2: [number, number] = [1 - 0.037 * c, -2.1 * sn];
  const k1: [number, number] = [1.006 + 0.115 * c - 0.009 * c2, -8.9 * sn + 0.7 * s2];
  switch (kind) {
    case 'none': return [1, 0];
    case 'M2': return m2;
    case 'K1': return k1;
    case 'O1': return [1.009 + 0.187 * c - 0.015 * c2, 10.8 * sn - 1.3 * s2 + 0.2 * s3];
    case 'K2': return [1.024 + 0.286 * c + 0.008 * c2, -17.7 * sn + 0.7 * s2];
    case 'Mf': return [1.043 + 0.414 * c, -23.7 * sn + 2.7 * s2 - 0.4 * s3];
    case 'Mm': return [1 - 0.13 * c, 0];
    case 'M2^2': return [m2[0] ** 2, 2 * m2[1]];
    case 'M2^3': return [m2[0] ** 3, 3 * m2[1]];
    case 'M2K1': return [m2[0] * k1[0], m2[1] + k1[1]];
  }
}

/** For each named constituent at time `t`: [f, V + u in radians]. */
export function args(names: string[], t: number): [number, number][] {
  const a = astro(t);
  const base = [a.tau, a.s, a.h, a.p, a.p1];
  return names.map((n) => {
    const [d, ph, kind] = CONSTITUENTS[n];
    const [f, u] = nodal(kind, a.N);
    let v = ph + u;
    for (let i = 0; i < 5; i++) v += d[i] * base[i];
    return [f, (v % 360) * RAD];
  });
}

/** Predicted height (m) at `t` (ms, UTC). */
export function tideHeight(st: TideStation, t: number): number {
  const names = Object.keys(st.c);
  const fa = args(names, t);
  let z = st.z0;
  names.forEach((n, i) => {
    const [H, g] = st.c[n];
    z += fa[i][0] * H * Math.cos(fa[i][1] - g * RAD);
  });
  return z;
}

export interface TideTurn {
  high: boolean;
  /** Minutes after local midnight. */
  min: number;
  /** Height above the gauge's mean level (m). */
  h: number;
}

const STEP = 6 * 60000;
/** Turns that rise or fall less than this (m) are a slack stand, not a real high and low; tables leave them out. */
const MIN_RANGE = 0.05;

/** Every high and low water in month `m` (0-11) of year `y`, by local day (UTC+tzHours). */
export function tideTurns(st: TideStation, y: number, m: number, tzHours = 8): Record<number, TideTurn[]> {
  const tz = tzHours * 3600000;
  const start = Date.UTC(y, m, 1) - tz - STEP * 2, end = Date.UTC(y, m + 1, 1) - tz + STEP * 2;
  const ts: number[] = [], zs: number[] = [];
  for (let t = start; t <= end; t += STEP) {
    ts.push(t);
    zs.push(tideHeight(st, t));
  }
  // Local extremes, refined by a parabola through the three samples around each.
  let turns: { t: number; h: number; high: boolean }[] = [];
  for (let i = 1; i < zs.length - 1; i++) {
    const a = zs[i - 1], b = zs[i], c = zs[i + 1];
    const high = b > a && b >= c, low = b < a && b <= c;
    if (!high && !low) continue;
    const den = a - 2 * b + c;
    const off = den ? (0.5 * (a - c)) / den : 0;
    turns.push({ t: ts[i] + off * STEP, h: b - 0.25 * (a - c) * off, high });
  }
  // Drop small wiggles: remove the smallest high/low pair until every step is a real rise or fall.
  for (;;) {
    let k = -1, least = MIN_RANGE;
    for (let i = 0; i < turns.length - 1; i++) {
      const d = Math.abs(turns[i + 1].h - turns[i].h);
      if (d < least) { least = d; k = i; }
    }
    if (k < 0) break;
    turns = turns.filter((_, i) => i !== k && i !== k + 1);
  }
  const out: Record<number, TideTurn[]> = {};
  for (const x of turns) {
    const local = new Date(x.t + tz);
    if (local.getUTCFullYear() !== y || local.getUTCMonth() !== m) continue;
    const min = local.getUTCHours() * 60 + local.getUTCMinutes() + (local.getUTCSeconds() >= 30 ? 1 : 0);
    (out[local.getUTCDate()] ??= []).push({ high: x.high, min: Math.min(min, 1439), h: x.h });
  }
  return out;
}

/** Height above mean lower low water to the nearest 10 cm: "1.6m", "0.0m", "-0.2m". */
export function heightText(st: TideStation, h: number): string {
  const v = Math.round((h - st.datum) * 10) / 10;
  return `${(v || 0).toFixed(1)}m`;
}

/** "5:07 am", "12:30 pm". */
export function clock(min: number): string {
  const h = Math.floor(min / 60), mm = min % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
