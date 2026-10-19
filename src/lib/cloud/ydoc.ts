import * as Y from 'yjs';
import type { CalendarDoc } from '../calendar/types';

/** The part of a design that is shared; `cur` (the page being viewed) stays per person. */
export type SharedDoc = Omit<CalendarDoc, 'cur'>;

/** Key of the top-level Y.Map. */
export const ROOT = 'doc';

/** Arrays of `{ id, … }` objects that are merged item by item. */
const ID_ARRAYS = new Set(['pages', 'els']);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function toY(key: string, v: unknown): unknown {
  if (Array.isArray(v) && ID_ARRAYS.has(key)) {
    const arr = new Y.Array<Y.Map<unknown>>();
    arr.push(v.map((o) => toY('', o) as Y.Map<unknown>));
    return arr;
  }
  if (isObj(v)) {
    const m = new Y.Map<unknown>();
    for (const k of Object.keys(v)) if (v[k] !== undefined) m.set(k, toY(k, v[k]));
    return m;
  }
  return v;
}

function fromY(v: unknown): unknown {
  if (v instanceof Y.Map) {
    const o: Obj = {};
    v.forEach((val, k) => { o[k] = fromY(val); });
    return o;
  }
  if (v instanceof Y.Array) return v.toArray().map(fromY);
  return v;
}

function diffIdArray(arr: Y.Array<Y.Map<unknown>>, prev: Obj[], next: Obj[]) {
  const prevById = new Map(prev.map((e) => [e.id as string, e]));
  const nextIds = new Set(next.map((e) => e.id as string));
  const idAt = (i: number) => arr.get(i).get('id') as string;
  for (let i = arr.length - 1; i >= 0; i--) if (!nextIds.has(idAt(i))) arr.delete(i, 1);
  for (let i = 0; i < next.length; i++) {
    const n = next[i];
    if (i < arr.length && idAt(i) === n.id) {
      const p = prevById.get(n.id as string);
      if (p && p !== n) diffMap(arr.get(i), p, n);
      continue;
    }
    if (i + 1 < arr.length && idAt(i + 1) === n.id) {
      arr.delete(i, 1); // the item here moved later; it is re-inserted when reached
      i--;
      continue;
    }
    for (let j = i + 1; j < arr.length; j++) {
      if (idAt(j) === n.id) { arr.delete(j, 1); break; }
    }
    arr.insert(i, [toY('', n) as Y.Map<unknown>]);
  }
  if (arr.length > next.length) arr.delete(next.length, arr.length - next.length);
}

function diffMap(m: Y.Map<unknown>, prev: Obj, next: Obj) {
  if (prev === next) return;
  for (const k of Object.keys(prev)) if (next[k] === undefined && m.has(k)) m.delete(k);
  for (const k of Object.keys(next)) {
    const p = prev[k];
    const n = next[k];
    if (p === n || n === undefined) continue;
    const cur = m.get(k);
    if (Array.isArray(n) && ID_ARRAYS.has(k) && cur instanceof Y.Array && Array.isArray(p)) diffIdArray(cur, p, n);
    else if (isObj(n) && isObj(p) && cur instanceof Y.Map) diffMap(cur, p, n);
    else if (Array.isArray(n) && !ID_ARRAYS.has(k) && deepEqual(cur, n)) continue;
    else m.set(k, toY(k, n));
  }
}

const stripCur = (d: SharedDoc | CalendarDoc): Obj => {
  const { cur: _cur, ...rest } = d as CalendarDoc;
  return rest as unknown as Obj;
};

/** Fills an empty Y.Doc with a design, ignoring `cur`. */
export function writeDoc(y: Y.Doc, doc: SharedDoc | CalendarDoc, origin?: unknown): void {
  y.transact(() => {
    const root = y.getMap(ROOT);
    const o = stripCur(doc);
    for (const k of Object.keys(o)) if (o[k] !== undefined) root.set(k, toY(k, o[k]));
  }, origin);
}

/** Reads the design back out, or null when the Y.Doc is empty. */
export function readDoc(y: Y.Doc): SharedDoc | null {
  const root = y.getMap(ROOT);
  return root.size ? (fromY(root) as SharedDoc) : null;
}

/** Writes only what changed between two versions, in one transaction. */
export function applyDiff(y: Y.Doc, prev: CalendarDoc, next: CalendarDoc, origin?: unknown): void {
  if (prev === next) return;
  y.transact(() => diffMap(y.getMap(ROOT), stripCur(prev), stripCur(next)), origin);
}

/** Encodes bytes as base64. */
export function toB64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Decodes base64 to bytes. */
export function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
