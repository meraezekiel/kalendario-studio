import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATES } from '../calendar/templates';
import type { CalendarDoc } from '../calendar/types';
import { CloudError } from './transport';

const calls: string[] = [];
const photos = vi.hoisted(() => ({ usage: 0, failOn: new Map<string, Error>() }));

vi.mock('./photos', async (orig) => {
  const real = await orig<typeof import('./photos')>();
  return {
    ...real,
    photoUsage: async () => photos.usage,
    dataUrlFile: (src: string) => ({ name: src }) as unknown as File,
    uploadPhoto: async (id: string, f: File) => {
      calls.push(`upload ${f.name}`);
      const err = photos.failOn.get(f.name);
      if (err) throw err;
      return { src: `sb:${id}/${f.name.slice(-4)}.jpg`, w: 10, h: 5 };
    },
    libraryCopyOf: async (from: string) => {
      calls.push(`copy ${from}`);
      const err = photos.failOn.get(from);
      if (err) throw err;
      return `lib/me/copy-${from.split('/')[1]}`;
    },
    // Photos under 'lib/me/' are already in this account's library.
    isMyLibraryPhoto: async (path: string) => path.startsWith('lib/me/'),
    linkPhoto: async (id: string, path: string) => void calls.push(`link ${id} ${path}`),
  };
});
vi.mock('./designs', () => ({
  createDesign: async (doc: CalendarDoc, name: string) => {
    calls.push(`create ${name} ${Object.keys(doc.assets).length}`);
    return 'new';
  },
  writeNewDesign: async (id: string, doc: CalendarDoc) => {
    calls.push(`write ${id}`);
    written = doc;
  },
  removeDesign: async (id: string) => void calls.push(`remove ${id}`),
}));

let written: CalendarDoc | null = null;
const { estimateBytes, importDoc, sameDesign } = await import('./importDoc');

const b64 = (n: number) => 'A'.repeat(n);
const mkDoc = (assets: CalendarDoc['assets']): CalendarDoc => ({ v: 3, year: 2027, holidays: true, cur: 0, assets, tray: Object.keys(assets), pages: TEMPLATES.pastel.make() });

beforeEach(() => {
  calls.length = 0;
  photos.usage = 0;
  photos.failOn.clear();
  written = null;
});

describe('estimateBytes', () => {
  it('counts each data-URL photo once at 3/4 of its base64 length', () => {
    const doc = mkDoc({
      a: { src: `data:image/jpeg;base64,${b64(400)}`, w: 1, h: 1 },
      b: { src: `data:image/jpeg;base64,${b64(400)}`, w: 1, h: 1 }, // same photo twice
      c: { src: `data:image/png;base64,${b64(800)}`, w: 1, h: 1 },
      d: { src: 'sb:x/one.jpg', w: 1, h: 1 },
      e: { src: '@sample', w: 1, h: 1 },
    });
    expect(estimateBytes(doc)).toBe(300 + 600);
  });
});

describe('importDoc', () => {
  const doc = () =>
    mkDoc({
      a: { src: `data:image/jpeg;base64,${b64(400)}AAA1`, w: 100, h: 50 },
      b: { src: `data:image/jpeg;base64,${b64(400)}AAA1`, w: 100, h: 50 },
      c: { src: 'sb:other/p.jpg', w: 1, h: 1 },
      s: { src: '@sample', w: 1, h: 1 },
    });

  it("creates the design, uploads data photos and copies others' cloud photos into the library, then writes the state", async () => {
    const progress: string[] = [];
    const id = await importDoc(doc(), 'Mine', (d, t) => progress.push(`${d}/${t}`));
    expect(id).toBe('new');
    expect(calls).toEqual(['create Mine 1', `upload data:image/jpeg;base64,${b64(400)}AAA1`, 'copy other/p.jpg', 'link new lib/me/copy-p.jpg', 'write new']);
    expect(progress).toEqual(['0/2', '1/2', '2/2']);
    expect(written!.assets.a).toEqual({ src: 'sb:new/AAA1.jpg', w: 10, h: 5 });
    expect(written!.assets.b.src).toBe('sb:new/AAA1.jpg');
    expect(written!.assets.c.src).toBe('sb:lib/me/copy-p.jpg');
    expect(written!.assets.s.src).toBe('@sample');
    expect(written!.tray).toEqual(['a', 'b', 'c', 's']);
  });

  it('links a photo already in the library instead of copying it', async () => {
    await importDoc(mkDoc({ c: { src: 'sb:lib/me/p.jpg', w: 1, h: 1 } }), 'Mine');
    expect(calls).toEqual(['create Mine 0', 'link new lib/me/p.jpg', 'write new']);
    expect(written!.assets.c.src).toBe('sb:lib/me/p.jpg');
  });

  it('throws limit before creating anything when the photos would not fit', async () => {
    photos.usage = 52428800 - 300;
    await expect(importDoc(doc(), 'Mine')).rejects.toMatchObject({ code: 'limit' });
    expect(calls).toEqual([]);
  });

  it('removes the new design and rethrows when the space runs out midway', async () => {
    photos.failOn.set('other/p.jpg', new CloudError('limit'));
    await expect(importDoc(doc(), 'Mine')).rejects.toMatchObject({ code: 'limit' });
    expect(calls.at(-1)).toBe('remove new');
    expect(calls).not.toContain('write new');
  });

  it('skips a photo that cannot be read and says how many', async () => {
    photos.failOn.set('other/p.jpg', new CloudError('denied', 'photo not found'));
    let skipped = 0;
    await importDoc(doc(), 'Mine', undefined, (n) => (skipped = n));
    expect(skipped).toBe(1);
    expect(written!.assets.c).toBeUndefined();
    expect(written!.tray).toEqual(['a', 'b', 's']);
  });
});

describe('sameDesign', () => {
  it('ignores element ids and the open page, nothing else', () => {
    const a = mkDoc({});
    const b = mkDoc({});
    b.cur = 1;
    expect(sameDesign(a, b)).toBe(true);
    b.year = 2030;
    expect(sameDesign(a, b)).toBe(false);
  });
});
