// Writes the social media and contact icons listed in src/lib/graphics/social.json to
// public/graphics/social/<id>-<variant>.svg. Brand logos come from Simple Icons (CC0),
// the generic contact icons from Material Design Icons (Apache 2.0). Run with: npm run social
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const si = require('simple-icons');
const mdi = require('@iconify-json/mdi/icons.json');
const list = JSON.parse(readFileSync(join(root, 'src/lib/graphics/social.json'), 'utf8'));

const out = join(root, 'public/graphics/social');
mkdirSync(out, { recursive: true });

// Instagram's logo is a gradient, not one colour.
const INSTA = '<linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".3" stop-color="#fa7e1e"/><stop offset=".6" stop-color="#d62976"/><stop offset=".85" stop-color="#962fbf"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient>';

/** The icon's 24×24 artwork filled with `fill`. */
function art(icon, fill) {
  if (icon.si) return `<path fill="${fill}" d="${si[icon.si].path}"/>`;
  const body = mdi.icons[icon.mdi]?.body;
  if (!body) throw new Error(`No MDI icon ${icon.mdi}`);
  return body.replace(/currentColor/g, fill);
}

const missing = [];
let n = 0;
for (const icon of list.icons) {
  if (icon.si && !si[icon.si]) { missing.push(icon.id); continue; }
  const color = icon.color ?? `#${si[icon.si].hex}`;
  const insta = icon.id === 'instagram';
  const brand = insta ? 'url(#g)' : color;
  const defs = insta ? `<defs>${INSTA}</defs>` : '';
  const files = {
    badge: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="192" height="192">${defs}<circle cx="24" cy="24" r="24" fill="${brand}"/><g transform="translate(12.5 12.5) scale(.96)">${art(icon, '#ffffff')}</g></svg>`,
    color: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="192" height="192">${defs}${art(icon, brand)}</svg>`,
    black: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="192" height="192">${art(icon, '#111111')}</svg>`,
  };
  for (const [v] of list.variants) {
    writeFileSync(join(out, `${icon.id}-${v}.svg`), files[v]);
    n++;
  }
}

writeFileSync(
  join(out, 'LICENSE.txt'),
  'Brand logos: Simple Icons (https://simpleicons.org), CC0 1.0. Logos are trademarks of their owners;\n' +
    'use them only to point to your own pages on those services.\n' +
    'Phone, mobile, email, website, location and store icons: Material Design Icons (https://pictogrammers.com), Apache 2.0.\n',
);
if (missing.length) console.warn('Missing:', missing.join(', '));
console.log(`Wrote ${n} icons to public/graphics/social`);
