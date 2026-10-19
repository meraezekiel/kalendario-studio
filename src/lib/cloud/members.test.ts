import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATES } from '../calendar/templates';
import type { CalendarDoc } from '../calendar/types';

/** Every query-builder call made, as `method(args)`, and what the next query resolves to. */
const db = vi.hoisted(() => ({ calls: [] as string[], result: { data: [] as unknown, error: null as unknown }, me: 'owner@example.com' }));

vi.mock('./supabase', () => {
  const builder = (): unknown =>
    new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === 'then') return (res: (v: unknown) => void) => res(db.result);
          return (...args: unknown[]) => {
            db.calls.push(`${String(prop)}(${JSON.stringify(args)})`);
            return builder();
          };
        },
      },
    );
  return {
    supabase: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { email: db.me } } } }) },
      from: (t: string) => {
        db.calls.push(`from(${t})`);
        return builder();
      },
    }),
  };
});

const embedded = vi.hoisted(() => ({ keep: undefined as unknown }));
vi.mock('./photos', () => ({
  embedPhotos: async (doc: CalendarDoc, keep: boolean) => {
    embedded.keep = keep;
    return { ...doc, assets: { a: { src: 'data:image/jpeg;base64,AAAA', w: 1, h: 1 } } };
  },
}));
const imported = vi.hoisted(() => ({ name: '', doc: null as CalendarDoc | null }));
vi.mock('./importDoc', () => ({
  importDoc: async (doc: CalendarDoc, name: string, _p: unknown, onSkip?: (n: number) => void) => {
    imported.name = name;
    imported.doc = doc;
    onSkip?.(2);
    return 'copy-id';
  },
}));

const { copyDesign, listMembers, normalizeEmail, setRole, share, ShareError, unshare } = await import('./members');

beforeEach(() => {
  db.calls.length = 0;
  db.result = { data: [], error: null };
  db.me = 'owner@example.com';
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ana.Cruz@Example.COM ')).toBe('ana.cruz@example.com');
  });
});

describe('share', () => {
  it('upserts the lowercase, trimmed address with the role', async () => {
    await share('d1', '  Friend@Example.com ', 'viewer');
    expect(db.calls).toEqual([
      'from(design_members)',
      `upsert(${JSON.stringify([{ design_id: 'd1', email: 'friend@example.com', role: 'viewer' }, { onConflict: 'design_id,email' }])})`,
    ]);
  });

  it("refuses the owner's own address, whatever its case", async () => {
    db.me = 'Owner@Example.com';
    await expect(share('d1', ' OWNER@example.com', 'editor')).rejects.toThrow(new ShareError("That's you."));
    expect(db.calls).toEqual([]);
  });

  it('refuses something that is not an email address', async () => {
    await expect(share('d1', 'not an email', 'editor')).rejects.toBeInstanceOf(ShareError);
    await expect(share('d1', '   ', 'editor')).rejects.toBeInstanceOf(ShareError);
    expect(db.calls).toEqual([]);
  });

  it('passes on a refused insert as a CloudError', async () => {
    db.result = { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
    await expect(share('d1', 'a@b.co', 'editor')).rejects.toMatchObject({ name: 'CloudError', code: 'denied' });
  });
});

describe('listMembers', () => {
  it('marks members with an account as joined', async () => {
    db.result = {
      data: [
        { email: 'a@b.co', role: 'editor', user_id: 'u1' },
        { email: 'c@d.co', role: 'viewer', user_id: null },
      ],
      error: null,
    };
    expect(await listMembers('d1')).toEqual([
      { email: 'a@b.co', role: 'editor', joined: true },
      { email: 'c@d.co', role: 'viewer', joined: false },
    ]);
    expect(db.calls[1]).toBe('select(["email, role, user_id"])');
  });
});

describe('setRole and unshare', () => {
  it('address the member by lowercase email', async () => {
    db.result = { data: [{ email: 'a@b.co' }], error: null };
    await setRole('d1', 'A@B.co', 'viewer');
    expect(db.calls).toContain('eq(["email","a@b.co"])');
    db.calls.length = 0;
    await unshare('d1', ' A@B.co');
    expect(db.calls).toEqual(['from(design_members)', 'delete([])', 'eq(["design_id","d1"])', 'eq(["email","a@b.co"])']);
  });

  it('setRole says so when the member is gone', async () => {
    db.result = { data: [], error: null };
    await expect(setRole('d1', 'a@b.co', 'viewer')).rejects.toMatchObject({ code: 'denied' });
  });
});

describe('copyDesign', () => {
  const doc: CalendarDoc = { v: 3, year: 2027, holidays: true, cur: 0, assets: { a: { src: 'sb:d1/x.jpg', w: 1, h: 1 } }, tray: ['a'], pages: TEMPLATES.pastel.make() };

  it('imports the doc with its photos embedded where readable, as "<name> (copy)"', async () => {
    let skipped = 0;
    expect(await copyDesign(doc, 'Family 2027', (n) => (skipped = n))).toBe('copy-id');
    expect(embedded.keep).toBe(true);
    expect(imported.name).toBe('Family 2027 (copy)');
    expect(imported.doc?.assets.a.src).toMatch(/^data:/);
    expect(skipped).toBe(2);
  });

  it('names a nameless design', async () => {
    await copyDesign(doc, '  ');
    expect(imported.name).toBe('Untitled calendar (copy)');
  });
});
