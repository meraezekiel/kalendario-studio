/**
 * More generated illustration packs: sketched fruits, love doodles, simple drawn objects, summer,
 * vivid contrast objects, badges, and two-tone leaves. Same contract as packs.ts.
 */
import badgeIcons from './badgeIcons.json';
import { f, shade, wobble } from './decoKit';
import { INK, leafPath, type PackDeco, riso } from './packs';

type Draw = PackDeco['draw'];
const D = (label: string, words: string, draw: Draw, size: [number, number] = [200, 200], random = false): PackDeco => ({ label, words, size, random, draw });
/** Draw in a 200×200 box centred in w×h, scaled to fit. */
const box = (w: number, h: number, body: string, bw = 200, bh = 200) => {
  const s = Math.min(w / bw, h / bh);
  return `<g transform="translate(${f((w - bw * s) / 2)} ${f((h - bh * s) / 2)}) scale(${f(s)})">${body}</g>`;
};
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)} a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`;
const glyph = (name: string, cx: number, cy: number, size: number, fill: string) =>
  `<path d="${(badgeIcons.paths as Record<string, string>)[name]}" fill="${fill}" transform="translate(${f(cx - size / 2)} ${f(cy - size / 2)}) scale(${f(size / 24)})"/>`;

/* ---------- organic sketched fruits (c: main, accent, leaf) ---------- */
const leaf = (x: number, y: number, rot: number, len: number, col: string) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})">${riso(leafPath(len, len * 0.32), col, 1.6)}</g>`;

const FRUITS: Record<string, [string, string, (c: string[]) => string]> = {
  watermelon: ['Watermelon slice', 'watermelon pakwan summer fruit', (c) =>
    riso('M20 80 A80 80 0 0 0 180 80 Z', c[2], 2) + `<path d="M30 80 A70 70 0 0 0 170 80 Z" fill="#fff6e6"/>` + `<path d="M38 80 A62 62 0 0 0 162 80 Z" fill="${c[0]}"/>` +
    [[70, 100], [100, 118], [130, 100], [85, 128], [115, 128], [100, 95]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="5.5" fill="${INK}"/>`).join('')],
  citrus: ['Citrus slice', 'orange lemon calamansi citrus slice fruit', (c) => {
    let s = riso(circle(100, 100, 82), c[1], 2) + `<circle cx="100" cy="100" r="72" fill="#fff6e6"/>`;
    for (let i = 0; i < 8; i++) {
      const a1 = (i * Math.PI) / 4 + 0.07, a2 = ((i + 1) * Math.PI) / 4 - 0.07, r = 64;
      s += `<path d="M${f(100 + Math.cos(a1) * 9)} ${f(100 + Math.sin(a1) * 9)} L${f(100 + Math.cos(a1) * r)} ${f(100 + Math.sin(a1) * r)} A${r} ${r} 0 0 1 ${f(100 + Math.cos(a2) * r)} ${f(100 + Math.sin(a2) * r)} Z" fill="${c[1]}" opacity=".85"/>`;
    }
    return s;
  }],
  strawberry: ['Strawberry', 'strawberry fruit berry', (c) =>
    riso('M100 182 C52 160 30 110 40 78 C50 52 80 54 100 62 C120 54 150 52 160 78 C170 110 148 160 100 182 Z', c[0], 2) +
    [[78, 90], [100, 84], [122, 90], [70, 116], [92, 112], [114, 112], [134, 116], [84, 140], [106, 138], [124, 140], [98, 160]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="4" fill="#fff4c2"/>`).join('') +
    leaf(100, 62, -60, 34, c[2]) + leaf(100, 62, 0, 30, c[2]) + leaf(100, 62, 60, 34, c[2])],
  pear: ['Pear', 'pear peras fruit', (c) =>
    riso('M100 40 C84 40 82 70 76 86 C56 104 46 130 56 156 C66 182 134 182 144 156 C154 130 144 104 124 86 C118 70 116 40 100 40 Z', c[1], 2) +
    `<path d="M100 42 Q98 26 106 16" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` + leaf(104, 26, 60, 34, c[2]) + `<ellipse cx="80" cy="130" rx="7" ry="16" fill="#fff" opacity=".45"/>`],
  cherries: ['Cherries', 'cherry cherries fruit', (c) =>
    `<path d="M70 140 Q80 80 120 30 M140 130 Q130 80 120 30" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` + leaf(120, 32, 70, 40, c[2]) +
    riso(circle(68, 148, 30), c[0], 2) + riso(circle(140, 140, 30), c[0], 2) + `<circle cx="58" cy="140" r="6" fill="#fff" opacity=".5"/><circle cx="130" cy="132" r="6" fill="#fff" opacity=".5"/>`],
  apple: ['Apple', 'apple mansanas fruit school', (c) =>
    riso('M100 62 C76 44 36 56 38 104 C40 150 72 182 100 168 C128 182 160 150 162 104 C164 56 124 44 100 62 Z', c[0], 2) +
    `<path d="M100 62 Q98 44 104 30" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` + leaf(104, 36, 70, 32, c[2]) + `<ellipse cx="68" cy="100" rx="8" ry="18" fill="#fff" opacity=".4"/>`],
  banana: ['Banana', 'banana saging fruit', (c) =>
    riso('M30 70 C40 150 130 180 176 120 C182 112 176 106 168 112 C128 150 70 130 48 66 C44 56 28 58 30 70 Z', c[1], 2) +
    `<path d="M40 74 C60 128 120 150 160 120" stroke="${shade(c[1], 0.8)}" stroke-width="3" fill="none"/><path d="M30 70 L26 58" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`],
  mango: ['Mango', 'mango mangga fruit philippines summer', (c) =>
    riso('M60 60 C100 20 170 50 166 110 C162 170 90 186 56 150 C30 122 34 86 60 60 Z', c[1], 2) +
    `<path d="M70 70 C100 40 150 60 150 110 C150 140 120 160 96 160" fill="${c[0]}" opacity=".35"/>` +
    `<path d="M70 58 Q66 44 72 36" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` + leaf(72, 40, -60, 40, c[2])],
  grapes: ['Grapes', 'grapes ubas fruit', (c) => {
    const pts = [[80, 70], [110, 70], [140, 70], [95, 98], [125, 98], [80, 126], [110, 126], [95, 154], [125, 154], [110, 180]];
    return `<path d="M110 70 Q112 40 122 26" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` + leaf(118, 34, 60, 40, c[2]) +
      pts.map(([x, y]) => riso(circle(x, y - 10, 17), c[0], 1.5)).join('');
  }],
  kiwi: ['Kiwi slice', 'kiwi fruit slice', (c) => {
    let s = riso(circle(100, 100, 80), '#8b6b43', 2) + `<circle cx="100" cy="100" r="70" fill="${c[2]}"/><circle cx="100" cy="100" r="24" fill="#f3f6d8"/>`;
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI * 2) / 18;
      s += `<ellipse cx="${f(100 + Math.cos(a) * 34)}" cy="${f(100 + Math.sin(a) * 34)}" rx="2.4" ry="5" fill="${INK}" transform="rotate(${f((a * 180) / Math.PI + 90)} ${f(100 + Math.cos(a) * 34)} ${f(100 + Math.sin(a) * 34)})"/>`;
    }
    return s;
  }],
  pineapple: ['Pineapple', 'pineapple pinya fruit tropical summer', (c) => {
    let s = '';
    for (let i = 0; i < 5; i++) s += leaf(100, 78, -50 + i * 25, 50 - Math.abs(i - 2) * 6, c[2]);
    const body = 'M100 76 C140 76 152 110 150 140 C148 176 128 192 100 192 C72 192 52 176 50 140 C48 110 60 76 100 76 Z';
    let hatch = '';
    for (let k = -3; k <= 3; k++) hatch += `M${70 + k * 18} 82 L${130 + k * 18} 188 M${130 + k * 18} 82 L${70 + k * 18} 188 `;
    // Diamond pattern, clipped to the fruit.
    return `<defs><clipPath id="pc"><path d="${body}"/></clipPath></defs>` + s + riso(body, c[1], 2) +
      `<path d="${hatch}" stroke="${shade(c[1], 0.7)}" stroke-width="2" clip-path="url(#pc)"/>`;
  }],
};

/* ---------- hand-drawn love ---------- */
const HEART = 'M100 170 C40 130 20 96 26 66 C32 36 72 26 100 56 C128 26 168 36 174 66 C180 96 160 130 100 170 Z';
const LOVE: Record<string, [string, string, (c: string[], r: () => number) => string]> = {
  'heart-doodle': ['Doodle heart', 'heart love doodle outline', (c, r) => {
    const pts: [number, number][] = Array.from({ length: 34 }, (_, i) => { const t = (i / 32) * Math.PI * 2; return [100 + 72 * Math.pow(Math.sin(t), 3), 96 - (58 * Math.cos(t) - 22 * Math.cos(2 * t) - 9 * Math.cos(3 * t) - 4 * Math.cos(4 * t))]; });
    return `<path d="${wobble(pts, r, 5)}" fill="none" stroke="${c[0]}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
  }],
  'heart-filled': ['Sketchy heart', 'heart love filled', (c) => riso(HEART, c[0], 2.2) + `<path d="M58 70 Q62 54 78 52" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`],
  'heart-scribble': ['Scribble heart', 'heart love scribble', (c) => {
    let lines = '';
    // Zig-zag from side to side, clipped to the heart.
    for (let i = 0, y = 30; y < 175; i++, y += 9) lines += `${i ? 'L' : 'M'}${i % 2 ? 180 : 20} ${y} `;
    return `<defs><clipPath id="hc"><path d="${HEART}"/></clipPath></defs><path d="${lines}" stroke="${c[0]}" stroke-width="6" fill="none" stroke-linejoin="round" clip-path="url(#hc)"/><path d="${HEART}" fill="none" stroke="${INK}" stroke-width="3" transform="translate(3 2)"/>`;
  }],
  'two-hearts': ['Two hearts', 'two hearts love couple', (c) =>
    `<g transform="translate(-14 10) scale(.72) rotate(-12 100 100)">${riso(HEART, c[0], 2.6)}</g><g transform="translate(70 40) scale(.6) rotate(14 100 100)">${riso(HEART, c[1] ?? c[0], 2.6)}</g>`],
  'heart-arrow': ['Heart with arrow', 'heart arrow cupid valentine love', (c) =>
    riso(HEART, c[0], 2.2) + `<path d="M18 160 L182 40" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M182 40 l-20 2 m20 -2 l-4 20" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M18 160 l8 -18 m-8 18 l18 -6 m-12 -2 l8 -18 m-8 18 l18 -6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`],
  'love-letter': ['Love letter', 'love letter envelope mail valentine', (c) =>
    riso('M24 60 H176 V156 H24 Z', '#fff6ee', 2.2) + `<path d="M24 60 L100 118 L176 60" fill="none" stroke="${INK}" stroke-width="3"/>` +
    `<g transform="translate(78 84) scale(.22)">${riso(HEART, c[0], 8)}</g>`],
  'heart-balloon': ['Heart balloon', 'heart balloon love party', (c) =>
    `<path d="M100 150 Q86 170 104 188 Q118 200 104 214" stroke="${INK}" stroke-width="3" fill="none" transform="translate(0 -20)"/><g transform="translate(10 -6) scale(.9)">${riso(HEART, c[0], 2.5)}</g><path d="M66 60 Q70 46 84 44" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`],
  'heart-burst': ['Heart burst', 'heart burst love sparkle', (c) =>
    `<g transform="translate(30 30) scale(.7)">${riso(HEART, c[0], 3)}</g>` +
    Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5; return `<path d="M${f(100 + Math.cos(a) * 82)} ${f(102 + Math.sin(a) * 82)} L${f(100 + Math.cos(a) * 96)} ${f(102 + Math.sin(a) * 96)}" stroke="${c[1] ?? c[0]}" stroke-width="6" stroke-linecap="round"/>`; }).join('')],
  'heart-garland': ['Heart garland', 'heart garland string love banner', (c) =>
    `<path d="M6 40 Q100 110 194 40" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
    [[30, 58], [65, 76], [100, 82], [135, 76], [170, 58]].map(([x, y], i) => `<g transform="translate(${x - 18} ${y - 6}) scale(.18)">${riso(HEART, c[i % c.length], 9)}</g>`).join('')],
  'heart-bubble': ['Love speech bubble', 'love speech bubble heart chat', (c) =>
    riso('M30 40 H170 Q182 40 182 52 V128 Q182 140 170 140 H84 L52 170 L58 140 H30 Q18 140 18 128 V52 Q18 40 30 40 Z', '#fff6ee', 2.2) + `<g transform="translate(64 42) scale(.36)">${riso(HEART, c[0], 6)}</g>`],
};

/* ---------- simple drawn objects (colour blob + ink line drawing) ---------- */
const line = (d: string, t = 3) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round"/>`;
const OBJECTS: Record<string, [string, string, (c: string[]) => string]> = {
  bottle: ['Bottle vase', 'vase bottle object', (c) => `<path d="M80 70 h46 v100 h-46 z" fill="${c[0]}" transform="translate(10 6)"/>` + line('M88 20 h24 v40 q30 14 30 50 v66 q0 10 -10 10 h-64 q-10 0 -10 -10 v-66 q0 -36 30 -50 z')],
  bowl: ['Bowl', 'bowl object kitchen', (c) => `<ellipse cx="108" cy="120" rx="70" ry="40" fill="${c[1] ?? c[0]}"/>` + line('M24 96 h152 q-6 70 -76 72 q-70 -2 -76 -72 z M70 168 h60')],
  jug: ['Jug', 'jug pitcher object', (c) => `<path d="M64 60 h70 l10 120 h-90 z" fill="${c[0]}"/>` + line('M70 34 h60 l-6 30 q22 28 22 70 v40 h-92 v-40 q0 -42 22 -70 z M146 84 q30 0 30 30 q0 30 -30 30')],
  mug: ['Mug', 'mug cup coffee tea object', (c) => `<rect x="54" y="74" width="84" height="96" rx="12" fill="${c[1] ?? c[0]}"/>` + line('M46 64 h96 v86 q0 22 -22 22 h-52 q-22 0 -22 -22 z M142 86 q34 0 34 28 q0 28 -34 28 M80 30 q-10 12 0 22 M104 26 q-10 12 0 22')],
  'round-vase': ['Round vase', 'vase round object flowers', (c) => `<circle cx="108" cy="124" r="58" fill="${c[0]}"/>` + line('M82 30 h36 v24 q50 20 46 74 q-4 54 -64 54 q-60 0 -64 -54 q-4 -54 46 -74 z') + line('M100 30 Q90 10 70 8 M108 30 Q120 6 146 10', 2.5)],
  plate: ['Plate', 'plate dish object', (c) => `<circle cx="100" cy="100" r="80" fill="${c[1] ?? c[0]}"/>` + line('M100 18 a82 82 0 1 0 0.1 0 M100 52 a48 48 0 1 0 0.1 0')],
  stone: ['Stones', 'stones rocks pebbles object', (c) => `<path d="M30 150 q0 -40 50 -44 q60 -4 64 40 q2 22 -50 24 q-64 2 -64 -20 z" fill="${c[0]}"/><path d="M110 100 q4 -40 40 -38 q34 2 30 34 q-4 22 -36 22 q-36 0 -34 -18 z" fill="${c[1] ?? c[0]}"/>` + line('M24 146 q2 -42 52 -46 q62 -2 66 42 q0 24 -52 26 q-66 0 -66 -22 z M104 96 q4 -42 42 -40 q36 2 32 36 q-4 24 -38 24 q-38 0 -36 -20 z')],
  sprig: ['Sprig', 'sprig branch twig leaves object', (c) => line('M100 190 Q96 110 110 20') + [0, 1, 2, 3, 4].map((i) => `<ellipse cx="${i % 2 ? 124 : 82}" cy="${160 - i * 30}" rx="18" ry="9" fill="${c[i % 2] ?? c[0]}" transform="rotate(${i % 2 ? -30 : 30} ${i % 2 ? 124 : 82} ${160 - i * 30})"/>`).join('')],
  'half-sun': ['Half sun', 'sun half abstract object', (c) => `<path d="M30 150 A70 70 0 0 1 170 150 Z" fill="${c[0]}"/>` + line('M20 150 H180 M44 150 A56 56 0 0 1 156 150')],
  'abstract-shapes': ['Abstract shapes', 'abstract shapes geometric object', (c) => `<circle cx="70" cy="80" r="44" fill="${c[0]}"/><rect x="96" y="96" width="80" height="80" rx="6" fill="${c[1] ?? c[0]}"/>` + line('M30 170 L80 60 L130 170 Z')],
};

/* ---------- organic summer ---------- */
const SUMMER: Record<string, [string, string, (c: string[]) => string]> = {
  starfish: ['Starfish', 'starfish sea beach summer', (c) => {
    const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? 34 : 88; return `${i ? 'L' : 'M'}${f(100 + Math.cos(a) * d)} ${f(104 + Math.sin(a) * d)}`; }).join(' ') + ' Z';
    return riso(pts, c[0], 2.2) + Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [30, 50, 70].map((d) => `<circle cx="${f(100 + Math.cos(a) * d)}" cy="${f(104 + Math.sin(a) * d)}" r="3.5" fill="#fff" opacity=".7"/>`).join(''); }).join('');
  }],
  shell: ['Seashell', 'shell seashell sea beach summer', (c) => {
    const body = 'M100 30 C150 30 186 80 176 130 C170 160 130 176 100 176 C70 176 30 160 24 130 C14 80 50 30 100 30 Z';
    const ridges = [-60, -36, -12, 12, 36, 60].map((a) => `M100 190 L${f(100 + Math.sin((a * Math.PI) / 180) * 120)} ${f(190 - Math.cos((a * Math.PI) / 180) * 150)}`).join(' ');
    return `<defs><clipPath id="sc"><path d="${body}"/></clipPath></defs>` + riso(body, c[1] ?? c[0], 2.2) +
      `<path d="${ridges}" stroke="${INK}" stroke-width="2.5" fill="none" clip-path="url(#sc)"/>` + riso('M78 176 H122 L112 192 H88 Z', c[0], 1.6);
  }],
  popsicle: ['Popsicle', 'popsicle ice candy ice cream summer', (c) =>
    `<rect x="90" y="140" width="20" height="50" rx="8" fill="#e2c08d"/>` + riso('M60 50 Q60 20 100 20 Q140 20 140 50 V140 H60 Z', c[0], 2.2) + `<path d="M60 90 Q80 104 100 90 Q120 76 140 90 V140 H60 Z" fill="${c[1] ?? c[0]}"/>`],
  'beach-ball': ['Beach ball', 'beach ball summer', (c) =>
    `<circle cx="100" cy="100" r="80" fill="#ffffff"/>` +
    [0, 1, 2].map((i) => `<path d="M100 100 L${f(100 + Math.cos((i * 2 * Math.PI) / 3) * 82)} ${f(100 + Math.sin((i * 2 * Math.PI) / 3) * 82)} A82 82 0 0 1 ${f(100 + Math.cos(((i * 2 + 1) * Math.PI) / 3) * 82)} ${f(100 + Math.sin(((i * 2 + 1) * Math.PI) / 3) * 82)} Z" fill="${c[i % c.length]}"/>`).join('') +
    `<circle cx="100" cy="100" r="80" fill="none" stroke="${INK}" stroke-width="3" transform="translate(3 2)"/><circle cx="100" cy="100" r="12" fill="#fff"/>`],
  palm: ['Palm tree', 'palm tree beach tropical summer island', (c) =>
    `<path d="M104 190 Q96 130 112 70" stroke="#8b5e34" stroke-width="12" fill="none" stroke-linecap="round"/>` +
    [-80, -40, 0, 40, 80, 130].map((a, i) => `<g transform="translate(112 70) rotate(${a})">${riso(leafPath(70, 14, 12), c[i % 2 ? 0 : 1] ?? c[0], 1.6)}</g>`).join('')],
  'wave-curl': ['Wave', 'wave sea ocean surf summer beach', (c) =>
    riso('M10 170 C30 90 90 40 150 60 C190 74 192 120 160 130 C140 136 126 120 136 104 C110 100 96 130 110 170 Z', c[0], 2.2) + line('M40 150 C60 110 100 84 140 90', 2.5)],
  'flip-flops': ['Flip-flops', 'flip flops tsinelas sandals beach summer', (c) =>
    [0, 1].map((i) => `<g transform="translate(${i * 70} ${i * 10}) rotate(${i ? 8 : -8} 70 110)">${riso('M70 30 C100 30 104 70 98 110 C94 150 92 190 70 190 C48 190 46 150 42 110 C36 70 40 30 70 30 Z', c[i % c.length], 2)}<path d="M70 66 L48 96 M70 66 L94 96" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g>`).join('')],
  'coconut-drink': ['Coconut drink', 'coconut buko drink summer tropical', (c) =>
    `<path d="M120 20 L100 90" stroke="${c[0]}" stroke-width="7" stroke-linecap="round"/>` + riso(circle(100, 124, 66), '#8b5e34', 2.2) + `<ellipse cx="100" cy="78" rx="56" ry="14" fill="#f6f1e0"/><g transform="translate(130 60)">${riso(circle(0, 0, 14), c[1] ?? c[0], 1.4)}</g>`],
  sunny: ['Sun', 'sun summer sunny tag-init', (c) =>
    riso(circle(100, 100, 46), c[0], 2.2) + Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<path d="M${f(100 + Math.cos(a) * 60)} ${f(100 + Math.sin(a) * 60)} Q${f(100 + Math.cos(a + 0.12) * 74)} ${f(100 + Math.sin(a + 0.12) * 74)} ${f(100 + Math.cos(a) * 88)} ${f(100 + Math.sin(a) * 88)}" stroke="${c[1] ?? c[0]}" stroke-width="7" fill="none" stroke-linecap="round"/>`; }).join('')],
};

/* ---------- vivid contrast objects ---------- */
const VIVID: Record<string, [string, string, (c: string[]) => string]> = {
  'evil-eye': ['Evil eye', 'evil eye nazar charm', (c) => `<circle cx="100" cy="100" r="86" fill="${c[3] ?? c[0]}"/><circle cx="100" cy="100" r="64" fill="#fff"/><circle cx="100" cy="100" r="44" fill="${c[4] ?? c[1]}"/><circle cx="100" cy="100" r="20" fill="${INK}"/><circle cx="92" cy="92" r="6" fill="#fff"/>`],
  'crystal-ball': ['Crystal ball', 'crystal ball magic fortune mystic', (c) => `<path d="M50 166 h100 l-12 24 h-76 z" fill="${INK}"/><circle cx="100" cy="100" r="70" fill="${c[3] ?? c[0]}"/><circle cx="100" cy="100" r="70" fill="#fff" opacity=".15"/><path d="M70 70 Q76 52 94 48" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>` +
    [[110, 110, 12], [80, 120, 7], [126, 82, 6]].map(([x, y, r]) => `<path transform="translate(${x} ${y})" d="M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z" fill="${c[1] ?? '#ffd166'}"/>`).join('')],
  'moon-face': ['Moon face', 'moon face crescent night mystic', (c) => `<circle cx="100" cy="100" r="86" fill="${c[3] ?? INK}"/><path d="M120 30 A72 72 0 1 0 120 170 A56 56 0 1 1 120 30 Z" fill="${c[1] ?? '#ffd166'}"/>` + line('M70 92 q8 8 16 0 M84 128 q-8 6 -16 0', 3)],
  mushroom: ['Mushroom', 'mushroom kabute', (c) => `<path d="M80 110 h40 l6 70 h-52 z" fill="#f6efe1" stroke="${INK}" stroke-width="3"/><path d="M20 112 Q24 30 100 28 Q176 30 180 112 Z" fill="${c[0]}" stroke="${INK}" stroke-width="3"/>` + [[60, 80, 12], [100, 56, 10], [140, 80, 12], [100, 96, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('')],
  potion: ['Potion bottle', 'potion bottle magic', (c) => `<rect x="86" y="18" width="28" height="22" rx="4" fill="#a0724a"/><path d="M84 40 h32 v28 q50 20 50 64 q0 56 -66 56 q-66 0 -66 -56 q0 -44 50 -64 z" fill="#ffffff" stroke="${INK}" stroke-width="3"/><path d="M38 128 q0 52 62 52 q62 0 62 -52 q-30 14 -62 0 q-32 -14 -62 0 z" fill="${c[2] ?? c[0]}"/>` + [[80, 150, 6], [116, 140, 4], [100, 162, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".7"/>`).join('')],
  cactus: ['Potted cactus', 'cactus plant pot', (c) => `<path d="M60 140 h80 l-8 50 h-64 z" fill="${c[0]}" stroke="${INK}" stroke-width="3"/><path d="M84 140 V60 q16 -28 32 0 V140 Z M84 110 h-18 q-10 0 -10 -10 v-24 q8 -12 16 0 v18 h12 M116 96 h18 q10 0 10 -10 v-24 q-8 -12 -16 0 v18 h-12" fill="${c[2] ?? '#2a9d5c'}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`],
  planet: ['Planet', 'planet saturn space ring', (c) => `<ellipse cx="100" cy="104" rx="92" ry="26" fill="none" stroke="${c[1] ?? c[0]}" stroke-width="10" transform="rotate(-18 100 104)"/><circle cx="100" cy="100" r="56" fill="${c[0]}"/><path d="M48 116 Q100 140 152 96" stroke="${shade(c[0], 0.75)}" stroke-width="10" fill="none"/><path d="M14 132 A92 26 -18 0 0 186 76" fill="none" stroke="${c[1] ?? c[0]}" stroke-width="10" transform="rotate(0)"/>`],
  candle: ['Candle', 'candle light flame', (c) => `<rect x="76" y="80" width="48" height="104" rx="6" fill="${c[0]}" stroke="${INK}" stroke-width="3"/><path d="M100 80 v-12" stroke="${INK}" stroke-width="3"/><path d="M100 20 C118 40 116 64 100 70 C84 64 82 40 100 20 Z" fill="${c[1] ?? '#ffd166'}" stroke="${INK}" stroke-width="3"/>`],
};

/* ---------- colourful badges ---------- */
const BADGE_SHAPES: Record<string, (c: string[]) => string> = {
  seal: (c) => `<path d="${Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * Math.PI * 2, d = i % 2 ? 80 : 92; return `${i ? 'L' : 'M'}${f(100 + Math.cos(a) * d)} ${f(100 + Math.sin(a) * d)}`; }).join(' ')} Z" fill="${c[0]}"/>`,
  circle: (c) => `<circle cx="100" cy="100" r="88" fill="${c[0]}"/><circle cx="100" cy="100" r="74" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="8 7"/>`,
  shield: (c) => `<path d="M100 12 L176 40 V100 C176 146 140 176 100 190 C60 176 24 146 24 100 V40 Z" fill="${c[0]}"/>`,
  rosette: (c) => `<path d="M64 130 L44 192 L72 178 L88 200 L100 140 Z M136 130 L156 192 L128 178 L112 200 L100 140 Z" fill="${shade(c[0], 0.75)}"/><circle cx="100" cy="88" r="76" fill="${c[1] ?? c[0]}"/><circle cx="100" cy="88" r="62" fill="${c[0]}"/>`,
  hexagon: (c) => `<path d="M100 10 L178 55 V145 L100 190 L22 145 V55 Z" fill="${c[0]}"/>`,
  burst: (c) => `<path d="${Array.from({ length: 33 }, (_, i) => { const a = (i / 32) * Math.PI * 2, d = i % 2 ? 72 : 94; return `${i ? 'L' : 'M'}${f(100 + Math.cos(a) * d)} ${f(100 + Math.sin(a) * d)}`; }).join(' ')} Z" fill="${c[0]}"/>`,
};
const BADGES: [string, string, string, string][] = [
  ['star-seal', 'Star seal badge', 'seal', 'star'], ['heart-circle', 'Heart badge', 'circle', 'heart'], ['check-shield', 'Check shield badge', 'shield', 'check-bold'],
  ['trophy-rosette', 'Trophy rosette', 'rosette', 'trophy'], ['home-hexagon', 'Work from home badge', 'hexagon', 'home'], ['briefcase-burst', 'Work badge', 'burst', 'briefcase'],
  ['handshake-circle', 'Team badge', 'circle', 'handshake'], ['rocket-seal', 'Launch badge', 'seal', 'rocket-launch'], ['idea-hexagon', 'Idea badge', 'hexagon', 'lightbulb-on'],
  ['coffee-burst', 'Coffee break badge', 'burst', 'coffee'], ['thumbs-shield', 'Thumbs up badge', 'shield', 'thumb-up'], ['crown-rosette', 'Crown rosette', 'rosette', 'crown'],
];

/* ---------- two-tone vivid leaves ---------- */
const VLEAVES: Record<string, [string, string, (c: string[]) => string]> = {
  'split-leaf': ['Two-tone leaf', 'leaf two tone split vivid', (c) => `<g transform="translate(100 190) rotate(10)"><path d="M0 0 C70 -40 60 -140 0 -180 Z" fill="${c[0]}"/><path d="M0 0 C-70 -40 -60 -140 0 -180 Z" fill="${c[1] ?? c[0]}"/><path d="M0 0 V-178" stroke="${INK}" stroke-width="3"/></g>`],
  'striped-leaf': ['Striped leaf', 'leaf calathea stripes vivid', (c) => {
    const stripes = [1, 2, 3, 4, 5, 6].map((i) => `M0 ${-i * 25} q30 -12 46 -30 M0 ${-i * 25} q-30 -12 -46 -30`).join(' ');
    return `<defs><clipPath id="lc"><path d="${leafPath(180, 56)}"/></clipPath></defs><g transform="translate(100 190) rotate(-8)"><path d="${leafPath(180, 56)}" fill="${c[0]}"/>` +
      `<path d="${stripes}" stroke="${c[1] ?? '#fff'}" stroke-width="6" fill="none" stroke-linecap="round" clip-path="url(#lc)"/><path d="M0 0 V-176" stroke="${c[1] ?? '#fff'}" stroke-width="4"/></g>`;
  }],
  'banana-leaf': ['Banana leaf', 'banana leaf saging tropical vivid', (c) => `<g transform="translate(70 196) rotate(20)"><path d="M0 0 C60 -40 70 -150 20 -200 C-10 -150 -20 -60 0 0 Z" fill="${c[0]}"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${f(4 + i * 2)} ${-20 - i * 20} q24 -6 44 -18" stroke="${shade(c[0], 0.7)}" stroke-width="3" fill="none"/>`).join('')}<path d="M0 0 C10 -80 16 -150 20 -200" stroke="${c[1] ?? INK}" stroke-width="4" fill="none"/></g>`],
  ginkgo: ['Ginkgo leaf', 'ginkgo fan leaf vivid', (c) => `<path d="M100 190 Q98 150 100 120" stroke="${INK}" stroke-width="4"/><path d="M100 120 L24 60 Q100 -10 176 60 Z" fill="${c[0]}"/><path d="M100 120 L100 40 M100 120 L60 50 M100 120 L140 50" stroke="${c[1] ?? '#fff'}" stroke-width="3" opacity=".8"/>`],
  'round-leaves': ['Round leaves', 'round leaves pilea coin plant vivid', (c) => [[100, 60, 0], [56, 110, 1], [144, 110, 2], [100, 150, 3]].map(([x, y, i]) => `<path d="M100 196 L${x} ${y}" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="34" fill="${c[i % c.length]}"/><circle cx="${x}" cy="${y}" r="4" fill="${INK}"/>`).join('')],
  'pointed-pair': ['Leaf pair', 'leaf pair tropical vivid', (c) => `<g transform="translate(100 196)"><g transform="rotate(-28)"><path d="${leafPath(170, 40)}" fill="${c[0]}"/><path d="M0 0 V-168" stroke="#fff" stroke-width="3" opacity=".8"/></g><g transform="rotate(26)"><path d="${leafPath(150, 36)}" fill="${c[1] ?? c[0]}"/><path d="M0 0 V-148" stroke="#fff" stroke-width="3" opacity=".8"/></g></g>`],
};

/* ---------- registry ---------- */
const asDecos = (prefix: string, set: Record<string, [string, string, (c: string[], r: () => number) => string]>, words: string, random = false) =>
  Object.fromEntries(Object.entries(set).map(([k, [label, w, draw]]) => [`${prefix}${k}`, D(label, `${w} ${words}`, (W, H, c, r) => box(W, H, draw(c, r)), [200, 200], random)]));

export const PACK2_DECOS: Record<string, PackDeco> = {
  ...asDecos('fruit-', FRUITS, 'fruit organic sketched'),
  ...asDecos('love-', LOVE, 'love hand drawn valentine'),
  ...asDecos('obj-', OBJECTS, 'simple drawn object line'),
  ...asDecos('summer-', SUMMER, 'organic summer'),
  ...asDecos('vivid-', VIVID, 'vivid contrast object'),
  ...asDecos('vleaf-', VLEAVES, 'vivid leaves leaf'),
  ...Object.fromEntries(BADGES.map(([k, label, shape, icon]) => [`badge-${k}`, D(label, `badge team colorful ${k.replace('-', ' ')}`, (W, H, c) => box(W, H, BADGE_SHAPES[shape](c) + glyph(icon, 100, shape === 'rosette' ? 88 : 100, 84, '#ffffff')), [180, 180])])),
};

// Only the doodle heart is hand-wobbled, so only it can be shuffled.
PACK2_DECOS['love-heart-doodle'].random = true;

export const PACK2_KINDS = {
  fruits: Object.keys(FRUITS).map((k) => `fruit-${k}`),
  love: Object.keys(LOVE).map((k) => `love-${k}`),
  objects: Object.keys(OBJECTS).map((k) => `obj-${k}`),
  summer: Object.keys(SUMMER).map((k) => `summer-${k}`),
  vivid: Object.keys(VIVID).map((k) => `vivid-${k}`),
  badges: BADGES.map(([k]) => `badge-${k}`),
  vleaves: Object.keys(VLEAVES).map((k) => `vleaf-${k}`),
};
