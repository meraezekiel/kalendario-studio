import { describe, expect, it } from 'vitest';
import { DECOS, type DecoKind, decoSvg, PALETTE_IDS } from './deco';

const KINDS = Object.keys(DECOS) as DecoKind[];
const opts = { palette: 'rainbow' as const, seed: 42, amount: 1 };

describe('decorations', () => {
  it('draw valid SVG for every kind, palette and odd sizes', () => {
    for (const kind of KINDS)
      for (const palette of PALETTE_IDS)
        for (const [w, h] of [DECOS[kind].size, [40, 400], [900, 30], [8, 8]] as [number, number][]) {
          const svg = decoSvg(kind, w, h, { ...opts, palette });
          expect(svg, `${kind} ${palette} ${w}x${h}`).toMatch(/^<svg [^>]+>.*<\/svg>$/s);
          expect(svg, `${kind} ${palette} ${w}x${h}`).not.toMatch(/NaN|Infinity|undefined/);
        }
  });
  it('are repeatable for a seed and change when shuffled', () => {
    for (const kind of KINDS.filter((k) => DECOS[k].random)) {
      expect(decoSvg(kind, 400, 300, opts)).toBe(decoSvg(kind, 400, 300, opts));
      expect(decoSvg(kind, 400, 300, opts)).not.toBe(decoSvg(kind, 400, 300, { ...opts, seed: 43 }));
    }
  });
  it('keep balloons inside their box', () => {
    for (const seed of [1, 2, 3, 4, 5, 99])
      for (const [w, h] of [[260, 320], [150, 400], [500, 200]]) {
        const svg = decoSvg('balloons', w, h, { ...opts, seed, amount: 1.6 });
        for (const m of svg.matchAll(/<ellipse cx="([\d.-]+)" cy="([\d.-]+)" rx="([\d.]+)" ry="([\d.]+)" fill="#(?!fff)/g)) {
          const [cx, cy, rx, ry] = m.slice(1).map(Number);
          expect(cx - rx, `seed ${seed} ${w}x${h}`).toBeGreaterThanOrEqual(0);
          expect(cx + rx).toBeLessThanOrEqual(w);
          expect(cy - ry).toBeGreaterThanOrEqual(0);
        }
      }
  });
  it('re-lay out for the size: wider bunting gets more flags, more amount gives more confetti', () => {
    const flags = (w: number) => (decoSvg('bunting-tri', w, 120, opts).match(/<path d="M[^"]*Z"/g) ?? []).length;
    expect(flags(1000)).toBeGreaterThan(flags(500));
    const pieces = (a: number) => (decoSvg('confetti', 400, 300, { ...opts, amount: a }).match(/transform=/g) ?? []).length;
    expect(pieces(2)).toBeGreaterThan(pieces(1));
  });
});
