// Renders a fixed set of Open Peeps characters (hand-drawn people by Pablo Stanley, CC0;
// package @opeepsfun/open-peeps, MIT) into public/graphics/peeps/*.svg. Run with: npm run graphics
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/graphics/peeps');

// The package ships ES-module syntax in a CommonJS package and loads parts with require();
// copy it under node_modules/.cache marked as ESM and give it a require() rooted there.
const src = join(root, 'node_modules/@opeepsfun/open-peeps/build');
const esm = join(root, 'node_modules/.cache/open-peeps-esm');
rmSync(esm, { recursive: true, force: true });
cpSync(src, esm, { recursive: true });
writeFileSync(join(esm, 'package.json'), '{"type":"module"}');
globalThis.require = createRequire(join(esm, 'Effigy.js'));
const { Effigy } = await import(pathToFileURL(join(esm, 'Effigy.js')).href);

const SKIN = ['#F2C7A5', '#E0AC69', '#C68642', '#8D5524', '#D08B5B', '#FFDBB4'];
const TOPS = ['#F4A7B9', '#8FCDEA', '#F7D46B', '#93D9B8', '#B9A2DF', '#FF9F8F', '#5B8DEF', '#F28C38'];

// [file name, label, body, head, face, extra]
const PEOPLE = [
  ['smiling-curly', 'Smiling, curly hair', 'Dress', 'LongCurly', 'BigSmile'],
  ['teacher-glasses', 'Teacher with glasses', 'ButtonShirt', 'MediumStraight', 'Smile', { accessory: 'Glasses' }],
  ['coffee-bun', 'Coffee lover', 'Coffee', 'Bun', 'Calm'],
  ['explaining-short', 'Explaining', 'Explaining', 'ShortTwo', 'Explaining'],
  ['hoodie-beanie', 'Hoodie and beanie', 'Hoodie', 'Beanie', 'Cheeky'],
  ['laptop-bangs', 'Working on a laptop', 'Computer', 'MediumBangs', 'Driven'],
  ['afro-laugh', 'Laughing', 'SportyTee', 'Afro', 'SmileLOL'],
  ['hijab-smile', 'Smiling, hijab', 'Turtleneck', 'Hijab', 'Cute'],
  ['beard-blazer', 'Blazer and beard', 'BlazerBlackTee', 'ShortOne', 'Smile', { beard: 'Full' }],
  ['grandma', 'Grandma', 'SweaterDots', 'GrayShort', 'Old', { accessory: 'GlassesTwo' }],
  ['pointing-up', 'Pointing up', 'PointingUp', 'Pomp', 'BigSmile'],
  ['arms-crossed', 'Arms crossed', 'TeeArmsCrossed', 'Mohawk', 'Serious'],
  ['love-eyes', 'In love', 'StripedTee', 'LongHair', 'LoveGrinTeeth'],
  ['reading', 'Reading', 'Paper', 'MediumOne', 'Calm', { accessory: 'GlassesThree' }],
  ['gamer', 'Gamer', 'Gaming', 'ShortThree', 'EatingHappy'],
  ['polo-wavy', 'Wavy hair', 'PoloSweater', 'Wavy', 'SmileTeeth'],
  ['bantu-knots', 'Bantu knots', 'Tee', 'BantuKnots', 'Awe'],
  ['twists-jacket', 'Jacket and twists', 'Jacket', 'Twists', 'Smile'],
  ['cool-sunglasses', 'Cool in sunglasses', 'ThunderTee', 'FlatTop', 'Smile', { accessory: 'Sunglasses' }],
  ['dreads', 'Curly hair, blazer', 'ShirtCoat', 'DreadsOne', 'Calm'],
  ['bangs-dress', 'Bangs and dress', 'Dress', 'LongBangs', 'Cute'],
  ['turban-smile', 'Smiling, turban', 'ButtonPocketShirt', 'Turban', 'BigSmile', { beard: 'MustacheThin' }],
  ['sleepy', 'Grumpy', 'GymShirt', 'ShortFive', 'EyesClosed'],
  ['surprised', 'Surprised, silver hair', 'PolkadotJacket', 'Bangs', 'Awe'],
];

// More packs, each with its own colour treatment: [file, label, body, head, face, extra].
const DUO = [
  ['duo-1', 'Duo avatar, curly', 'Tee', 'LongCurly', 'Smile'], ['duo-2', 'Duo avatar, bun', 'Tee', 'Bun', 'Calm'],
  ['duo-3', 'Duo avatar, short hair', 'ButtonShirt', 'ShortOne', 'Serious'], ['duo-4', 'Duo avatar, glasses', 'Hoodie', 'MediumStraight', 'Smile', { accessory: 'GlassesFour' }],
  ['duo-5', 'Duo avatar, afro', 'SportyTee', 'Afro', 'BigSmile'], ['duo-6', 'Duo avatar, beard', 'Hoodie', 'Pomp', 'Calm', { beard: 'FullMedium' }],
  ['duo-7', 'Duo avatar, hijab', 'ButtonShirt', 'Hijab', 'Cute'], ['duo-8', 'Duo avatar, long hair', 'ButtonShirt', 'LongHair', 'Solemn'],
  ['duo-9', 'Duo avatar, beanie', 'Hoodie', 'Beanie', 'Cheeky'], ['duo-10', 'Duo avatar, bangs', 'Hoodie', 'MediumBangs', 'Smile'],
  ['duo-11', 'Duo avatar, sunglasses', 'Tee', 'FlatTop', 'Smile', { accessory: 'SunglassesTwo' }], ['duo-12', 'Duo avatar, twists', 'SportyTee', 'Twists', 'SmileTeeth'],
];
const PASTEL = [
  ['pastel-1', 'Pastel lady, curly', 'Tee', 'LongCurly', 'Cute'], ['pastel-2', 'Pastel lady, bun', 'Coffee', 'BunTwo', 'Calm'],
  ['pastel-3', 'Pastel lady, bangs', 'ButtonShirt', 'LongBangs', 'Smile'], ['pastel-4', 'Pastel lady, hijab', 'ButtonShirt', 'Hijab', 'BigSmile'],
  ['pastel-5', 'Pastel lady, bantu knots', 'Hoodie', 'BantuKnots', 'Cute'], ['pastel-6', 'Pastel lady, long afro', 'SportyTee', 'LongAfro', 'Smile'],
  ['pastel-7', 'Pastel lady, wavy hair', 'StripedTee', 'Wavy', 'EyesClosed'], ['pastel-8', 'Pastel lady, glasses', 'ButtonPocketShirt', 'MediumOne', 'Calm', { accessory: 'GlassesThree' }],
  ['pastel-9', 'Pastel lady, laptop', 'Computer', 'MediumBangs', 'Driven'], ['pastel-10', 'Pastel lady, bun clip', 'StripedTee', 'BunClip', 'LoveGrinTeeth'],
  ['pastel-11', 'Pastel lady, straight hair', 'Tee', 'MediumStraight', 'Smile'], ['pastel-12', 'Pastel lady, color bun', 'Tee', 'ColorBun', 'BigSmile'],
];
const GIRL = [
  ['girl-1', 'Girl power, pointing up', 'PointingUp', 'LongCurly', 'BigSmile'], ['girl-2', 'Girl power, arms crossed', 'TeeArmsCrossed', 'Bun', 'Driven'],
  ['girl-3', 'Girl power, explaining', 'Explaining', 'BantuKnots', 'Explaining'], ['girl-4', 'Girl power, confident', 'Hoodie', 'LongAfro', 'Smile'],
  ['girl-5', 'Girl power, gamer', 'Gaming', 'MediumBangs', 'EatingHappy'], ['girl-6', 'Girl power, hijab', 'PointingUp', 'Hijab', 'SmileTeeth'],
  ['girl-7', 'Girl power, cool', 'ThunderTee', 'LongHair', 'Smile', { accessory: 'Sunglasses' }], ['girl-8', 'Girl power, leader', 'BlazerBlackTee', 'MediumStraight', 'Serious'],
  ['girl-9', 'Girl power, cheering', 'Explaining', 'LongBangs', 'SmileLOL'], ['girl-10', 'Girl power, sporty', 'PolkadotJacket', 'BunTwo', 'Driven'],
  ['girl-11', 'Girl power, curly', 'ButtonPocketShirt', 'LongCurly', 'Cheeky'], ['girl-12', 'Girl power, twists', 'SportyTee', 'TwistsTwo', 'BigSmile'],
];
const PASTEL_TOPS = ['#F9C6D3', '#D9C8F5', '#C8EBDD', '#FFD9B8', '#C9E4F7', '#FBEFB0'];
const BOLD_TOPS = ['#E8336D', '#F7A21B', '#6A2C91', '#1F9D8B', '#2B59C3', '#E63946'];

/** [pack id, list, colours for index i] */
const GROUPS = [
  ['people', PEOPLE, (i) => ({ skinColor: SKIN[i % SKIN.length], topColor: TOPS[i % TOPS.length] })],
  ['duo', DUO, (i) => ({ skinColor: '#FFFFFF', topColor: i % 2 ? '#1D1D1D' : '#FFFFFF' })],
  ['pastel', PASTEL, (i) => ({ skinColor: SKIN[(i * 5) % SKIN.length], topColor: PASTEL_TOPS[i % PASTEL_TOPS.length] })],
  ['girl', GIRL, (i) => ({ skinColor: SKIN[(i + 2) % SKIN.length], topColor: BOLD_TOPS[i % BOLD_TOPS.length] })],
];

mkdirSync(out, { recursive: true });
const index = {};
for (const [pack, list, colours] of GROUPS) {
  index[pack] = list.map(([file, label]) => [file, label]);
  list.forEach(([file, , body, head, face, extra = {}], i) => {
    const { skinColor, topColor } = colours(i), outlineColor = '#1d1d1d';
    const el = React.createElement(Effigy, {
      body: { type: body, options: { skinColor, topColor, outlineColor } },
      head: { type: head, options: { skinColor, outlineColor } },
      face: { type: face, options: { outlineColor } },
      ...(extra.beard ? { beard: { type: extra.beard, options: { outlineColor } } } : {}),
      ...(extra.accessory ? { accessory: { type: extra.accessory, options: { outlineColor } } } : {}),
    });
    // Drop the fixed pixel size so the SVG scales to its frame.
    const svg = renderToStaticMarkup(el).replace(/ width="[^"]*px" height="[^"]*px"/, '').replace(/ style="[^"]*"/, '');
    writeFileSync(join(out, `${file}.svg`), svg);
  });
}writeFileSync(
  join(out, 'LICENSE.txt'),
  'Open Peeps by Pablo Stanley (https://www.openpeeps.com), released under CC0 1.0.\n' +
    'Rendered with the npm package @opeepsfun/open-peeps (MIT, Emre Çakır).\n',
);
writeFileSync(join(root, 'src/lib/graphics/peeps.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`wrote ${Object.values(index).flat().length} people`);
