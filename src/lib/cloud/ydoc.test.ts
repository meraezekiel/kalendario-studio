import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { TEMPLATES } from '../calendar/templates';
import type { CalendarDoc, TextEl } from '../calendar/types';
import { LOCAL, LOCAL_UNTRACKED } from './sync';
import { makeUndoDriver } from './undo';
import { applyDiff, fromB64, readDoc, ROOT, toB64, writeDoc } from './ydoc';

const mkDoc = (): CalendarDoc => ({ v: 3, year: 2027, holidays: true, cur: 0, assets: { a1: { src: 'data:x', w: 1, h: 2 } }, tray: ['a1'], pages: TEMPLATES.pastel.make() });
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const sync = (a: Y.Doc, b: Y.Doc) => {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)));
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)));
};
const pair = (doc: CalendarDoc) => {
  const a = new Y.Doc();
  writeDoc(a, doc);
  const b = new Y.Doc();
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
  return [a, b] as const;
};
const edit = (doc: CalendarDoc, fn: (d: CalendarDoc) => void) => {
  const n = clone(doc);
  fn(n);
  return n;
};

describe('ydoc', () => {
  it('round-trips a doc except cur', () => {
    const doc = mkDoc();
    const y = new Y.Doc();
    expect(readDoc(y)).toBeNull();
    writeDoc(y, doc);
    const { cur, ...rest } = doc;
    expect(cur).toBe(0);
    expect(readDoc(y)).toEqual(rest);
  });

  it('applyDiff of a moved element only touches that element', () => {
    const doc = mkDoc();
    const y = new Y.Doc();
    writeDoc(y, doc);
    const pages = y.getMap(ROOT).get('pages') as Y.Array<Y.Map<unknown>>;
    const elArr = pages.get(0).get('els') as Y.Array<Y.Map<unknown>>;
    const touched: string[] = [];
    elArr.observeDeep((evs) => evs.forEach((e) => e.path.length && touched.push(String(e.path[0]))));
    const next = edit(doc, (d) => { d.pages[0].els[0].x += 10; });
    applyDiff(y, doc, next);
    expect(touched.length).toBeGreaterThan(0);
    expect(touched.every((p) => p === '0')).toBe(true);
    expect(readDoc(y)!.pages[0].els[0].x).toBe(next.pages[0].els[0].x);
  });

  it('moving an element leaves the others in place', () => {
    const doc = mkDoc();
    const y = new Y.Doc();
    writeDoc(y, doc);
    const next = edit(doc, (d) => { d.pages[0].els.push(d.pages[0].els.shift()!); });
    const pages = y.getMap(ROOT).get('pages') as Y.Array<Y.Map<unknown>>;
    const elArr = pages.get(0).get('els') as Y.Array<Y.Map<unknown>>;
    const before = elArr.toArray().slice(1);
    applyDiff(y, doc, next);
    const after = elArr.toArray().slice(0, -1);
    expect(after.every((m, i) => m === before[i])).toBe(true);
  });

  it('concurrent edits to different elements both survive', () => {
    const doc = mkDoc();
    const [a, b] = pair(doc);
    const na = edit(doc, (d) => { d.pages[0].els[0].x = 123; });
    const nb = edit(doc, (d) => { (d.pages[0].els[1] as TextEl).text = 'hello'; });
    applyDiff(a, doc, na);
    applyDiff(b, doc, nb);
    sync(a, b);
    for (const y of [a, b]) {
      const r = readDoc(y)!;
      expect(r.pages[0].els[0].x).toBe(123);
      expect((r.pages[0].els[1] as TextEl).text).toBe('hello');
    }
  });

  it('concurrent edits to the same field converge to one value', () => {
    const doc = mkDoc();
    const [a, b] = pair(doc);
    applyDiff(a, doc, edit(doc, (d) => { d.pages[0].els[0].x = 1; }));
    applyDiff(b, doc, edit(doc, (d) => { d.pages[0].els[0].x = 2; }));
    sync(a, b);
    expect(readDoc(a)).toEqual(readDoc(b));
    expect([1, 2]).toContain(readDoc(a)!.pages[0].els[0].x);
  });

  it('delete on one side and edit on the other converges', () => {
    const doc = mkDoc();
    const id = doc.pages[0].els[0].id;
    const [a, b] = pair(doc);
    applyDiff(a, doc, edit(doc, (d) => { d.pages[0].els.splice(0, 1); }));
    applyDiff(b, doc, edit(doc, (d) => { d.pages[0].els[0].x = 77; }));
    sync(a, b);
    expect(readDoc(a)).toEqual(readDoc(b));
    expect(readDoc(a)!.pages[0].els.some((e) => e.id === id)).toBe(false);
  });

  it('applyDiff keeps a collaborator element that local prev/next do not know', () => {
    const doc = mkDoc();
    const [a, b] = pair(doc);
    const theirs = { ...clone(doc.pages[0].els[0]), id: 'theirs' };
    applyDiff(b, doc, edit(doc, (d) => { d.pages[0].els.push(theirs); }));
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)));
    applyDiff(a, doc, edit(doc, (d) => { d.pages[0].els.push(d.pages[0].els.shift()!); d.pages[0].els[0].x = 5; }));
    sync(a, b);
    for (const y of [a, b]) expect(readDoc(y)!.pages[0].els.some((e) => e.id === 'theirs')).toBe(true);
    expect(readDoc(a)).toEqual(readDoc(b));
  });

  it('applyDiff still deletes an element it knew about', () => {
    const doc = mkDoc();
    const id = doc.pages[0].els[0].id;
    const y = new Y.Doc();
    writeDoc(y, doc);
    applyDiff(y, doc, edit(doc, (d) => { d.pages[0].els.shift(); }));
    expect(readDoc(y)!.pages[0].els.some((e) => e.id === id)).toBe(false);
    expect(readDoc(y)!.pages[0].els.length).toBe(doc.pages[0].els.length - 1);
  });

  it('reordering els keeps all elements', () => {
    const doc = mkDoc();
    const y = new Y.Doc();
    writeDoc(y, doc);
    const next = edit(doc, (d) => { d.pages[0].els.push(d.pages[0].els.shift()!); });
    applyDiff(y, doc, next);
    expect(readDoc(y)!.pages[0].els).toEqual(next.pages[0].els);
    const back = edit(next, (d) => { d.pages[0].els.unshift(d.pages[0].els.pop()!); });
    applyDiff(y, next, back);
    expect(readDoc(y)!.pages[0].els).toEqual(back.pages[0].els);
  });

  it('cur changes produce no Y update', () => {
    const doc = mkDoc();
    const y = new Y.Doc();
    writeDoc(y, doc);
    let n = 0;
    y.on('update', () => n++);
    applyDiff(y, doc, { ...doc, cur: 2 });
    expect(n).toBe(0);
  });

  it('undo manager only reverts local changes', () => {
    const doc = mkDoc();
    const [a, b] = pair(doc);
    let applied = 0;
    const undo = makeUndoDriver(a, () => { applied++; });
    expect(undo.undo()).toBe(false); // nothing to undo yet
    const x0 = doc.pages[0].els[0].x;
    const moved = edit(doc, (d) => { d.pages[0].els[0].x = x0 + 50; });
    applyDiff(a, doc, moved, LOCAL);
    // Untracked changes (photos in the tray) are not undone.
    undo.stop();
    applyDiff(a, moved, edit(moved, (d) => { d.tray = [...d.tray, 'a2']; }), LOCAL_UNTRACKED);
    applyDiff(b, doc, edit(doc, (d) => { (d.pages[0].els[1] as TextEl).text = 'theirs'; }));
    sync(a, b);
    expect(undo.undo()).toBe(true);
    expect(applied).toBe(1);
    sync(a, b);
    for (const y of [a, b]) {
      const r = readDoc(y)!;
      expect(r.pages[0].els[0].x).toBe(x0);
      expect((r.pages[0].els[1] as TextEl).text).toBe('theirs');
      expect(r.tray).toContain('a2');
    }
    expect(undo.redo()).toBe(true);
    expect(readDoc(a)!.pages[0].els[0].x).toBe(x0 + 50);
    undo.destroy();
  });

  it('undo driver stop() splits steps that would otherwise merge', () => {
    const doc = mkDoc();
    const y = new Y.Doc();
    writeDoc(y, doc);
    const undo = makeUndoDriver(y, () => {});
    const one = edit(doc, (d) => { d.pages[0].els[0].x = 1; });
    const two = edit(one, (d) => { d.pages[0].els[0].x = 2; });
    applyDiff(y, doc, one, LOCAL);
    undo.stop();
    applyDiff(y, one, two, LOCAL);
    undo.undo();
    expect(readDoc(y)!.pages[0].els[0].x).toBe(1);
    undo.destroy();
  });

  it('concurrent moves of the same element never read back as two elements', () => {
    const doc = mkDoc();
    const [a, b] = pair(doc);
    const id = doc.pages[0].els[0].id;
    // Both move the first element: one to the end, the other one step down.
    applyDiff(a, doc, edit(doc, (d) => { d.pages[0].els.push(d.pages[0].els.shift()!); }));
    applyDiff(b, doc, edit(doc, (d) => { const [e] = d.pages[0].els.splice(0, 1); d.pages[0].els.splice(1, 0, e); }));
    sync(a, b);
    for (const y of [a, b]) {
      const raw = ((y.getMap(ROOT).get('pages') as Y.Array<Y.Map<unknown>>).get(0).get('els') as Y.Array<Y.Map<unknown>>).toArray();
      expect(raw.filter((m) => m.get('id') === id).length).toBe(2); // the Y.Array really holds both
      const ids = readDoc(y)!.pages[0].els.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain(id);
      expect(ids.length).toBe(doc.pages[0].els.length);
    }
    expect(readDoc(a)).toEqual(readDoc(b));
    // The next edit drops the extra copy and lands on the one shown.
    const shown = { ...clone(readDoc(a)!), cur: 0 } as CalendarDoc;
    const idx = shown.pages[0].els.findIndex((e) => e.id === id);
    applyDiff(a, shown, edit(shown, (d) => { d.pages[0].els[idx].x = 999; }));
    sync(a, b);
    const els = readDoc(b)!.pages[0].els;
    expect(els.length).toBe(doc.pages[0].els.length);
    expect(els.find((e) => e.id === id)!.x).toBe(999);
    const raw = ((b.getMap(ROOT).get('pages') as Y.Array<Y.Map<unknown>>).get(0).get('els') as Y.Array<Y.Map<unknown>>).toArray();
    expect(raw.length).toBe(doc.pages[0].els.length);
  });

  it('concurrent moves of the same page never read back as two pages', () => {
    const doc = mkDoc();
    doc.pages = ['p1', 'p2', 'p3'].map((id) => ({ ...clone(doc.pages[0]), id }));
    const [a, b] = pair(doc);
    applyDiff(a, doc, edit(doc, (d) => { d.pages.push(d.pages.shift()!); }));
    applyDiff(b, doc, edit(doc, (d) => { const [p] = d.pages.splice(0, 1); d.pages.splice(1, 0, p); }));
    sync(a, b);
    const raw = (a.getMap(ROOT).get('pages') as Y.Array<Y.Map<unknown>>).toArray();
    expect(raw.length).toBe(doc.pages.length + 1); // the Y.Array really holds the page twice
    const ids = readDoc(a)!.pages.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(doc.pages.length);
    expect(readDoc(a)).toEqual(readDoc(b));
  });

  it('toB64/fromB64 round-trip', () => {
    const u = new Uint8Array(70000).map((_, i) => i % 256);
    expect(fromB64(toB64(u))).toEqual(u);
  });
});
