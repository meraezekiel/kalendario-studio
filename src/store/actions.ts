'use client';

import { CUSTOM_MAX, CUSTOM_MIN, MONTHS, UNIT_MM } from '@/lib/calendar/constants';
import { countEvent } from '@/lib/cloud/stats';
import { assetInUse, clonePage, dims, ensureBackground, makeYear, mkBackground, syncDesign } from '@/lib/calendar/document';
import { mkCal, mkEvents, mkGraphic, mkImage, mkPage, mkShape, mkText } from '@/lib/calendar/factories';
import { DECOS } from '@/lib/graphics/deco';
import { findGraphic } from '@/lib/graphics/library';
import { rememberGraphic } from '@/lib/graphics/recent';
import { readImage } from '@/lib/calendar/samplePhoto';
import { designFileName, DESIGN_EXT, parseDesign, serializeDesign } from '@/lib/calendar/designFile';
import { DEFAULT_SHEET, sheetLayout } from '@/lib/calendar/sheet';
import { giveCal, TEMPLATES } from '@/lib/calendar/templates';
import { markThanksSeen, thanksSeen } from '@/lib/support/support';
import type { CalEl, CalendarDoc, El, Page, ShapeEl, ShapeKind, SheetSettings, SizeUnit } from '@/lib/calendar/types';
import { clamp, clone, uid } from '@/lib/calendar/utils';
import { canDeleteCloudPhoto, cloudPath, deletePhoto, embedPhotos, photosOf, PhotoTooLarge, UnreadableImage, uploadPhoto } from '@/lib/cloud/photos';
import { importDoc } from '@/lib/cloud/importDoc';
import { DESIGNS_FULL, MAX_PHOTO_BYTES, megabytes, PHOTO_SPACE_BYTES } from '@/lib/cloud/limits';
import { copyDesign } from '@/lib/cloud/members';
import { CloudError } from '@/lib/cloud/transport';
import { useAuthStore } from './useAuthStore';
import { confirmReplaceAll, useCloudStore } from './useCloudStore';
import { curPage, findEl, type PickTarget, selIds, toast, useStudioStore } from './useStudioStore';

const S = () => useStudioStore.getState();

/** Adds an element to the current page (centred when `center`) and selects it. */
export function addEl(el: El, center = true) {
  S().mutate((d) => {
    const pg = curPage(d);
    if (center) {
      const D = dims(pg);
      el.x = Math.round((D.W - el.w) / 2);
      el.y = Math.round((D.H - el.h) / 2);
    }
    pg.els.push(el);
  });
  S().set({ cropId: null });
  S().select(el.id);
}

export type PresetKey = 'h1' | 'h2' | 'body' | 'month' | 'year' | 'script' | 'cal' | 'calbar' | 'events' | 'photo' | 'circle' | 'polaroid';

export function addPreset(w: PresetKey) {
  const cals = curPage(S().doc).els.filter((e): e is CalEl => e.type === 'cal');
  const nextMo = cals.length ? Math.max(...cals.map((c) => c.mo)) + 1 : 0;
  const make: Record<PresetKey, () => El> = {
    h1: () => mkText({ w: 520, h: 84, text: 'Add a heading', font: 'Fredoka', size: 58, bold: true }),
    h2: () => mkText({ w: 440, h: 54, text: 'Add a subheading', font: 'Poppins', size: 28, bold: true, color: '#444444' }),
    body: () => mkText({ w: 380, h: 70, text: 'Add a little bit of body text', font: 'Poppins', size: 16, color: '#444444' }),
    month: () => mkText({ w: 460, h: 80, text: '{MONTH}', font: 'Anton', size: 60, color: '#1b3a8f', ls: 3 }),
    year: () => mkText({ w: 260, h: 80, text: '{YEAR}', font: 'Anton', size: 60, color: '#e3212b' }),
    script: () => mkText({ w: 460, h: 90, text: 'Our Family {YEAR}', font: 'Caveat', size: 64, bold: true, color: '#c76a9a' }),
    cal: () => mkCal({ w: 600, h: 440, mo: nextMo }),
    calbar: () => giveCal({ w: 520, h: 300, mo: nextMo }),
    events: () => mkEvents({ mo: cals.length ? cals[cals.length - 1].mo : 0 }),
    photo: () => mkImage(),
    circle: () => mkImage({ w: 240, h: 240, radius: 50, bw: 5 }),
    polaroid: () => mkImage({ w: 260, h: 290, bw: 12, bc: '#ffffff', shadow: true, rot: -4 }),
  };
  const e = make[w]();
  if ((e.type === 'cal' || e.type === 'events') && e.mo > 11) {
    e.mo = 11;
    toast('That would go past December, so this calendar shows December.');
  }
  // A new month table goes under the lowest one instead of on top of it (e.g. two months per page).
  if (e.type === 'cal' && cals.length) {
    const last = cals.reduce((a, b) => (b.y + b.h > a.y + a.h ? b : a));
    const H = dims(curPage(S().doc)).H, y = last.y + last.h + 16, room = H - y - 16;
    if (room >= 160) {
      Object.assign(e, { x: last.x, y, w: last.w, h: Math.min(last.h, room) });
      return addEl(e, false);
    }
  }
  addEl(e);
}

const SHAPE_PRESETS: Record<ShapeKind, Partial<ShapeEl>> = {
  rect: { w: 220, h: 150 }, rounded: { w: 220, h: 150, radius: 18 }, ellipse: { w: 180, h: 180, fill: '#8fcdea' },
  line: { w: 320, h: 12, sw: 3 }, heart: { w: 140, h: 130, fill: '#e2557f' }, star: { w: 140, h: 140, fill: '#f0b429' },
  flower: { w: 130, h: 130 }, burst: { w: 150, h: 150, fill: '#f5b800' }, wave: { w: 794, h: 150, fill: '#4b1f50' },
  banner: { w: 340, h: 56, fill: '#e3212b' }, tape: { w: 200, h: 52, fill: '#b9a2df', rot: -6 },
  blob: { w: 200, h: 180, fill: '#93d9b8' }, holes: { w: 706, h: 15, fill: '#3b3540' },
  slant: { w: 420, h: 70, fill: '#e3212b' },
};

export function addShape(s: ShapeKind) {
  const e = mkShape({ ...SHAPE_PRESETS[s], shape: s === 'rounded' ? 'rect' : s });
  const H = dims(curPage(S().doc)).H;
  if (s === 'wave') return addEl({ ...e, x: 0, y: H - 150 }, false);
  if (s === 'holes') return addEl({ ...e, x: 44, y: 12 }, false);
  addEl(e);
}

/** Adds a full-page background image behind everything, selects it and asks for a photo. */
export function addBackground() {
  const b = mkBackground(curPage(S().doc));
  S().mutate((d) => void curPage(d).els.unshift(b));
  S().set({ cropId: null });
  S().select(b.id);
  pickFiles({ img: b.id }, false);
}

/** Resizes a background image to cover the whole page again. */
export function fitToPage(id: string) {
  S().mutate((d) => {
    const el = findEl(d, id);
    if (!el) return;
    const D = dims(curPage(d));
    Object.assign(el, { x: 0, y: 0, w: D.W, h: D.H, rot: 0 });
  });
}

/** Adds a graphic from the library, centred or at `pt` (page coordinates), and selects it. */
export function addGraphic(key: string, pt?: { x: number; y: number }) {
  const g = findGraphic(key);
  if (!g) return;
  const D = dims(curPage(S().doc));
  const [w, h] = g.deco ? DECOS[g.deco.kind].size : g.stretch ? [360, 240] : key.startsWith('peeps/') ? [170, 204] : [160, 160];
  const e = g.deco
    ? mkGraphic({ key: `deco/${g.deco.kind}`, palette: g.deco.palette, seed: Math.floor(Math.random() * 1e9), amount: 1, w, h })
    : mkGraphic({ key, w, h });
  rememberGraphic(key);
  if (!pt) return addEl(e);
  addEl({ ...e, x: Math.round(clamp(pt.x - w / 2, 0, D.W - w)), y: Math.round(clamp(pt.y - h / 2, 0, D.H - h)) }, false);
}

/* ---------- photos ---------- */

export const PHOTO_SPACE_FULL = `Your ${megabytes(PHOTO_SPACE_BYTES)} photo space is full. Remove photos from your designs to add more.`;
const PHOTO_TOO_BIG = `That photo is too big to add (over ${megabytes(MAX_PHOTO_BYTES)}). Try a smaller one.`;
const PHOTO_OFFLINE = "You're offline. Photos can be added once you're back online.";

/**
 * Reads picked images into the doc's assets and tray, returning their ids. In a cloud design each is
 * uploaded once and kept as `sb:<path>`; elsewhere it's a data URL.
 */
export async function addFiles(files: File[]): Promise<string[]> {
  const ids: string[] = [];
  const read: { id: string; a: Awaited<ReturnType<typeof readImage>> }[] = [];
  const designId = useCloudStore.getState().designId;
  if (designId && S().readOnly) {
    S().mutate(() => {}); // says the design is view only
    return ids;
  }
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try {
      read.push({ id: 'a' + uid(), a: designId ? await uploadPhoto(designId, f) : await readImage(f) });
    } catch (e) {
      if (!designId || e instanceof UnreadableImage) toast(`Couldn't read ${f.name}. Try a JPG or PNG.`);
      else if (e instanceof PhotoTooLarge) toast(PHOTO_TOO_BIG);
      else if (e instanceof CloudError && (e.code === 'limit' || e.code === 'offline')) {
        toast(e.code === 'limit' ? PHOTO_SPACE_FULL : PHOTO_OFFLINE);
        break; // the rest would fail the same way
      } else toast(`Couldn't add ${f.name}. Please try again.`);
    }
  }
  // Left the design while uploading: these belong to it, not to whatever is open now.
  if (designId && useCloudStore.getState().designId !== designId) return [];
  if (!read.length) return ids;
  S().mutate((d) => {
    for (const { id, a } of read) {
      d.assets[id] = a;
      d.tray.unshift(id);
      ids.push(id);
    }
  }, { history: false });
  return ids;
}

/** Puts an uploaded photo into a calendar day, a photo frame, or onto the page at `pt`. */
export function placeAsset(id: string, target: PickTarget, pt?: { x: number; y: number }) {
  const s = S();
  const a = s.doc.assets[id];
  if (!a) return;
  let selId: string | null = null, selDay: number | null = null;
  s.mutate((d) => {
    const pg = curPage(d);
    if (target && 'bg' in target) {
      const b = ensureBackground(pg);
      Object.assign(b, { src: id, zoom: 1, px: 50, py: 50 });
      selId = b.id;
    } else if (target && 'cal' in target) {
      const c = pg.els.find((e) => e.id === target.cal);
      if (c?.type === 'cal') (c.days[target.day] = c.days[target.day] || {}).img = id;
      selId = target.cal;
      selDay = target.day;
    } else if (target && 'img' in target) {
      const im = pg.els.find((e) => e.id === target.img);
      if (im?.type === 'image') Object.assign(im, { src: id, zoom: 1, px: 50, py: 50 });
      selId = target.img;
    } else {
      const D = dims(pg);
      const w = Math.min(360, a.w), h = (w * a.h) / a.w;
      const im = mkImage({ src: id, w, h, x: clamp((pt?.x ?? D.W / 2) - w / 2, 0, D.W - w), y: clamp((pt?.y ?? D.H / 2) - h / 2, 0, D.H - h) });
      pg.els.push(im);
      selId = im.id;
    }
  });
  s.set({ armed: null });
  s.select(selId, selDay);
  if (target && 'bg' in target) toast('Background set. Drag its corners to change how wide and tall it is.');
}

/** Opens the system file picker. With a target the first picked photo goes straight there. */
export function pickFiles(target: PickTarget | 'tray', multiple = true) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.multiple = multiple;
  inp.style.display = 'none';
  inp.addEventListener('change', async () => {
    const ids = await addFiles([...(inp.files || [])]);
    inp.remove();
    if (!ids.length) return;
    if (target !== 'tray') placeAsset(ids[0], target);
    else {
      toast(`${ids.length} photo${ids.length > 1 ? 's' : ''} added. Drag onto the page, a frame, or a day.`);
      S().set({ tab: 'photos' });
    }
  });
  document.body.appendChild(inp);
  inp.click();
}

/**
 * Picks several images and makes them the backgrounds of this page and the ones after it,
 * in file-name order (01-jan.png, 02-feb.png, …).
 */
export function pickMonthBackgrounds() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.multiple = true;
  inp.style.display = 'none';
  inp.addEventListener('change', async () => {
    const files = [...(inp.files || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    inp.remove();
    const ids = await addFiles(files);
    if (!ids.length) return;
    const s = S();
    const from = s.doc.cur;
    const n = Math.min(ids.length, s.doc.pages.length - from);
    s.mutate((d) => {
      for (let i = 0; i < n; i++) Object.assign(ensureBackground(d.pages[from + i]), { src: ids[i], zoom: 1, px: 50, py: 50 });
    });
    const extra = ids.length - n;
    toast(`Backgrounds added to page${n > 1 ? 's' : ''} ${from + 1}${n > 1 ? `–${from + n}` : ''}.${extra > 0 ? ` ${extra} more ${extra > 1 ? 'are' : 'is'} in your Photos.` : ''}`);
  });
  document.body.appendChild(inp);
  inp.click();
}

/**
 * Removes a photo from the tray; one no element uses is deleted. In a cloud design its stored file
 * goes too, when it is this design's own and no other asset shares it.
 */
export function removeTrayItem(i: number) {
  S().set({ armed: null });
  const designId = useCloudStore.getState().designId;
  let freed: string | null = null;
  S().mutate((d) => {
    const id = d.tray[i];
    d.tray.splice(i, 1);
    if (!assetInUse(d, id)) {
      if (designId && canDeleteCloudPhoto(d, id, designId)) freed = cloudPath(d.assets[id].src);
      delete d.assets[id];
    }
  }, { history: false });
  const path = freed as string | null;
  if (path) {
    deletePhoto(path).catch(() => toast("The photo is removed, but its space couldn't be freed right now."));
  }
}

/* ---------- element commands ---------- */

export function deleteSelected() {
  const s = S();
  const ids = selIds(s);
  if (!ids.length) return;
  s.mutate((d) => {
    const pg = curPage(d);
    pg.els = pg.els.filter((e) => !ids.includes(e.id));
  });
  s.select(null);
}

/** Pastes copies of one or more elements, offset slightly, and selects them. */
export function duplicate(src: El | El[] | null | undefined) {
  const list = Array.isArray(src) ? src : src ? [src] : [];
  if (!list.length) return;
  const copies = list.map((e) => {
    const c = clone(e);
    c.id = uid();
    c.x += 20;
    c.y += 20;
    c.locked = false;
    return c;
  });
  S().mutate((d) => void curPage(d).els.push(...copies));
  S().selectMany(copies.map((c) => c.id));
}

/** The selected elements in page (stacking) order. */
export function selectedEls(): El[] {
  const s = S();
  const ids = selIds(s);
  return curPage(s.doc).els.filter((e) => ids.includes(e.id));
}

export function copySelected() {
  const els = selectedEls();
  if (!els.length) return;
  S().set({ clip: els.map(clone) });
  toast('Copied. Press Ctrl+V to paste, on this or another page.');
}

export function selectAll() {
  S().selectMany(curPage(S().doc).els.filter((e) => !e.hidden && !e.locked).map((e) => e.id));
}

/** Changes stacking order. A multi-selection keeps its own relative order. */
export function arrange(how: 'front' | 'back' | 'fwd' | 'bwd') {
  const ids = selIds(S());
  if (!ids.length) return;
  S().mutate((d) => {
    const pg = curPage(d);
    if (ids.length > 1) {
      const picked = pg.els.filter((e) => ids.includes(e.id));
      const rest = pg.els.filter((e) => !ids.includes(e.id));
      pg.els = how === 'back' || how === 'bwd' ? [...picked, ...rest] : [...rest, ...picked];
      return;
    }
    const els = pg.els;
    const i = els.findIndex((e) => e.id === ids[0]);
    if (i < 0) return;
    const [el] = els.splice(i, 1);
    const j = how === 'front' ? els.length : how === 'back' ? 0 : how === 'fwd' ? Math.min(els.length, i + 1) : Math.max(0, i - 1);
    els.splice(j, 0, el);
  });
}

export function nudge(dx: number, dy: number) {
  const ids = selIds(S());
  if (!ids.length) return;
  S().mutate((d) => {
    for (const id of ids) {
      const el = findEl(d, id);
      if (el && !el.locked) {
        el.x += dx;
        el.y += dy;
      }
    }
  }, { key: `nudge:${ids.join()}` });
}

/** Bounding box of elements (ignoring rotation). */
export function boundsOf(els: El[]) {
  const x = Math.min(...els.map((e) => e.x)), y = Math.min(...els.map((e) => e.y));
  const r = Math.max(...els.map((e) => e.x + e.w)), b = Math.max(...els.map((e) => e.y + e.h));
  return { x, y, w: r - x, h: b - y };
}

export type Align = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

/** Lines up the selected elements with each other (edges or centres of their shared box). */
export function alignSelected(how: Align) {
  const els = selectedEls().filter((e) => !e.locked);
  if (els.length < 2) return;
  const B = boundsOf(els);
  S().mutate((d) => {
    for (const { id } of els) {
      const e = findEl(d, id)!;
      if (how === 'left') e.x = B.x;
      else if (how === 'right') e.x = B.x + B.w - e.w;
      else if (how === 'hcenter') e.x = Math.round(B.x + (B.w - e.w) / 2);
      else if (how === 'top') e.y = B.y;
      else if (how === 'bottom') e.y = B.y + B.h - e.h;
      else e.y = Math.round(B.y + (B.h - e.h) / 2);
    }
  });
}

/** Centres the selection as a group horizontally on the page. */
export function centerSelectedOnPage() {
  const els = selectedEls().filter((e) => !e.locked);
  if (!els.length) return;
  const B = boundsOf(els);
  const dx = Math.round((dims(curPage(S().doc)).W - B.w) / 2 - B.x);
  S().mutate((d) => {
    for (const { id } of els) findEl(d, id)!.x += dx;
  });
}

/** Locks every selected element, or unlocks them all when they are all locked already. */
export function toggleLockSelected() {
  const els = selectedEls();
  const lock = !els.every((e) => e.locked);
  S().mutate((d) => {
    for (const { id } of els) findEl(d, id)!.locked = lock;
  });
}
export function toggleFlag(id: string, flag: 'hidden' | 'locked') {
  S().mutate((d) => {
    const el = findEl(d, id);
    if (el) el[flag] = !el[flag];
  });
  if (flag !== 'hidden' || !findEl(S().doc, id)?.hidden) return;
  const s = S();
  if (s.sel === id) s.select(null);
  else if (s.multi.includes(id)) s.selectMany(s.multi.filter((x) => x !== id));
}

/* ---------- pages ---------- */

export function goToPage(i: number) {
  const s = S();
  if (i < 0 || i >= s.doc.pages.length) return;
  s.select(null);
  s.mutate((d) => void (d.cur = i), { history: false });
}

export function addPage(duplicateCurrent = false) {
  S().mutate((d) => {
    const pg = curPage(d);
    const p = duplicateCurrent ? clonePage(pg) : { ...mkPage(pg.paper.size, pg.paper.o, '#ffffff', []), paper: { ...pg.paper }, month: pg.month };
    d.pages.splice(d.cur + 1, 0, p);
    d.cur++;
  });
  S().select(null);
}

export function deletePage() {
  if (S().doc.pages.length < 2) return toast('A calendar needs at least one page.');
  S().mutate((d) => {
    d.pages.splice(d.cur, 1);
    d.cur = Math.min(d.cur, d.pages.length - 1);
  });
  S().select(null);
}

export function movePage(dir: -1 | 1) {
  S().mutate((d) => {
    const j = d.cur + dir;
    if (j < 0 || j >= d.pages.length) return;
    [d.pages[d.cur], d.pages[j]] = [d.pages[j], d.pages[d.cur]];
    d.cur = j;
  });
}

/** Runs a whole-design change once confirmed: synchronously when nobody else needs asking. */
function confirmed(run: () => void): void | Promise<void> {
  const ok = confirmReplaceAll();
  if (ok === true) return run();
  return ok.then((yes) => { if (yes) run(); });
}

export function applyTemplate(key: string): void | Promise<void> {
  return confirmed(() => applyTemplateNow(key));
}

function applyTemplateNow(key: string) {
  countEvent(`template:${key}`);
  S().mutate((d) => {
    d.pages = TEMPLATES[key].make();
    d.cur = 0;
    makeYear(d);
  });
  S().select(null);
  toast(`${TEMPLATES[key].name}: ${S().doc.pages.length} pages ready. Change anything, then use “Apply design to all months”.`);
}

export function fillYear(): void | Promise<void> {
  return confirmed(fillYearNow);
}

function fillYearNow() {
  let n = 0;
  const b = curPage(S().doc).month;
  S().mutate((d) => void (n = makeYear(d)));
  S().select(null);
  toast(`${n} page${n > 1 ? 's' : ''} ready, ${MONTHS[b]} to December.`);
}

export function applyDesignToAll(): void | Promise<void> {
  return confirmed(applyDesignToAllNow);
}

function applyDesignToAllNow() {
  let n = 0;
  S().mutate((d) => void (n = syncDesign(d)));
  S().select(null);
  toast(n ? `Design copied to ${n} other page${n > 1 ? 's' : ''}. Each month kept its own photos and day details.` : 'There are no other pages of this kind yet. Use Pages → Fill the rest of the year.');
}

/** Sets the calendar year (every page's dates change). Typing or stepping through years asks only once. */
export function setYear(y: number): void | Promise<void> {
  if (y < 1900 || y > 2200) return;
  const s = S();
  const set = () => S().mutate((d) => void (d.year = y), { key: 'doc:year' });
  const continuing = s.lastKey === 'doc:year' && Date.now() - s.lastAt < 1200;
  return continuing ? set() : confirmed(set);
}

/** The current page and every other page on the same paper: a paper change applies to all of them, so a calendar stays one size. */
function samePaperPages(d: CalendarDoc): Page[] {
  const key = JSON.stringify(curPage(d).paper);
  return d.pages.filter((p) => JSON.stringify(p.paper) === key);
}

/** Changes the paper (of every page that shares it) and stretches each design vertically to the new height. */
export function setPaper(patch: Partial<Page['paper']>) {
  let n = 0, stretched = false;
  S().mutate((d) => {
    const group = samePaperPages(d);
    n = group.length;
    group.forEach((pg) => {
      const oldH = dims(pg).H;
      const was = dims(pg);
      if (patch.size === 'Custom' && !pg.paper.cw) Object.assign(pg.paper, { cw: was.wmm, ch: was.hmm, unit: pg.paper.unit ?? 'in' });
      if (pg.paper.size === 'Custom' && patch.o && patch.o !== pg.paper.o && pg.paper.cw && pg.paper.ch) {
        // A custom page turns by swapping its width and height.
        [pg.paper.cw, pg.paper.ch] = [pg.paper.ch, pg.paper.cw];
      }
      Object.assign(pg.paper, patch);
      if (pg.paper.size === 'Custom' && pg.paper.cw && pg.paper.ch) pg.paper.o = pg.paper.cw > pg.paper.ch ? 'l' : 'p';
      const r = dims(pg).H / oldH;
      if (r !== 1) {
        stretched = true;
        pg.els.forEach((e) => {
          e.y = Math.round(e.y * r);
          e.h = Math.round(e.h * r);
        });
      }
    });
  });
  const all = n > 1 ? ` on all ${n} pages` : '';
  if (stretched) toast(`Paper changed${all}; designs stretched to fit. Press Undo to go back.`);
  else if (n > 1) toast(`Paper changed${all}.`);
}

/** Shows a custom page's size in another unit (on every page that shares its paper). */
export function setPaperUnit(u: SizeUnit) {
  S().mutate((d) => samePaperPages(d).forEach((p) => void (p.paper.unit = u)));
}

/** Sets one side of a custom page, given in the page's unit. */
export function setCustomSide(side: 'cw' | 'ch', value: number) {
  const pg = curPage(S().doc);
  const mm = value * UNIT_MM[pg.paper.unit ?? 'in'];
  if (!(mm >= CUSTOM_MIN && mm <= CUSTOM_MAX)) {
    toast('Pick a size between 2 cm and 1.5 m.');
    return false;
  }
  setPaper({ size: 'Custom', [side]: Math.round(mm * 100) / 100 });
  return true;
}

/* ---------- output ---------- */

export function printPages(all: boolean) {
  const { doc } = S();
  const pg = curPage(doc);
  sheetNote(pg, doc.sheet, all);
  if (!all) return S().set({ printing: [doc.cur] });
  const key = JSON.stringify(pg.paper);
  const idx = doc.pages.map((p, i) => (JSON.stringify(p.paper) === key ? i : -1)).filter((i) => i >= 0);
  if (idx.length < doc.pages.length) toast(`Printing the ${idx.length} pages that use ${dims(pg).label}. Go to a page with the other paper size and print again for the rest.`);
  S().set({ printing: idx });
}

/** Says how many pages go on each sheet, or why they can't share one. */
function sheetNote(pg: Page, sheet: SheetSettings | undefined, all: boolean) {
  if (!sheet?.on) return;
  const L = sheetLayout(dims(pg), sheet);
  const name = sheet.paper === 'Long' ? 'long bond' : sheet.paper;
  if (!L) return toast(`This page is too big for ${name} paper, so it prints one per page.`);
  const marks = sheet.marks ? ' with cut marks' : '';
  if (!sheet.fill && !all) return toast(`Printing this page on ${name} paper${marks}. Turn on "Fill the sheet with copies" for ${L.per} per sheet.`);
  toast(`Printing ${L.per} per ${name} sheet${sheet.fill ? ' (copies of each page)' : ''}${marks}. Set the printer to 100% / Actual size.`);
}

/** Changes the several-per-sheet print settings. */
export function setSheet(patch: Partial<SheetSettings>) {
  S().mutate((d) => void (d.sheet = { ...DEFAULT_SHEET, ...d.sheet, ...patch }));
}

/* ---------- design files ---------- */

/** Downloads the whole calendar, photos included, as one file to keep or move to another computer. */
export async function saveDesignFile() {
  let { doc } = S();
  // Cloud photos go into the file as data, so it opens anywhere, signed in or not.
  if (photosOf(doc).length) {
    try {
      doc = await embedPhotos(doc);
    } catch {
      return toast("Couldn't get this design's photos. Check your connection and try again.");
    }
  }
  const url = URL.createObjectURL(new Blob([serializeDesign(doc)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = designFileName(doc);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  keepStorage();
  toast(`Saved ${a.download}. Keep it somewhere safe, like Google Drive.`);
}

/** Opens a design file in place of the current calendar. Undo brings the previous one back. */
export function openDesignFile() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = `${DESIGN_EXT},.json,application/json`;
  inp.style.display = 'none';
  inp.addEventListener('change', async () => {
    const file = inp.files?.[0];
    inp.remove();
    if (!file) return;
    let next: ReturnType<typeof parseDesign>;
    try {
      next = parseDesign(await file.text());
    } catch (e) {
      return toast(e instanceof Error ? e.message : 'Could not open that file.');
    }
    // Signed in, a file becomes a new design in My designs (on the local editor and in a cloud design alike).
    if (useAuthStore.getState().user) return importFile(next, file.name);
    try {
      S().select(null);
      S().mutate((d) => void Object.assign(d, next));
      toast(`Opened ${file.name} (${next.pages.length} page${next.pages.length > 1 ? 's' : ''}). Press Undo to go back to your previous design.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not open that file.');
    }
  });
  document.body.appendChild(inp);
  inp.click();
}

let navigate = (path: string) => location.assign(path);
/** Lets actions move to another screen through the app's router (set by the editor). */
export function setNavigate(fn: (path: string) => void) {
  navigate = fn;
}

/** A sentence for a failed import into the account. */
export function importMessage(e: unknown): string {
  if (e instanceof CloudError && e.code === 'limit') return /design limit/.test(e.message) ? DESIGNS_FULL : PHOTO_SPACE_FULL;
  if (e instanceof CloudError && e.code === 'offline') return "You're offline. Try again once you're back online.";
  return 'Could not save it to My designs. Please try again.';
}

/** Progress while photos go up, naming the one on its way: `Uploading photos 3 of 12…`. */
export const uploadingNote = (done: number, total: number) => `Uploading photos ${Math.min(done + 1, total)} of ${total}…`;
export const skippedPhotosNote = (n: number) => `${n} photo${n > 1 ? 's' : ''} couldn't be copied and show${n > 1 ? '' : 's'} as an empty frame.`;

/** Makes an opened design file a new cloud design and goes to it. */
async function importFile(doc: ReturnType<typeof parseDesign>, fileName: string) {
  const name = fileName.replace(/\.(kalendaryo|json)$/i, '').trim() || 'Untitled calendar';
  toast(`Opening ${fileName}…`);
  let skipped = 0;
  try {
    const id = await importDoc(doc, name, (d, t) => t && toast(uploadingNote(d, t)), (n) => (skipped = n));
    toast(skipped ? skippedPhotosNote(skipped) : `Saved ${fileName} to My designs.`);
    navigate(`/d/${id}`);
  } catch (e) {
    toast(importMessage(e));
  }
}

let copying = false;
/**
 * Saves what's open of the cloud design (as this tab has it, so it works after access is gone) as a
 * new design in My designs and goes to it. Photos that can't be read any more become empty frames.
 * Resolves true once the copy is saved.
 */
export async function saveCopy(): Promise<boolean> {
  if (copying) return false;
  copying = true;
  toast('Saving a copy…');
  let skipped = 0;
  try {
    const id = await copyDesign(S().doc, useCloudStore.getState().name, (n) => (skipped = n));
    toast(skipped ? skippedPhotosNote(skipped) : 'Saved a copy to My designs.');
    navigate(`/d/${id}`);
    return true;
  } catch (e) {
    toast(importMessage(e));
    return false;
  } finally {
    copying = false;
  }
}

let storageAsked = false;
/** Asks the browser not to clear this site's saved design when disk space runs low. */
function keepStorage() {
  if (storageAsked) return;
  storageAsked = true;
  navigator.storage?.persist?.().catch(() => undefined);
}

/** Slightly longer than a toast stays on screen. */
const THANKS_DELAY_MS = 3900;

/** After the first finished export or print, shows a small thank-you note once per browser. */
export function offerThanks() {
  keepStorage();
  if (thanksSeen()) return;
  markThanksSeen();
  // Waits for the "saved" message to fade so the two never overlap.
  setTimeout(() => S().set({ thanks: true }), THANKS_DELAY_MS);
}

/** Opens the "Order prints" form, to have the print shop print this calendar. */
export function orderPrints() {
  countEvent('order_open');
  S().set({ ordering: true });
}

export function exportPNG() {
  toast('Making PNG…');
  S().set({ exporting: true });
}
