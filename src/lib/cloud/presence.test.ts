import { describe, expect, it } from 'vitest';
import { colorFor, people, PRESENCE_COLORS, readOthers, whoElse } from './presence';

describe('presence', () => {
  it('colours are deterministic and from the palette', () => {
    expect(colorFor('user-a')).toBe(colorFor('user-a'));
    expect(PRESENCE_COLORS).toContain(colorFor('user-b'));
    const all = new Set(Array.from({ length: 60 }, (_, i) => colorFor(`u${i}`)));
    expect(all.size).toBe(6);
  });

  it('readOthers drops this tab, keeps well-formed fields and recomputes the colour', () => {
    const state = {
      me: [{ uid: 'u1', name: 'Me', color: 'red', page: 0, sel: [] }],
      t2: [{ uid: 'u2', name: ' Ana ', color: 'url(x)', page: 2, sel: ['e1', 5] }],
      bad: [{ name: 'no uid' }],
    };
    expect(readOthers(state, 'me')).toEqual([{ key: 't2', uid: 'u2', name: 'Ana', color: colorFor('u2'), page: 2, sel: ['e1'] }]);
  });

  it('people de-duplicates by user and whoElse names them', () => {
    const p = (key: string, uid: string, name: string) => ({ key, uid, name, color: colorFor(uid), page: 0, sel: [] });
    const two = [p('a', 'u1', 'Ana'), p('b', 'u1', 'Ana')];
    expect(people(two)).toHaveLength(1);
    expect(whoElse(two)).toEqual({ who: 'Ana', many: false });
    expect(whoElse([...two, p('c', 'u2', 'Ben'), p('d', 'u3', 'Cy')])).toEqual({ who: 'Ana and 2 others', many: true });
  });
});
