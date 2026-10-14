// Copies the graphics listed in src/lib/graphics/catalog.json from the Fluent Emoji Flat set
// (MIT, Microsoft) into public/graphics/fluent/*.svg. Run with: npm run graphics
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const set = require('@iconify-json/fluent-emoji-flat/icons.json');
const catalog = JSON.parse(readFileSync(join(root, 'src/lib/graphics/catalog.json'), 'utf8'));

const out = join(root, 'public/graphics/fluent');
mkdirSync(out, { recursive: true });

function resolve(name) {
  if (set.icons[name]) return set.icons[name];
  const alias = set.aliases?.[name];
  return alias ? { ...resolve(alias.parent), ...alias } : null;
}

const missing = [];
let n = 0;
for (const cat of catalog.categories) {
  for (const name of cat.items) {
    const icon = resolve(name);
    if (!icon) { missing.push(name); continue; }
    const w = icon.width ?? set.width ?? 16, h = icon.height ?? set.height ?? 16;
    writeFileSync(join(out, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.left ?? 0} ${icon.top ?? 0} ${w} ${h}" width="${w * 8}" height="${h * 8}">${icon.body}</svg>`);
    n++;
  }
}

const info = set.info ?? {};
writeFileSync(
  join(out, 'LICENSE.txt'),
  `${info.name ?? 'Fluent Emoji'} by ${info.author?.name ?? 'Microsoft Corporation'} (${info.author?.url ?? 'https://github.com/microsoft/fluentui-emoji'})\n` +
    `License: ${info.license?.title ?? 'MIT'} (${info.license?.url ?? 'https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE'})\n` +
    `Graphics converted from the Iconify package @iconify-json/fluent-emoji-flat.\n`,
);
console.log(`wrote ${n} graphics`);

// Illustrated packs from the full-colour Fluent Emoji set (MIT, Microsoft) into public/graphics/fluent3d.
const color = require('@iconify-json/fluent-emoji/icons.json');
const out3d = join(root, 'public/graphics/fluent3d');
mkdirSync(out3d, { recursive: true });
const resolveIn = (s, name) => s.icons[name] ?? (s.aliases?.[name] ? { ...resolveIn(s, s.aliases[name].parent), ...s.aliases[name] } : null);
let n3d = 0;
for (const pack of catalog.illustrated ?? []) {
  for (const name of pack.items) {
    const icon = resolveIn(color, name);
    if (!icon) { missing.push(`3d:${name}`); continue; }
    const w = icon.width ?? color.width ?? 32, h = icon.height ?? color.height ?? 32;
    writeFileSync(join(out3d, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.left ?? 0} ${icon.top ?? 0} ${w} ${h}" width="${w * 8}" height="${h * 8}">${icon.body}</svg>`);
    n3d++;
  }
}
writeFileSync(join(out3d, 'LICENSE.txt'), 'Fluent Emoji (color) by Microsoft Corporation (https://github.com/microsoft/fluentui-emoji)\nLicense: MIT. Converted from the Iconify package @iconify-json/fluent-emoji.\n');
console.log(`wrote ${n3d} illustrated graphics`);

// Zodiac glyphs (Material Design Icons, Apache-2.0) used by the generated Zodiac pack.
const mdi = require('@iconify-json/mdi/icons.json');
const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const paths = {};
for (const s of SIGNS) {
  const icon = mdi.icons[`zodiac-${s}`];
  if (!icon) { missing.push(`zodiac-${s}`); continue; }
  paths[s] = [...icon.body.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
}
writeFileSync(join(root, 'src/lib/graphics/zodiac.json'), JSON.stringify({ source: 'Material Design Icons (Apache-2.0), 24x24', paths }, null, 1) + '\n');
console.log(`wrote ${Object.keys(paths).length} zodiac glyphs`);

// Icons for the generated Badges pack (Material Design Icons, Apache-2.0).
const BADGE_ICONS = ['star', 'heart', 'check-bold', 'trophy', 'home', 'briefcase', 'handshake', 'rocket-launch', 'lightbulb-on', 'coffee', 'thumb-up', 'crown'];
const badge = {};
for (const s of BADGE_ICONS) {
  const icon = mdi.icons[s];
  if (!icon) { missing.push(`mdi:${s}`); continue; }
  badge[s] = [...icon.body.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
}
writeFileSync(join(root, 'src/lib/graphics/badgeIcons.json'), JSON.stringify({ source: 'Material Design Icons (Apache-2.0), 24x24', paths: badge }, null, 1) + '\n');
console.log(`wrote ${Object.keys(badge).length} badge icons`);
if (missing.length) console.log(`missing: ${missing.join(' ')}`);
