'use client';

import { MONTHS } from '@/lib/calendar/constants';
import { assetInUse, clonePage, dims, makeYear, syncDesign } from '@/lib/calendar/document';
import { mkCal, mkEvents, mkImage, mkPage, mkShape, mkText } from '@/lib/calendar/factories';
import { readImage } from '@/lib/calendar/samplePhoto';
import { giveCal, TEMPLATES } from '@/lib/calendar/templates';
import type { CalEl, El, Page, ShapeEl, ShapeKind } from '@/lib/calendar/types';
import { clamp, clone, uid } from '@/lib/calendar/utils';
import { curPage, findEl, type PickTarget, toast, useStudioStore } from './useStudioStore';

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
  addEl(e);
}

const SHAPE_PRESETS: Record<ShapeKind, Partial<ShapeEl>> = {
  rect: { w: 220, h: 150 }, rounded: { w: 220, h: 150, radius: 18 }, ellipse: { w: 180, h: 180, fill: '#8fcdea' },
  line: { w: 320, h: 12, sw: 3 }, heart: { w: 140, h: 130, fill: '#e2557f' }, star: { w: 140, h: 140, fill: '#f0b429' },
  flower: { w: 130, h: 130 }, burst: { w: 150, h: 150, fill: '#f5b800' }, wave: { w: 794, h: 150, fill: '#4b1f50' },
  banner: { w: 340, h: 56, fill: '#e3212b' }, tape: { w: 200, h: 52, fill: '#b9a2df', rot: -6 },
  blob: { w: 200, h: 180, fill: '#93d9b8' }, holes: { w: 706, h: 15, fill: '#3b3540' },
};

export function addShape(s: ShapeKind) {
  const e = mkShape({ ...SHAPE_PRESETS[s], shape: s === 'rounded' ? 'rect' : s });
  const H = dims(curPage(S().doc)).H;
  if (s === 'wave') return addEl({ ...e, x: 0, y: H - 150 }, false);
  if (s === 'holes') return addEl({ ...e, x: 44, y: 12 }, false);
  addEl(e);
}

/* ---------- photos ---------- */

export async function addFiles(files: File[]): Promise<string[]> {
  const ids: string[] = [];
  const read: { id: string; a: Awaited<ReturnType<typeof readImage>> }[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try {
      read.push({ id: 'a' + uid(), a: await readImage(f) });
    } catch {
      toast(`Couldn't read ${f.name}. Try a JPG or PNG.`);
    }
  }
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
    if (target && 'cal' in target) {
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

export function removeTrayItem(i: number) {
  S().set({ armed: null });
  S().mutate((d) => {
    const id = d.tray[i];
    d.tray.splice(i, 1);
    if (!assetInUse(d, id)) delete d.assets[id];
  }, { history: false });
}

/* ---------- element commands ---------- */

export function deleteSelected() {
  const s = S();
  if (!s.sel) return;
  const id = s.sel;
  s.mutate((d) => {
    const pg = curPage(d);
    pg.els = pg.els.filter((e) => e.id !== id);
  });
  s.select(null);
}

export function duplicate(src: El | null | undefined) {
  if (!src) return;
  const c = clone(src);
  c.id = uid();
  c.x += 20;
  c.y += 20;
  c.locked = false;
  S().mutate((d) => void curPage(d).els.push(c));
  S().select(c.id);
}

export function copySelected() {
  const el = findEl(S().doc, S().sel);
  if (!el) return;
  S().set({ clip: clone(el) });
  toast('Copied. Press Ctrl+V to paste, on this or another page.');
}

export function arrange(how: 'front' | 'back' | 'fwd' | 'bwd') {
  const id = S().sel;
  S().mutate((d) => {
    const els = curPage(d).els;
    const i = els.findIndex((e) => e.id === id);
    if (i < 0) return;
    const [el] = els.splice(i, 1);
    const j = how === 'front' ? els.length : how === 'back' ? 0 : how === 'fwd' ? Math.min(els.length, i + 1) : Math.max(0, i - 1);
    els.splice(j, 0, el);
  });
}

export function nudge(dx: number, dy: number) {
  const id = S().sel;
  if (!id) return;
  S().mutate((d) => {
    const el = findEl(d, id);
    if (el && !el.locked) {
      el.x += dx;
      el.y += dy;
    }
  }, { key: `nudge:${id}` });
}

export function toggleFlag(id: string, flag: 'hidden' | 'locked') {
  S().mutate((d) => {
    const el = findEl(d, id);
    if (el) el[flag] = !el[flag];
  });
  if (flag === 'hidden' && S().sel === id && findEl(S().doc, id)?.hidden) S().select(null);
}

/* ---------- pages ---------- */

export function goToPage(i: number) {
  const s = S();
  if (i < 0 || i >= s.doc.pages.length) return;
  s.set({ sel: null, selDay: null, cropId: null, editing: null });
  s.mutate((d) => void (d.cur = i), { history: false });
}

export function addPage(duplicateCurrent = false) {
  S().mutate((d) => {
    const pg = curPage(d);
    const p = duplicateCurrent ? clonePage(pg) : { ...mkPage(pg.paper.size, pg.paper.o, '#ffffff', []), month: pg.month };
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

export function applyTemplate(key: string) {
  S().mutate((d) => {
    d.pages = TEMPLATES[key].make();
    d.cur = 0;
    makeYear(d);
  });
  S().set({ sel: null, selDay: null, cropId: null, editing: null });
  toast(`${TEMPLATES[key].name}: ${S().doc.pages.length} pages ready. Change anything, then use “Apply design to all months”.`);
}

export function fillYear() {
  let n = 0;
  const b = curPage(S().doc).month;
  S().mutate((d) => void (n = makeYear(d)));
  S().select(null);
  toast(`${n} page${n > 1 ? 's' : ''} ready, ${MONTHS[b]} to December.`);
}

export function applyDesignToAll() {
  let n = 0;
  S().mutate((d) => void (n = syncDesign(d)));
  S().select(null);
  toast(n ? `Design copied to ${n} other page${n > 1 ? 's' : ''}. Each month kept its own photos and day details.` : 'There are no other pages of this kind yet. Use Pages → Fill the rest of the year.');
}

/** Changes the paper and stretches the design vertically to the new height. */
export function setPaper(patch: Partial<Page['paper']>) {
  S().mutate((d) => {
    const pg = curPage(d);
    const oldH = dims(pg).H;
    Object.assign(pg.paper, patch);
    const r = dims(pg).H / oldH;
    if (r !== 1) {
      pg.els.forEach((e) => {
        e.y = Math.round(e.y * r);
        e.h = Math.round(e.h * r);
      });
      toast('Design stretched to the new paper. Press Undo to go back.');
    }
  });
}

/* ---------- output ---------- */

export function printPages(all: boolean) {
  const { doc } = S();
  const pg = curPage(doc);
  if (!all) return S().set({ printing: [doc.cur] });
  const key = JSON.stringify(pg.paper);
  const idx = doc.pages.map((p, i) => (JSON.stringify(p.paper) === key ? i : -1)).filter((i) => i >= 0);
  if (idx.length < doc.pages.length) toast(`Printing the ${idx.length} pages that use ${dims(pg).label}. Go to a page with the other paper size and print again for the rest.`);
  S().set({ printing: idx });
}

export function exportPNG() {
  toast('Making PNG…');
  S().set({ exporting: true });
}
