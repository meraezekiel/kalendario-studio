/** Small drawing helpers shared by the generated decorations and illustration packs. */
export const f = (n: number) => +n.toFixed(1);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Small seeded random generator (mulberry32), so the same seed draws the same scatter. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => clamp(Math.round(((n >> s) & 255) * k), 0, 255);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
export const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

/** A sagging string from (0, y0) to (w, y0); returns its y at x. */
export const sagAt = (w: number, y0: number, sag: number) => (x: number) => y0 + 4 * sag * (x / w) * (1 - x / w);
export const sagPath = (w: number, y0: number, sag: number) => `M0 ${f(y0)} Q${f(w / 2)} ${f(y0 + 2 * sag)} ${f(w)} ${f(y0)}`;

/** A hand-drawn looking smooth curve through points, with a little wobble (Catmull-Rom → Bézier). */
export function wobble(pts: [number, number][], r: () => number, j: number) {
  const p = pts.map(([x, y]): [number, number] => [x + (r() - 0.5) * j, y + (r() - 0.5) * j]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? c;
    d += ` C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
  }
  return d;
}
