/**
 * Generated decorations (bunting, confetti, balloons, frames…). Each is drawn as SVG for the
 * element's actual size, so resizing re-lays it out instead of stretching it, and it can be
 * recoloured with a palette and re-scattered with a new seed.
 */

type BaseKind =
  | 'bunting-tri' | 'bunting-round' | 'bunting-swallow' | 'lights' | 'ribbon' | 'balloons' | 'streamers'
  | 'confetti' | 'confetti-burst' | 'confetti-fall' | 'sparkles' | 'dots'
  | 'frame-scallop' | 'frame-dots' | 'frame-double' | 'frame-corners' | 'vine' | 'divider' | 'sunburst'
  | 'doodle-underline' | 'doodle-circle' | 'doodle-arrow';
/** A decoration or illustration-pack kind (pack kinds come from packs.ts). */
export type DecoKind = BaseKind | (string & {});

export const PALETTES = {
  rainbow: { label: 'Rainbow', colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'] },
  pastel: { label: 'Pastel', colors: ['#f7a8b8', '#fcd5a5', '#fbe7a1', '#b5e6c3', '#a8d8f0', '#cdb4f5'] },
  gold: { label: 'Gold', colors: ['#d4a017', '#f2c94c', '#b8860b', '#f8e7a1', '#e0b33a'] },
  christmas: { label: 'Christmas', colors: ['#c8102e', '#1e7b3a', '#f5c542', '#2a9d5c', '#e63946'] },
  valentine: { label: 'Valentine', colors: ['#e63973', '#ff8fab', '#ffc2d1', '#c9184a', '#ff5d8f'] },
  ocean: { label: 'Ocean', colors: ['#0077b6', '#00b4d8', '#90e0ef', '#023e8a', '#48cae4'] },
  halloween: { label: 'Halloween', colors: ['#ff7518', '#2d2d2d', '#8e44ad', '#f4d03f'] },
  pinoy: { label: 'Pinoy', colors: ['#0038a8', '#ce1126', '#fcd116', '#ffffff'] },
  leaf: { label: 'Leaf', colors: ['#2d6a4f', '#40916c', '#52b788', '#74c69d'] },
  ink: { label: 'Ink', colors: ['#222222', '#555555', '#888888'] },
  boho: { label: 'Boho', colors: ['#c56e47', '#e3a37f', '#efcfb0', '#8b9a7a', '#d9b26f'] },
  sage: { label: 'Sage', colors: ['#7f9172', '#b5c2a6', '#dfe5d4', '#c9a77c'] },
  vivid: { label: 'Vivid', colors: ['#e8336d', '#f7a21b', '#1f9d8b', '#6a2c91', '#2b59c3'] },
  fruit: { label: 'Fruit', colors: ['#e8475b', '#f6a640', '#4f9a62', '#f9e0a8'] },
  summer: { label: 'Summer', colors: ['#ff7a59', '#2ec4b6', '#ffbf69', '#1d3557', '#ffe8d6'] },
  bold: { label: 'Bold', colors: ['#1d2b6b', '#c8102e', '#2b59c3', '#e06c75'] },
} as const;
export type PaletteId = keyof typeof PALETTES;
export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];

export interface DecoOpts {
  palette: PaletteId;
  seed: number;
  /** Density for scattered decorations (0.3 to 2.5). */
  amount: number;
}

interface DecoInfo {
  label: string;
  words: string;
  /** Default size when added. */
  size: [number, number];
  /** Uses the seed (Shuffle) and amount (density) options. */
  random: boolean;
  draw: (w: number, h: number, c: string[], rnd: () => number, amount: number) => string;
}

import { clamp, f, pick, rng, sagAt, sagPath, shade, wobble } from './decoKit';
import { PACK_DECOS } from './packs';
import { PACK2_DECOS } from './packs2';

/* ---------- drawers ---------- */
function bunting(shape: 'tri' | 'round' | 'swallow') {
  return (w: number, h: number, c: string[]) => {
    const y0 = h * 0.08, sag = h * 0.2, at = sagAt(w, y0, sag);
    const fh = h - (y0 + sag) - Math.max(2, h * 0.03);
    const n = Math.max(3, Math.round(w / (fh * 0.85)));
    const step = w / n, fw = step * 0.84;
    let flags = '';
    for (let i = 0; i < n; i++) {
      const cx = step * (i + 0.5), x1 = cx - fw / 2, x2 = cx + fw / 2, y1 = at(x1), y2 = at(x2), ym = at(cx);
      const col = c[i % c.length];
      const d =
        shape === 'tri' ? `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(cx)} ${f(ym + fh)} Z`
        : shape === 'round' ? `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x2)} ${f(y2 + fh * 0.45)} Q${f(cx)} ${f(ym + fh * 1.25)} ${f(x1)} ${f(y1 + fh * 0.45)} Z`
        : `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x2)} ${f(y2 + fh)} L${f(cx)} ${f(ym + fh * 0.7)} L${f(x1)} ${f(y1 + fh)} Z`;
      flags += `<path d="${d}" fill="${col}"/>`;
      // A soft fold line down the middle gives the flags a little depth.
      flags += `<path d="M${f(cx)} ${f(ym)} L${f(cx)} ${f(ym + fh * (shape === 'swallow' ? 0.7 : 0.85))}" stroke="${shade(col, 0.82)}" stroke-width="${f(Math.max(0.6, fw * 0.04))}" opacity=".5"/>`;
    }
    return `<path d="${sagPath(w, y0, sag)}" fill="none" stroke="#5b5048" stroke-width="${f(Math.max(1.2, h * 0.018))}"/>${flags}`;
  };
}

function lights(w: number, h: number, c: string[]) {
  const y0 = h * 0.1, sag = h * 0.22, at = sagAt(w, y0, sag);
  const bw = h * 0.1, bh = h * 0.26, n = Math.max(4, Math.round(w / (h * 0.42)));
  let s = `<path d="${sagPath(w, y0, sag)}" fill="none" stroke="#2f3b2f" stroke-width="${f(Math.max(1.2, h * 0.02))}"/>`;
  for (let i = 0; i < n; i++) {
    const x = (w / n) * (i + 0.5), y = at(x), col = c[i % c.length], rot = i % 2 ? 14 : -14;
    s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})">` +
      `<circle cx="0" cy="${f(bw * 0.5 + bh * 0.5)}" r="${f(bh * 0.85)}" fill="${col}" opacity=".22"/>` +
      `<rect x="${f(-bw / 2)}" y="0" width="${f(bw)}" height="${f(bw * 0.6)}" rx="${f(bw * 0.15)}" fill="#3b3b3b"/>` +
      `<ellipse cx="0" cy="${f(bw * 0.55 + bh / 2)}" rx="${f(bw * 0.62)}" ry="${f(bh / 2)}" fill="${col}"/>` +
      `<ellipse cx="${f(-bw * 0.2)}" cy="${f(bw * 0.55 + bh * 0.35)}" rx="${f(bw * 0.14)}" ry="${f(bh * 0.16)}" fill="#fff" opacity=".55"/></g>`;
  }
  return s;
}

function ribbon(w: number, h: number, c: string[]) {
  const col = c[0], dark = shade(col, 0.72), darker = shade(col, 0.55);
  const tail = (m: 1 | -1) => {
    const X = (x: number) => f(m === 1 ? x : w - x);
    return `<path d="M${X(0)} ${f(h * 0.36)} L${X(w * 0.2)} ${f(h * 0.36)} L${X(w * 0.2)} ${f(h * 0.98)} L${X(0)} ${f(h * 0.98)} L${X(w * 0.07)} ${f(h * 0.67)} Z" fill="${dark}"/>` +
      `<path d="M${X(w * 0.12)} ${f(h * 0.8)} L${X(w * 0.2)} ${f(h * 0.8)} L${X(w * 0.2)} ${f(h * 0.98)} Z" fill="${darker}"/>`;
  };
  return tail(1) + tail(-1) + `<rect x="${f(w * 0.12)}" y="${f(h * 0.06)}" width="${f(w * 0.76)}" height="${f(h * 0.74)}" fill="${col}"/>` +
    `<rect x="${f(w * 0.14)}" y="${f(h * 0.12)}" width="${f(w * 0.72)}" height="${f(h * 0.62)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${f(Math.max(1, h * 0.025))}" stroke-dasharray="${f(h * 0.06)} ${f(h * 0.05)}"/>`;
}

function balloons(w: number, h: number, c: string[], r: () => number, amount: number) {
  const n = clamp(Math.round(5 * amount), 2, 9);
  const rx = Math.min((w * 0.8) / (n * 0.95 + 0.6), h * 0.17), ry = rx * 1.22;
  const knotX = w / 2, knotY = h * 0.97;
  const items = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1), mid = Math.abs(t - 0.5) * 2;
    // Kept inside the box so no balloon is cut off at the edges.
    const cx = clamp(w * (0.5 + (t - 0.5) * 0.72) + (r() - 0.5) * rx * 0.3, rx + 1, w - rx - 1);
    const cy = clamp(ry + 2 + h * 0.18 * mid + (r() - 0.5) * ry * 0.3 + (i % 2) * ry * 0.35, ry + 1, h - ry * 2);
    return { cx, cy, col: c[i % c.length], z: -mid };
  });
  const strings = items.map((b) => `<path d="M${f(b.cx)} ${f(b.cy + ry)} Q${f(b.cx + (knotX - b.cx) * 0.2)} ${f((b.cy + ry + knotY) / 2)} ${f(knotX)} ${f(knotY)}" fill="none" stroke="#7a7a7a" stroke-width="${f(Math.max(0.8, rx * 0.04))}"/>`).join('');
  const bodies = [...items].sort((a, b) => a.z - b.z).map((b) =>
    `<path d="M${f(b.cx - rx * 0.12)} ${f(b.cy + ry + rx * 0.14)} L${f(b.cx + rx * 0.12)} ${f(b.cy + ry + rx * 0.14)} L${f(b.cx)} ${f(b.cy + ry - 1)} Z" fill="${shade(b.col, 0.8)}"/>` +
    `<ellipse cx="${f(b.cx)}" cy="${f(b.cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${b.col}"/>` +
    `<ellipse cx="${f(b.cx - rx * 0.38)}" cy="${f(b.cy - ry * 0.38)}" rx="${f(rx * 0.2)}" ry="${f(ry * 0.3)}" fill="#fff" opacity=".45" transform="rotate(-25 ${f(b.cx - rx * 0.38)} ${f(b.cy - ry * 0.38)})"/>`).join('');
  return strings + bodies;
}

function streamers(w: number, h: number, c: string[], r: () => number, amount: number) {
  const u = clamp(Math.min(w, h) / 30, 2, 12);
  const n = clamp(Math.round((w / (h * 0.3)) * amount), 2, 30);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x0 = (w / n) * (i + 0.5) + (r() - 0.5) * (w / n) * 0.6, len = h * (0.55 + r() * 0.42);
    const amp = Math.min(w / n, h) * (0.18 + r() * 0.18), freq = (Math.PI * 2 * (2 + r() * 2)) / len, ph = r() * Math.PI * 2;
    const pts: [number, number][] = [];
    for (let k = 0; k <= 40; k++) {
      const y = 2 + (len * k) / 40;
      pts.push([x0 + Math.sin(y * freq + ph) * amp * (0.4 + (0.6 * k) / 40), y]);
    }
    s += `<path d="${pts.map(([x, y], k) => `${k ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ')}" fill="none" stroke="${c[i % c.length]}" stroke-width="${f(u)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return s;
}

function confetti(mode: 'scatter' | 'burst' | 'fall') {
  return (w: number, h: number, c: string[], r: () => number, amount: number) => {
    const u = clamp(Math.min(w, h) / 24, 3, 16);
    const n = Math.round(clamp((w * h) / (u * u * 6), 16, 600) * amount);
    let s = '';
    for (let i = 0; i < n; i++) {
      let x: number, y: number;
      if (mode === 'burst') {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.48;
        x = w / 2 + Math.cos(a) * d * w;
        y = h / 2 + Math.sin(a) * d * h;
      } else {
        x = r() * w;
        y = mode === 'fall' ? h * Math.pow(r(), 1.9) : r() * h;
      }
      const sz = u * (0.55 + r() * 0.85), rot = Math.round(r() * 360), col = pick(r, c), t = r();
      x = clamp(x, sz, w - sz);
      y = clamp(y, sz, h - sz);
      const tf = `translate(${f(x)} ${f(y)}) rotate(${rot})`;
      if (t < 0.45) s += `<rect x="${f(-sz / 2)}" y="${f(-sz * 0.22)}" width="${f(sz)}" height="${f(sz * 0.45)}" rx="${f(sz * 0.08)}" fill="${col}" transform="${tf}"/>`;
      else if (t < 0.7) s += `<circle r="${f(sz * 0.28)}" fill="${col}" transform="${tf}"/>`;
      else if (t < 0.88) s += `<path d="M${f(-sz / 2)} 0 q${f(sz / 4)} ${f(-sz / 2)} ${f(sz / 2)} 0 t${f(sz / 2)} 0" fill="none" stroke="${col}" stroke-width="${f(sz * 0.18)}" stroke-linecap="round" transform="${tf}"/>`;
      else s += `<path d="M0 ${f(-sz * 0.4)} L${f(sz * 0.4)} ${f(sz * 0.3)} L${f(-sz * 0.4)} ${f(sz * 0.3)} Z" fill="${col}" transform="${tf}"/>`;
    }
    return s;
  };
}

function sparkles(w: number, h: number, c: string[], r: () => number, amount: number) {
  const base = Math.min(w, h);
  const n = Math.round(clamp((w * h) / (base * base) * 7, 5, 60) * amount);
  let s = '';
  for (let i = 0; i < n; i++) {
    const big = i < Math.max(1, n / 6);
    const sz = base * (big ? 0.11 + r() * 0.07 : 0.03 + r() * 0.05);
    const x = clamp(r() * w, sz, w - sz), y = clamp(r() * h, sz, h - sz), col = pick(r, c);
    s += i % 4 === 3
      ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(sz * 0.25)}" fill="${col}"/>`
      : `<path d="M0 ${f(-sz)} Q0 0 ${f(sz)} 0 Q0 0 0 ${f(sz)} Q0 0 ${f(-sz)} 0 Q0 0 0 ${f(-sz)} Z" fill="${col}" transform="translate(${f(x)} ${f(y)})"/>`;
  }
  return s;
}

function dots(w: number, h: number, c: string[], _r: () => number, amount: number) {
  const g = clamp(Math.min(w, h) / 6, 10, 60) / Math.sqrt(amount), rad = g * 0.22;
  let s = '', row = 0;
  for (let y = g / 2; y < h; y += g * 0.87, row++)
    for (let x = row % 2 ? g : g / 2, k = 0; x < w; x += g, k++) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${c[(k + row) % c.length]}"/>`;
  return s;
}

const sw = (w: number, h: number) => clamp(Math.min(w, h) / 40, 1.5, 10);

function frameScallop(w: number, h: number, c: string[]) {
  const t = sw(w, h), rad = t * 2.2, gap = rad * 1.7;
  let s = '';
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(len / gap));
    for (let i = 0; i <= n; i++) s += `<circle cx="${f(x1 + ((x2 - x1) * i) / n)}" cy="${f(y1 + ((y2 - y1) * i) / n)}" r="${f(rad)}" fill="${c[0]}"/>`;
  };
  const m = rad + 1;
  edge(m, m, w - m, m); edge(w - m, m, w - m, h - m); edge(w - m, h - m, m, h - m); edge(m, h - m, m, m);
  const inset = m + rad * 1.8;
  return s + `<rect x="${f(m)}" y="${f(m)}" width="${f(w - 2 * m)}" height="${f(h - 2 * m)}" fill="none" stroke="${c[0]}" stroke-width="${f(rad * 1.2)}"/>` +
    `<rect x="${f(inset)}" y="${f(inset)}" width="${f(w - 2 * inset)}" height="${f(h - 2 * inset)}" fill="none" stroke="${c[1] ?? c[0]}" stroke-width="${f(t * 0.5)}" stroke-dasharray="${f(t * 2)} ${f(t * 1.5)}"/>`;
}

function frameDots(w: number, h: number, c: string[]) {
  const t = sw(w, h) * 1.4, m = t;
  return `<rect x="${f(m)}" y="${f(m)}" width="${f(w - 2 * m)}" height="${f(h - 2 * m)}" rx="${f(t * 3)}" fill="none" stroke="${c[0]}" stroke-width="${f(t)}" stroke-linecap="round" stroke-dasharray="0 ${f(t * 2.3)}"/>` +
    `<rect x="${f(m + t * 2.2)}" y="${f(m + t * 2.2)}" width="${f(w - 2 * (m + t * 2.2))}" height="${f(h - 2 * (m + t * 2.2))}" rx="${f(t * 2)}" fill="none" stroke="${c[1] ?? c[0]}" stroke-width="${f(t * 0.3)}"/>`;
}

function frameDouble(w: number, h: number, c: string[]) {
  const t = sw(w, h), a = t * 0.6, b = a + t * 2.6;
  return `<rect x="${f(a)}" y="${f(a)}" width="${f(w - 2 * a)}" height="${f(h - 2 * a)}" fill="none" stroke="${c[0]}" stroke-width="${f(t * 1.1)}"/>` +
    `<rect x="${f(b)}" y="${f(b)}" width="${f(w - 2 * b)}" height="${f(h - 2 * b)}" fill="none" stroke="${c[0]}" stroke-width="${f(t * 0.35)}"/>`;
}

function frameCorners(w: number, h: number, c: string[]) {
  const t = sw(w, h), L = Math.min(w, h) * 0.22, m = t;
  const corner = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M${f(x)} ${f(y + dy * L)} L${f(x)} ${f(y)} L${f(x + dx * L)} ${f(y)}" fill="none" stroke="${c[0]}" stroke-width="${f(t)}" stroke-linecap="round"/>` +
    `<path d="M${f(x + dx * t * 2.6)} ${f(y + dy * L * 0.55)} L${f(x + dx * t * 2.6)} ${f(y + dy * t * 2.6)} L${f(x + dx * L * 0.55)} ${f(y + dy * t * 2.6)}" fill="none" stroke="${c[1] ?? c[0]}" stroke-width="${f(t * 0.4)}" stroke-linecap="round"/>` +
    `<rect x="${f(x + dx * L * 0.62 - t)}" y="${f(y - t)}" width="${f(t * 2)}" height="${f(t * 2)}" fill="${c[1] ?? c[0]}" transform="rotate(45 ${f(x + dx * L * 0.62)} ${f(y)})"/>`;
  return corner(m, m, 1, 1) + corner(w - m, m, -1, 1) + corner(w - m, h - m, -1, -1) + corner(m, h - m, 1, -1);
}

function vine(w: number, h: number, c: string[], r: () => number, amount: number) {
  const amp = h * 0.18, k = (Math.PI * 2 * Math.max(1, Math.round(w / (h * 2.2)))) / w;
  const yAt = (x: number) => h / 2 + Math.sin(x * k) * amp;
  const stem = Array.from({ length: 61 }, (_, i) => (w * i) / 60).map((x, i) => `${i ? 'L' : 'M'}${f(x)} ${f(yAt(x))}`).join(' ');
  const L = h * 0.32, n = Math.max(4, Math.round((w / (L * 0.75)) * amount));
  let s = `<path d="${stem}" fill="none" stroke="${shade(c[0], 0.85)}" stroke-width="${f(Math.max(1.2, h * 0.035))}" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const x = (w / n) * (i + 0.5), y = yAt(x), slope = (Math.atan(Math.cos(x * k) * amp * k) * 180) / Math.PI;
    const ang = slope + (i % 2 ? 55 : -55) + (r() - 0.5) * 16, len = L * (0.75 + r() * 0.35);
    s += `<path d="M0 0 Q${f(len / 2)} ${f(-len * 0.32)} ${f(len)} 0 Q${f(len / 2)} ${f(len * 0.32)} 0 0 Z" fill="${c[i % c.length]}" transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})"/>`;
  }
  return s;
}

function divider(w: number, h: number, c: string[]) {
  const y = h / 2, t = clamp(h * 0.06, 1, 4), mid = w / 2, hs = Math.min(h * 0.4, w * 0.05);
  const heart = `<path d="M${f(mid)} ${f(y + hs * 0.9)} C${f(mid - hs * 1.6)} ${f(y - hs * 0.1)} ${f(mid - hs * 0.6)} ${f(y - hs * 1.1)} ${f(mid)} ${f(y - hs * 0.35)} C${f(mid + hs * 0.6)} ${f(y - hs * 1.1)} ${f(mid + hs * 1.6)} ${f(y - hs * 0.1)} ${f(mid)} ${f(y + hs * 0.9)} Z" fill="${c[1] ?? c[0]}"/>`;
  const line = (x1: number, x2: number) => `<path d="M${f(x1)} ${f(y)} L${f(x2)} ${f(y)}" stroke="${c[0]}" stroke-width="${f(t)}" stroke-linecap="round"/>`;
  const dot = (x: number) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(t * 1.6)}" fill="${c[0]}"/>`;
  return line(t * 6, mid - hs * 2) + line(mid + hs * 2, w - t * 6) + dot(t * 2.5) + dot(w - t * 2.5) + heart;
}

function sunburst(w: number, h: number, c: string[]) {
  const cx = w / 2, cy = h / 2, R = Math.hypot(w, h), n = 28;
  let s = `<rect width="${f(w)}" height="${f(h)}" fill="${c[1] ?? c[0]}"/>`;
  for (let i = 0; i < n; i += 2) {
    const a1 = (i / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2;
    s += `<path d="M${f(cx)} ${f(cy)} L${f(cx + Math.cos(a1) * R)} ${f(cy + Math.sin(a1) * R)} L${f(cx + Math.cos(a2) * R)} ${f(cy + Math.sin(a2) * R)} Z" fill="${c[0]}"/>`;
  }
  return s;
}

function doodleUnderline(w: number, h: number, c: string[], r: () => number) {
  // A marker swipe left to right, then a shorter return stroke just underneath.
  const t = clamp(h * 0.16, 2, 14);
  const go: [number, number][] = Array.from({ length: 7 }, (_, i) => [t + ((w - 2 * t) * i) / 6, h * 0.42 + Math.sin(i * 0.8) * h * 0.06]);
  const back: [number, number][] = Array.from({ length: 5 }, (_, i) => [w - t * 2 - ((w * 0.7) * i) / 4, h * 0.66 + Math.sin(i) * h * 0.05]);
  return `<path d="${wobble([...go, ...back], r, t * 0.35)}" fill="none" stroke="${c[0]}" stroke-width="${f(t)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function doodleCircle(w: number, h: number, c: string[], r: () => number) {
  const t = clamp(Math.min(w, h) / 30, 2, 10), rx = w / 2 - t * 2, ry = h / 2 - t * 2;
  const pts: [number, number][] = Array.from({ length: 46 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2 - 2.2, k = 1 + (i / 46) * 0.06;
    return [w / 2 + Math.cos(a) * rx * k, h / 2 + Math.sin(a) * ry * (2 - k)];
  });
  return `<path d="${wobble(pts, r, t * 0.8)}" fill="none" stroke="${c[0]}" stroke-width="${f(t)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function doodleArrow(w: number, h: number, c: string[], r: () => number) {
  const t = clamp(Math.min(w, h) / 14, 2, 10);
  const pts: [number, number][] = Array.from({ length: 16 }, (_, i) => {
    const x = t * 2 + ((w - t * 6) * i) / 15;
    return [x, h * 0.62 - Math.sin((i / 15) * Math.PI) * h * 0.32];
  });
  const [ex, ey] = pts[pts.length - 1], hl = Math.min(w, h) * 0.32;
  const head = `M${f(ex - hl)} ${f(ey - hl * 0.55)} L${f(ex)} ${f(ey)} L${f(ex - hl * 0.75)} ${f(ey + hl * 0.55)}`;
  return `<path d="${wobble(pts, r, t * 0.5)}" fill="none" stroke="${c[0]}" stroke-width="${f(t)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${head}" fill="none" stroke="${c[0]}" stroke-width="${f(t)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const BASE: Record<BaseKind, DecoInfo> = {
  'bunting-tri': { label: 'Triangle bunting', words: 'bunting banderitas triangle banner flags pennant fiesta garland', size: [560, 120], random: false, draw: bunting('tri') },
  'bunting-round': { label: 'Rounded bunting', words: 'bunting banderitas banner flags scallop garland', size: [560, 110], random: false, draw: bunting('round') },
  'bunting-swallow': { label: 'Swallowtail bunting', words: 'bunting banderitas banner flags pennant fiesta garland', size: [560, 120], random: false, draw: bunting('swallow') },
  lights: { label: 'String lights', words: 'lights fairy christmas pasko bulbs party', size: [560, 130], random: false, draw: lights },
  ribbon: { label: 'Ribbon banner', words: 'ribbon banner label title scroll', size: [420, 110], random: false, draw: ribbon },
  balloons: { label: 'Balloons', words: 'balloons party birthday kaarawan celebration', size: [260, 320], random: true, draw: balloons },
  streamers: { label: 'Streamers', words: 'streamers serpentine party ribbons curly', size: [480, 220], random: true, draw: streamers },
  confetti: { label: 'Confetti', words: 'confetti party celebration new year scatter', size: [480, 300], random: true, draw: confetti('scatter') },
  'confetti-burst': { label: 'Confetti burst', words: 'confetti burst explosion party celebration', size: [340, 340], random: true, draw: confetti('burst') },
  'confetti-fall': { label: 'Falling confetti', words: 'confetti falling rain party celebration top', size: [560, 260], random: true, draw: confetti('fall') },
  sparkles: { label: 'Sparkles', words: 'sparkles stars twinkle shine glitter', size: [360, 240], random: true, draw: sparkles },
  dots: { label: 'Polka dots', words: 'polka dots pattern background', size: [360, 240], random: false, draw: dots },
  'frame-scallop': { label: 'Scalloped frame', words: 'frame border scallop lace', size: [420, 300], random: false, draw: frameScallop },
  'frame-dots': { label: 'Dotted frame', words: 'frame border dots dotted', size: [420, 300], random: false, draw: frameDots },
  'frame-double': { label: 'Double frame', words: 'frame border double line classic', size: [420, 300], random: false, draw: frameDouble },
  'frame-corners': { label: 'Corner frame', words: 'frame border corners brackets', size: [420, 300], random: false, draw: frameCorners },
  vine: { label: 'Leafy vine', words: 'vine leaves garland greenery border nature', size: [520, 110], random: true, draw: vine },
  divider: { label: 'Heart divider', words: 'divider line separator heart', size: [420, 40], random: false, draw: divider },
  sunburst: { label: 'Sunburst', words: 'sunburst rays retro background sun', size: [360, 360], random: false, draw: sunburst },
  'doodle-underline': { label: 'Scribble underline', words: 'doodle underline scribble hand drawn marker', size: [320, 50], random: true, draw: doodleUnderline },
  'doodle-circle': { label: 'Scribble circle', words: 'doodle circle scribble hand drawn highlight', size: [220, 140], random: true, draw: doodleCircle },
  'doodle-arrow': { label: 'Doodle arrow', words: 'doodle arrow hand drawn pointer', size: [220, 110], random: true, draw: doodleArrow },
};

export const DECOS: Record<DecoKind, DecoInfo> = { ...BASE, ...PACK_DECOS, ...PACK2_DECOS };

/** SVG markup for a decoration drawn at w×h design pixels. `zoom` > 1 shows only the centre (for small previews). */
export function decoSvg(kind: DecoKind, w: number, h: number, o: DecoOpts, zoom = 1): string {
  const d = DECOS[kind];
  const W = Math.max(8, w), H = Math.max(8, h);
  const body = d.draw(W, H, [...PALETTES[o.palette].colors], rng(o.seed), clamp(o.amount, 0.3, 2.5));
  const vw = W / zoom, vh = H / zoom;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}" height="${f(H)}" viewBox="${f((W - vw) / 2)} ${f((H - vh) / 2)} ${f(vw)} ${f(vh)}">${body}</svg>`;
}

export const decoDataUrl = (kind: DecoKind, w: number, h: number, o: DecoOpts, zoom = 1) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(decoSvg(kind, w, h, o, zoom))}`;

/** Library thumbnail: scattered kinds are zoomed in so their pieces are visible at tile size. */
export function decoThumb(kind: DecoKind, palette: PaletteId) {
  const [w, h] = DECOS[kind].size;
  const zoom = kind.startsWith('confetti') ? 1.7 : kind === 'dots' ? 2 : 1;
  return decoDataUrl(kind, w, h, { palette, seed: 7, amount: 1 }, zoom);
}
