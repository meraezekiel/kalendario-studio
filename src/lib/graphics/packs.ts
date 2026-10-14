/**
 * Generated illustration packs (organic rainbows, leaves, sketchy flowers, monoline shapes, zodiac).
 * Same contract as the decorations: draw(w, h, colors, random) returns SVG markup for that size.
 */
import { clamp, f, shade, wobble } from './decoKit';
import zodiac from './zodiac.json';

type Draw = (w: number, h: number, c: string[], r: () => number, amount: number) => string;
export interface PackDeco { label: string; words: string; size: [number, number]; random: boolean; draw: Draw }

export const INK = '#2d2a26';
const P = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ') + ' Z';

/** Risograph look: the filled shape plus its outline slightly out of register. */
export const riso = (d: string, fill: string, t: number, extra = '') =>
  `<path d="${d}" fill="${fill}"${extra}/><path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(t)}" stroke-linejoin="round" transform="translate(${f(t * 1.6)} ${f(t * 1.1)})"/>`;

/* ---------- organic rainbows ---------- */
function rainbow(style: 'solid' | 'gap' | 'outline' | 'dots' | 'clouds' | 'sun', bands: number): Draw {
  return (w, h, c) => {
    const base = style === 'clouds' ? h * 0.82 : h * 0.98;
    // Leave room around the arch for the dots.
    const R = Math.min(w / 2, base) * (style === 'dots' ? 0.8 : 0.97), cx = w / 2;
    const t = (R * (style === 'sun' ? 0.5 : 0.62)) / bands, g = style === 'gap' ? t * 0.35 : t * 0.08;
    let s = '';
    for (let i = 0; i < bands; i++) {
      const ro = R - i * (t + g), ri = Math.max(0, ro - t), col = c[i % c.length];
      if (style === 'outline') {
        const rm = (ro + ri) / 2;
        s += `<path d="M${f(cx - rm)} ${f(base)} A${f(rm)} ${f(rm)} 0 0 1 ${f(cx + rm)} ${f(base)}" fill="none" stroke="${col}" stroke-width="${f(t * 0.32)}" stroke-linecap="round"/>`;
      } else {
        s += `<path d="M${f(cx - ro)} ${f(base)} A${f(ro)} ${f(ro)} 0 0 1 ${f(cx + ro)} ${f(base)} L${f(cx + ri)} ${f(base)} A${f(ri)} ${f(ri)} 0 0 0 ${f(cx - ri)} ${f(base)} Z" fill="${col}"/>`;
      }
    }
    if (style === 'sun') {
      const sr = R - bands * (t + g) - t * 0.6;
      s += `<path d="M${f(cx - sr)} ${f(base)} A${f(sr)} ${f(sr)} 0 0 1 ${f(cx + sr)} ${f(base)} Z" fill="${c[c.length - 1]}"/>`;
    }
    if (style === 'dots') {
      const rd = R + t * 0.9, n = 9;
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (Math.PI * (i + 0.5)) / n;
        s += `<circle cx="${f(cx + Math.cos(a) * rd)}" cy="${f(base + Math.sin(a) * rd)}" r="${f(t * 0.28)}" fill="${c[i % c.length]}"/>`;
      }
    }
    if (style === 'clouds') {
      const cloud = (x: number, k: number) => {
        const u = R * 0.22 * k, y = base;
        return `<g fill="#ffffff" stroke="#d9d2cb" stroke-width="${f(Math.max(1, u * 0.06))}"><path d="M${f(x - u * 1.6)} ${f(y + u * 0.55)} a${f(u * 0.6)} ${f(u * 0.6)} 0 0 1 ${f(u * 0.35)} ${f(-u * 1.05)} a${f(u * 0.8)} ${f(u * 0.8)} 0 0 1 ${f(u * 1.45)} ${f(-u * 0.4)} a${f(u * 0.7)} ${f(u * 0.7)} 0 0 1 ${f(u * 1.2)} ${f(u * 0.55)} a${f(u * 0.55)} ${f(u * 0.55)} 0 0 1 ${f(u * 0.2)} ${f(u * 0.9)} Z"/></g>`;
      };
      const ri = R - (bands - 1) * (t + g) - t;
      s += cloud(cx - (R + ri) / 2, 1.1) + cloud(cx + (R + ri) / 2, 1);
    }
    return s;
  };
}

/* ---------- leaves ---------- */
/** A leaf from (0,0) pointing up to (0,-L) with half-width W; `curve` bends it sideways. */
export function leafPath(L: number, W: number, curve = 0) {
  return `M0 0 C${f(W * 1.1 + curve)} ${f(-L * 0.25)} ${f(W * 0.9 + curve)} ${f(-L * 0.75)} ${f(curve)} ${f(-L)} C${f(-W * 0.9 + curve)} ${f(-L * 0.75)} ${f(-W * 1.1 + curve)} ${f(-L * 0.25)} 0 0 Z`;
}

function leafSimple(w: number, h: number, c: string[]) {
  const L = h * 0.92, W = Math.min(w * 0.36, L * 0.3), t = clamp(L / 120, 0.8, 3);
  let veins = '';
  for (let i = 1; i <= 5; i++) {
    const y = -L * (i / 6.5), len = W * (0.9 - i * 0.08);
    veins += `<path d="M${f(i * 0.6)} ${f(y)} q${f(len * 0.5)} ${f(-len * 0.25)} ${f(len)} ${f(-len * 0.55)} M${f(i * 0.6)} ${f(y)} q${f(-len * 0.5)} ${f(-len * 0.25)} ${f(-len)} ${f(-len * 0.55)}" stroke="${shade(c[0], 0.7)}" stroke-width="${f(t)}" fill="none" stroke-linecap="round"/>`;
  }
  return `<g transform="translate(${f(w / 2)} ${f(h * 0.97)}) rotate(12)"><path d="M0 ${f(L * 0.06)} L0 0" stroke="${shade(c[0], 0.7)}" stroke-width="${f(t * 2)}" stroke-linecap="round"/><path d="${leafPath(L, W, W * 0.15)}" fill="${c[0]}"/><path d="M0 0 Q${f(W * 0.12)} ${f(-L * 0.5)} ${f(W * 0.15)} ${f(-L * 0.95)}" stroke="${shade(c[0], 0.7)}" stroke-width="${f(t * 1.4)}" fill="none" stroke-linecap="round"/>${veins}</g>`;
}

function monstera(w: number, h: number, c: string[]) {
  const s = Math.min(w, h * 0.9) / 200, cx = w / 2, cy = h * 0.46;
  // Heart-shaped, with a notch at the bottom where the stem joins.
  const leaf = `M0 62 C-26 98 -98 74 -96 4 C-95 -52 -54 -92 0 -92 C54 -92 95 -52 96 4 C98 74 26 98 0 62 Z`;
  // Slits run in from the edge, part of the way to the midrib (none at the bottom where the stem is).
  const slits = [-165, -135, -105, -75, -45, -15, 15, 165].map((a) => {
    const rad = (a * Math.PI) / 180;
    return `<path d="M${f(Math.cos(rad) * 52)} ${f(Math.sin(rad) * 52 + 4)} L${f(Math.cos(rad) * 130)} ${f(Math.sin(rad) * 130 + 4)}" stroke="#000" stroke-width="8" stroke-linecap="round"/>`;
  }).join('');
  const holes = [[-46, -30], [44, -34], [-40, 34], [50, 28]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="13" fill="#000" transform="rotate(${x > 0 ? 25 : -25} ${x} ${y})"/>`).join('');
  return `<defs><mask id="m"><path d="${leaf}" fill="#fff"/>${slits}${holes}</mask></defs>` +
    `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(s)})"><path d="M0 60 Q8 90 4 ${f(100 + (h / s) * 0.1)}" stroke="${shade(c[0], 0.75)}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    `<path d="${leaf}" fill="${c[0]}" mask="url(#m)"/><path d="M0 -84 Q-4 -10 0 60" stroke="${shade(c[0], 0.75)}" stroke-width="4" fill="none"/></g>`;
}

function fern(w: number, h: number, c: string[]) {
  const L = h * 0.94, n = 13, t = clamp(L / 140, 0.8, 3);
  let s = `<path d="M0 0 Q${f(w * 0.06)} ${f(-L * 0.5)} ${f(w * 0.02)} ${f(-L)}" stroke="${shade(c[0], 0.7)}" stroke-width="${f(t * 1.6)}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), y = -L * (0.08 + k * 0.86), x = w * 0.06 * Math.sin(k * Math.PI) * 0.9, len = Math.min(w * 0.42, L * 0.24) * (1 - k * 0.75);
    for (const side of [1, -1]) s += `<path d="${leafPath(len, len * 0.22)}" fill="${c[(i + (side > 0 ? 0 : 1)) % Math.min(2, c.length)]}" transform="translate(${f(x)} ${f(y)}) rotate(${side * (62 - k * 20)})"/>`;
  }
  return `<g transform="translate(${f(w / 2)} ${f(h * 0.98)})">${s}</g>`;
}

function eucalyptus(w: number, h: number, c: string[]) {
  const L = h * 0.94, n = 7, t = clamp(L / 140, 0.8, 3);
  let s = `<path d="M0 0 C${f(w * 0.15)} ${f(-L * 0.35)} ${f(-w * 0.12)} ${f(-L * 0.65)} ${f(w * 0.04)} ${f(-L)}" stroke="${shade(c[0], 0.65)}" stroke-width="${f(t * 1.4)}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), y = -L * (0.12 + k * 0.82), x = Math.sin(k * 3) * w * 0.05, r = Math.min(w * 0.17, L * 0.09) * (1 - k * 0.35);
    s += `<ellipse cx="${f(x + r * 0.9)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.85)}" fill="${c[i % c.length]}"/><ellipse cx="${f(x - r * 0.9)}" cy="${f(y - r * 0.4)}" rx="${f(r)}" ry="${f(r * 0.85)}" fill="${c[(i + 1) % c.length]}"/>`;
  }
  return `<g transform="translate(${f(w / 2)} ${f(h * 0.98)})">${s}</g>`;
}

function palmFan(w: number, h: number, c: string[]) {
  const L = Math.min(h * 0.9, w * 0.6), n = 11;
  let s = `<path d="M0 0 L0 ${f(h * 0.08)}" stroke="${shade(c[0], 0.7)}" stroke-width="${f(L * 0.03)}" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const a = -75 + (150 * i) / (n - 1), len = L * (0.75 + 0.25 * Math.sin((i / (n - 1)) * Math.PI));
    s += `<path d="${leafPath(len, len * 0.09)}" fill="${c[i % Math.min(3, c.length)]}" transform="rotate(${f(a)})"/>`;
  }
  return `<g transform="translate(${f(w / 2)} ${f(h * 0.9)})">${s}</g>`;
}

function heartLeaf(w: number, h: number, c: string[]) {
  const s = Math.min(w, h) / 200;
  return `<g transform="translate(${f(w / 2)} ${f(h * 0.5)}) scale(${f(s)})"><path d="M0 70 Q0 90 -6 100" stroke="${shade(c[0], 0.7)}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M0 72 C-60 40 -95 0 -80 -45 C-68 -82 -22 -84 0 -52 C22 -84 68 -82 80 -45 C95 0 60 40 0 72 Z" fill="${c[0]}"/>` +
    `<path d="M0 -50 L0 68 M0 -10 Q-30 -20 -55 -40 M0 20 Q-30 10 -60 -5 M0 -10 Q30 -20 55 -40 M0 20 Q30 10 60 -5" stroke="${shade(c[0], 0.72)}" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>`;
}

function branch(w: number, h: number, c: string[]) {
  const L = h * 0.94, t = clamp(L / 140, 0.8, 3), n = 8;
  let s = `<path d="M0 0 Q${f(w * 0.12)} ${f(-L * 0.55)} ${f(-w * 0.04)} ${f(-L)}" stroke="#7a5a3a" stroke-width="${f(t * 1.6)}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), y = -L * (0.1 + k * 0.85), x = w * 0.12 * Math.sin(k * Math.PI) * 0.8 - k * w * 0.04, len = Math.min(w * 0.4, L * 0.22) * (1 - k * 0.3), side = i % 2 ? 1 : -1;
    s += `<path d="${leafPath(len, len * 0.3)}" fill="${c[0]}" transform="translate(${f(x)} ${f(y)}) rotate(${side * 55})"/>`;
    if (i % 3 === 1) s += `<circle cx="${f(x - side * len * 0.25)}" cy="${f(y + len * 0.1)}" r="${f(len * 0.12)}" fill="${c[c.length - 1]}"/><circle cx="${f(x - side * len * 0.42)}" cy="${f(y + len * 0.2)}" r="${f(len * 0.1)}" fill="${c[c.length - 1]}"/>`;
  }
  return `<g transform="translate(${f(w / 2)} ${f(h * 0.98)})">${s}</g>`;
}

function leafCluster(w: number, h: number, c: string[]) {
  const L = Math.min(h * 0.8, w * 0.7);
  return `<g transform="translate(${f(w / 2)} ${f(h * 0.94)})">` +
    [-50, -22, 4, 30, 56].map((a, i) => `<path d="${leafPath(L * (i === 2 ? 1 : 0.8), L * 0.2, L * 0.04)}" fill="${c[i % c.length]}" transform="rotate(${a})"/>`).join('') + '</g>';
}

/* ---------- sketchy flowers ---------- */
function daisy(w: number, h: number, c: string[]) {
  const R = Math.min(w, h) * 0.46, t = clamp(R / 45, 0.8, 2.5), n = 12;
  let s = '';
  for (let i = 0; i < n; i++) s += riso(`M0 0 C${f(R * 0.22)} ${f(-R * 0.3)} ${f(R * 0.2)} ${f(-R * 0.9)} 0 ${f(-R)} C${f(-R * 0.2)} ${f(-R * 0.9)} ${f(-R * 0.22)} ${f(-R * 0.3)} 0 0 Z`, c[0], t, ` transform="rotate(${(360 * i) / n})"`).replace(/transform="translate/, `transform="rotate(${(360 * i) / n}) translate`);
  return `<g transform="translate(${f(w / 2)} ${f(h / 2)})">${s}${riso(`M${f(-R * 0.3)} 0 A${f(R * 0.3)} ${f(R * 0.3)} 0 1 1 ${f(R * 0.3)} 0 A${f(R * 0.3)} ${f(R * 0.3)} 0 1 1 ${f(-R * 0.3)} 0 Z`, c[1] ?? '#f2c94c', t)}</g>`;
}

function tulip(w: number, h: number, c: string[]) {
  const s = Math.min(w / 120, h / 220), t = 1.4;
  const stem = `<path d="M60 90 Q58 150 62 215" stroke="#3f7d4e" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const leafL = riso('M60 200 C30 180 22 140 30 110 C46 140 56 170 60 200 Z', '#4f9a62', t);
  const leafR = riso('M62 190 C90 170 100 140 96 120 C80 140 70 160 62 190 Z', '#5aa86c', t);
  const cup = riso('M30 40 C28 70 38 94 60 96 C82 94 92 70 90 40 L76 56 L60 30 L44 56 Z', c[0], t);
  const back = `<path d="M44 56 L60 22 L76 56 Z" fill="${shade(c[0], 0.8)}"/>`;
  return `<g transform="translate(${f((w - 120 * s) / 2)} ${f(h - 220 * s)}) scale(${f(s)})">${stem}${leafL}${leafR}${back}${cup}</g>`;
}

function poppy(w: number, h: number, c: string[]) {
  const R = Math.min(w, h) * 0.46, t = clamp(R / 45, 0.8, 2.5);
  let s = '';
  for (let i = 0; i < 5; i++) s += `<g transform="rotate(${i * 72})">${riso(`M0 0 C${f(R * 0.7)} ${f(-R * 0.2)} ${f(R * 0.75)} ${f(-R * 0.95)} 0 ${f(-R)} C${f(-R * 0.75)} ${f(-R * 0.95)} ${f(-R * 0.7)} ${f(-R * 0.2)} 0 0 Z`, i % 2 ? c[0] : shade(c[0], 0.9), t)}</g>`;
  let dots = '';
  for (let i = 0; i < 10; i++) dots += `<circle cx="${f(Math.cos(i * 0.63) * R * 0.3)}" cy="${f(Math.sin(i * 0.63) * R * 0.3)}" r="${f(R * 0.035)}" fill="${INK}"/>`;
  return `<g transform="translate(${f(w / 2)} ${f(h / 2)})">${s}<circle r="${f(R * 0.2)}" fill="${INK}"/>${dots}</g>`;
}

function gumamela(w: number, h: number, c: string[]) {
  const R = Math.min(w, h) * 0.44, t = clamp(R / 45, 0.8, 2.5);
  let s = '';
  for (let i = 0; i < 5; i++) s += `<g transform="rotate(${i * 72 + 10})">${riso(`M0 0 C${f(R * 0.65)} ${f(-R * 0.1)} ${f(R * 0.8)} ${f(-R * 0.85)} ${f(R * 0.1)} ${f(-R)} C${f(-R * 0.2)} ${f(-R * 1.05)} ${f(-R * 0.7)} ${f(-R * 0.7)} 0 0 Z`, c[0], t)}<path d="M0 0 L${f(R * 0.12)} ${f(-R * 0.6)}" stroke="${shade(c[0], 0.65)}" stroke-width="${f(t)}"/></g>`;
  const stamen = `<path d="M0 0 Q${f(R * 0.25)} ${f(-R * 0.6)} ${f(R * 0.55)} ${f(-R * 1.05)}" stroke="${c[1] ?? '#f2c94c'}" stroke-width="${f(t * 2)}" fill="none" stroke-linecap="round"/>` +
    [0, 1, 2, 3].map((i) => `<circle cx="${f(R * (0.5 + i * 0.05))}" cy="${f(-R * (1.0 + i * 0.04))}" r="${f(R * 0.05)}" fill="${c[1] ?? '#f2c94c'}"/>`).join('');
  return `<g transform="translate(${f(w / 2)} ${f(h * 0.56)})">${s}<circle r="${f(R * 0.14)}" fill="${shade(c[0], 0.55)}"/>${stamen}</g>`;
}

function wildflowers(w: number, h: number, c: string[]) {
  const t = clamp(h / 200, 0.8, 2);
  const stems: [number, number, number][] = [[0.5, 0.12, 0], [0.3, 0.28, -14], [0.7, 0.24, 12], [0.42, 0.45, -6], [0.6, 0.5, 8]];
  let s = '';
  stems.forEach(([x, top, bend], i) => {
    const X = w * x, Y = h * top, r = Math.min(w, h) * (0.07 + (i % 2) * 0.02);
    s += `<path d="M${f(w / 2)} ${f(h * 0.98)} Q${f((X + w / 2) / 2 + bend)} ${f(h * 0.6)} ${f(X)} ${f(Y)}" stroke="#4f8a5b" stroke-width="${f(t * 1.5)}" fill="none" stroke-linecap="round"/>`;
    for (let k = 0; k < 5; k++) s += `<circle cx="${f(X + Math.cos((k * 2 * Math.PI) / 5) * r * 0.7)}" cy="${f(Y + Math.sin((k * 2 * Math.PI) / 5) * r * 0.7)}" r="${f(r * 0.55)}" fill="${c[i % c.length]}"/>`;
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r * 0.32)}" fill="#f6d365"/>`;
  });
  return s;
}

function lavender(w: number, h: number, c: string[]) {
  let s = '';
  [-0.16, 0, 0.16].forEach((dx, i) => {
    const x = w * (0.5 + dx), top = h * (0.06 + Math.abs(dx) * 0.4), r = Math.min(w * 0.06, h * 0.03);
    s += `<path d="M${f(w / 2)} ${f(h * 0.98)} Q${f(x)} ${f(h * 0.6)} ${f(x)} ${f(top)}" stroke="#6b8f5a" stroke-width="${f(Math.max(1, r * 0.35))}" fill="none"/>`;
    for (let k = 0; k < 9; k++) {
      const y = top + k * r * 1.7;
      s += `<ellipse cx="${f(x - r * 0.6)}" cy="${f(y)}" rx="${f(r * 0.6)}" ry="${f(r)}" fill="${c[(i + k) % Math.min(2, c.length)]}" transform="rotate(-25 ${f(x - r * 0.6)} ${f(y)})"/><ellipse cx="${f(x + r * 0.6)}" cy="${f(y + r * 0.5)}" rx="${f(r * 0.6)}" ry="${f(r)}" fill="${c[(i + k + 1) % Math.min(2, c.length)]}" transform="rotate(25 ${f(x + r * 0.6)} ${f(y + r * 0.5)})"/>`;
    }
  });
  return s;
}

function sunflower(w: number, h: number, c: string[]) {
  const R = Math.min(w, h) * 0.47, n = 18, t = clamp(R / 50, 0.8, 2.5);
  let s = '';
  for (let i = 0; i < n; i++) s += `<path d="${leafPath(R, R * 0.17)}" fill="${i % 2 ? c[0] : shade(c[0], 0.9)}" stroke="${shade(c[0], 0.7)}" stroke-width="${f(t * 0.6)}" transform="rotate(${(360 * i) / n})"/>`;
  let seeds = '';
  for (let i = 0; i < 40; i++) {
    const a = i * 2.39996, d = Math.sqrt(i / 40) * R * 0.42;
    seeds += `<circle cx="${f(Math.cos(a) * d)}" cy="${f(Math.sin(a) * d)}" r="${f(R * 0.03)}" fill="#3b2a1a" opacity=".7"/>`;
  }
  return `<g transform="translate(${f(w / 2)} ${f(h / 2)})">${s}<circle r="${f(R * 0.46)}" fill="${c[1] ?? '#7a4a1d'}"/>${seeds}</g>`;
}

function rosette(w: number, h: number, c: string[], r: () => number) {
  const R = Math.min(w, h) * 0.44, t = clamp(R / 18, 1.5, 6);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const a = i * 0.42, d = R * (1 - i / 66);
    pts.push([Math.cos(a) * d, Math.sin(a) * d]);
  }
  return `<g transform="translate(${f(w / 2)} ${f(h / 2)})"><circle r="${f(R)}" fill="${c[0]}"/><path d="${wobble(pts, r, t * 0.3)}" fill="none" stroke="${shade(c[0], 0.7)}" stroke-width="${f(t * 0.6)}" stroke-linecap="round"/></g>`;
}

/* ---------- monoline ---------- */
function mono(build: (w: number, h: number, t: number) => string): Draw {
  return (w, h, c) => {
    const t = clamp(Math.min(w, h) / 70, 1, 4);
    return `<g fill="none" stroke="${c[0]}" stroke-width="${f(t)}" stroke-linecap="round" stroke-linejoin="round">${build(w, h, t)}</g>`;
  };
}
const poly = (w: number, h: number, t: number, n: number, rot: number) => {
  const R = Math.min(w, h) / 2 - t * 2;
  return P(Array.from({ length: n }, (_, i): [number, number] => [w / 2 + Math.cos(rot + (i * 2 * Math.PI) / n) * R, h / 2 + Math.sin(rot + (i * 2 * Math.PI) / n) * R]));
};
const MONO: Record<string, [string, string, (w: number, h: number, t: number) => string]> = {
  circle: ['Circle', 'circle round ring', (w, h, t) => `<ellipse cx="${f(w / 2)}" cy="${f(h / 2)}" rx="${f(w / 2 - t * 2)}" ry="${f(h / 2 - t * 2)}"/>`],
  'double-circle': ['Double circle', 'circle ring double', (w, h, t) => `<ellipse cx="${f(w / 2)}" cy="${f(h / 2)}" rx="${f(w / 2 - t * 2)}" ry="${f(h / 2 - t * 2)}"/><ellipse cx="${f(w / 2)}" cy="${f(h / 2)}" rx="${f(w / 2 - t * 6)}" ry="${f(h / 2 - t * 6)}"/>`],
  arch: ['Arch', 'arch window frame', (w, h, t) => { const r = w / 2 - t * 2; return `<path d="M${f(t * 2)} ${f(h - t * 2)} L${f(t * 2)} ${f(r + t * 2)} A${f(r)} ${f(r)} 0 0 1 ${f(w - t * 2)} ${f(r + t * 2)} L${f(w - t * 2)} ${f(h - t * 2)} Z"/>`; }],
  hexagon: ['Hexagon', 'hexagon frame geometric', (w, h, t) => `<path d="${poly(w, h, t, 6, Math.PI / 6)}"/>`],
  diamond: ['Diamond', 'diamond rhombus frame', (w, h, t) => `<path d="${P([[w / 2, t * 2], [w - t * 2, h / 2], [w / 2, h - t * 2], [t * 2, h / 2]])}"/>`],
  triangle: ['Triangle', 'triangle geometric', (w, h, t) => `<path d="${P([[w / 2, t * 2], [w - t * 2, h - t * 2], [t * 2, h - t * 2]])}"/>`],
  square: ['Rounded square', 'square rounded frame', (w, h, t) => `<rect x="${f(t * 2)}" y="${f(t * 2)}" width="${f(w - t * 4)}" height="${f(h - t * 4)}" rx="${f(Math.min(w, h) * 0.15)}"/>`],
  star: ['Star', 'star', (w, h, t) => { const R = Math.min(w, h) / 2 - t * 2; return `<path d="${P(Array.from({ length: 10 }, (_, i): [number, number] => { const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? R * 0.45 : R; return [w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d]; }))}"/>`; }],
  sun: ['Sun', 'sun rays summer', (w, h, t) => { const R = Math.min(w, h) / 2 - t * 2, r0 = R * 0.45; return `<circle cx="${f(w / 2)}" cy="${f(h / 2)}" r="${f(r0)}"/>` + Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<path d="M${f(w / 2 + Math.cos(a) * r0 * 1.35)} ${f(h / 2 + Math.sin(a) * r0 * 1.35)} L${f(w / 2 + Math.cos(a) * R)} ${f(h / 2 + Math.sin(a) * R)}"/>`; }).join(''); }],
  moon: ['Crescent moon', 'moon night crescent', (w, h, t) => { const R = Math.min(w, h) / 2 - t * 2, cx = w / 2, cy = h / 2; return `<path d="M${f(cx + R * 0.35)} ${f(cy - R * 0.94)} A${f(R)} ${f(R)} 0 1 0 ${f(cx + R * 0.35)} ${f(cy + R * 0.94)} A${f(R * 0.78)} ${f(R * 0.78)} 0 1 1 ${f(cx + R * 0.35)} ${f(cy - R * 0.94)} Z"/>`; }],
  heart: ['Heart', 'heart love valentine', (w, h, t) => { const s = Math.min(w, h) / 100; return `<path transform="translate(${f(w / 2 - 50 * s)} ${f(h / 2 - 48 * s)}) scale(${f(s)})" vector-effect="non-scaling-stroke" d="M50 90 C14 66 4 48 4 31 A22 22 0 0 1 50 22 A22 22 0 0 1 96 31 C96 48 86 66 50 90 Z"/>`; }],
  sparkle: ['Sparkle', 'sparkle star twinkle', (w, h, t) => { const R = Math.min(w, h) / 2 - t * 2; return `<path transform="translate(${f(w / 2)} ${f(h / 2)})" d="M0 ${f(-R)} Q0 0 ${f(R)} 0 Q0 0 0 ${f(R)} Q0 0 ${f(-R)} 0 Q0 0 0 ${f(-R)} Z"/>`; }],
  'wavy-circle': ['Wavy circle', 'wavy circle badge scallop', (w, h, t) => { const R = Math.min(w, h) / 2 - t * 3; return `<path d="${Array.from({ length: 121 }, (_, i) => { const a = (i / 120) * Math.PI * 2, d = R * (0.93 + 0.07 * Math.sin(a * 14)); return `${i ? 'L' : 'M'}${f(w / 2 + Math.cos(a) * d)} ${f(h / 2 + Math.sin(a) * d)}`; }).join(' ')} Z"/>`; }],
  'dotted-ring': ['Dotted ring', 'dots dotted circle ring', (w, h, t) => `<ellipse cx="${f(w / 2)}" cy="${f(h / 2)}" rx="${f(w / 2 - t * 2)}" ry="${f(h / 2 - t * 2)}" stroke-dasharray="0 ${f(t * 3)}" stroke-width="${f(t * 1.6)}"/>`],
  cloud: ['Cloud', 'cloud weather sky', (w, h, t) => { const s = Math.min(w / 120, h / 80); return `<path vector-effect="non-scaling-stroke" transform="translate(${f(w / 2 - 60 * s)} ${f(h / 2 - 40 * s)}) scale(${f(s)})" d="M28 70 A18 18 0 0 1 26 34 A24 24 0 0 1 70 22 A20 20 0 0 1 100 40 A15 15 0 0 1 96 70 Z"/>`; }],
  blob: ['Blob', 'blob organic shape', (w, h, t) => { const R = Math.min(w, h) / 2 - t * 3; return `<path d="${Array.from({ length: 91 }, (_, i) => { const a = (i / 90) * Math.PI * 2, d = R * (0.86 + 0.09 * Math.sin(a * 3 + 1) + 0.05 * Math.cos(a * 5)); return `${i ? 'L' : 'M'}${f(w / 2 + Math.cos(a) * d)} ${f(h / 2 + Math.sin(a) * d)}`; }).join(' ')} Z"/>`; }],
};

/* ---------- zodiac ---------- */
const ZODIAC: [string, string, string][] = [
  ['aries', 'Aries', 'Mar 21 to Apr 19'], ['taurus', 'Taurus', 'Apr 20 to May 20'], ['gemini', 'Gemini', 'May 21 to Jun 20'],
  ['cancer', 'Cancer', 'Jun 21 to Jul 22'], ['leo', 'Leo', 'Jul 23 to Aug 22'], ['virgo', 'Virgo', 'Aug 23 to Sep 22'],
  ['libra', 'Libra', 'Sep 23 to Oct 22'], ['scorpio', 'Scorpio', 'Oct 23 to Nov 21'], ['sagittarius', 'Sagittarius', 'Nov 22 to Dec 21'],
  ['capricorn', 'Capricorn', 'Dec 22 to Jan 19'], ['aquarius', 'Aquarius', 'Jan 20 to Feb 18'], ['pisces', 'Pisces', 'Feb 19 to Mar 20'],
];
const zodiacDraw = (sign: string): Draw => (w, h, c) => {
  const R = Math.min(w, h) / 2, s = (R * 1.1) / 24, d = (zodiac.paths as Record<string, string>)[sign];
  return `<circle cx="${f(w / 2)}" cy="${f(h / 2)}" r="${f(R * 0.98)}" fill="${c[0]}"/><circle cx="${f(w / 2)}" cy="${f(h / 2)}" r="${f(R * 0.86)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="${f(R * 0.025)}" stroke-dasharray="${f(R * 0.04)} ${f(R * 0.05)}"/>` +
    `<path d="${d}" fill="#fff" transform="translate(${f(w / 2 - 12 * s)} ${f(h / 2 - 12 * s)}) scale(${f(s)})"/>`;
};

/* ---------- registry ---------- */
const R5 = (label: string, words: string, draw: Draw, size: [number, number] = [240, 140], random = false): PackDeco => ({ label, words, size, random, draw });

export const PACK_DECOS: Record<string, PackDeco> = {
  'rainbow-solid': R5('Boho rainbow', 'rainbow boho organic arch', rainbow('solid', 4)),
  'rainbow-5': R5('Five-band rainbow', 'rainbow boho organic arch', rainbow('solid', 5)),
  'rainbow-gap': R5('Airy rainbow', 'rainbow boho organic arch', rainbow('gap', 4)),
  'rainbow-outline': R5('Line rainbow', 'rainbow line outline boho', rainbow('outline', 5)),
  'rainbow-dots': R5('Rainbow with dots', 'rainbow dots boho', rainbow('dots', 3), [240, 150]),
  'rainbow-clouds': R5('Rainbow with clouds', 'rainbow clouds weather sky', rainbow('clouds', 4), [260, 170]),
  'rainbow-sun': R5('Rainbow sun', 'rainbow sun sunset boho', rainbow('sun', 3)),
  'leaf-simple': R5('Leaf', 'leaf leaves green nature', leafSimple, [140, 240]),
  monstera: R5('Monstera leaf', 'monstera leaf tropical leaves', monstera, [220, 240]),
  fern: R5('Fern', 'fern frond leaves nature', fern, [180, 260]),
  eucalyptus: R5('Eucalyptus', 'eucalyptus sprig leaves', eucalyptus, [150, 260]),
  'palm-fan': R5('Palm fan', 'palm fan tropical leaves summer', palmFan, [260, 200]),
  'heart-leaf': R5('Heart leaf', 'heart leaf philodendron leaves', heartLeaf, [200, 200]),
  branch: R5('Berry branch', 'branch berries leaves', branch, [170, 260]),
  'leaf-cluster': R5('Leaf bunch', 'leaves bunch bouquet', leafCluster, [220, 220]),
  daisy: R5('Daisy', 'daisy flower', daisy, [200, 200]),
  tulip: R5('Tulip', 'tulip flower spring', tulip, [130, 230]),
  poppy: R5('Poppy', 'poppy flower', poppy, [200, 200]),
  gumamela: R5('Gumamela', 'gumamela hibiscus flower tropical', gumamela, [210, 210]),
  wildflowers: R5('Wildflowers', 'wildflowers flowers bouquet meadow', wildflowers, [200, 240]),
  lavender: R5('Lavender', 'lavender flower stalks', lavender, [150, 250]),
  sunflower: R5('Sunflower', 'sunflower flower summer', sunflower, [220, 220]),
  rosette: R5('Rose swirl', 'rose swirl flower', rosette, [180, 180], true),
  ...Object.fromEntries(Object.entries(MONO).map(([k, [label, words, b]]) => [`mono-${k}`, R5(label, `${words} monoline line outline`, mono(b), k === 'arch' ? [180, 240] : [200, 200])])),
  ...Object.fromEntries(ZODIAC.map(([k, label, dates]) => [`zodiac-${k}`, R5(`${label} (${dates})`, `zodiac ${k} ${label} horoscope star sign ${dates}`, zodiacDraw(k), [180, 180])])),
};

export const PACK_KINDS = {
  rainbows: Object.keys(PACK_DECOS).filter((k) => k.startsWith('rainbow-')),
  leaves: ['leaf-simple', 'monstera', 'fern', 'eucalyptus', 'palm-fan', 'heart-leaf', 'branch', 'leaf-cluster'],
  flowers: ['daisy', 'tulip', 'poppy', 'gumamela', 'wildflowers', 'lavender', 'sunflower', 'rosette'],
  monoline: Object.keys(MONO).map((k) => `mono-${k}`),
  zodiac: ZODIAC.map(([k]) => `zodiac-${k}`),
};
