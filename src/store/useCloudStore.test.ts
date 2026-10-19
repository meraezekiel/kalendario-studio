import { beforeEach, describe, expect, it } from 'vitest';
import { colorFor } from '@/lib/cloud/presence';
import { fillYear, setYear } from './actions';
import { confirmReplaceAll, useCloudStore } from './useCloudStore';
import { freshDoc, useStudioStore } from './useStudioStore';

const ana = { key: 't1', uid: 'u1', name: 'Ana', color: colorFor('u1'), page: 0, sel: [] };

describe('confirmReplaceAll', () => {
  beforeEach(() => {
    useCloudStore.getState().begin(null);
    useStudioStore.setState({ readOnly: false });
  });

  it('returns true at once (no promise) when nobody else is here', () => {
    expect(confirmReplaceAll()).toBe(true);
    expect(useCloudStore.getState().replacing).toBeNull();
  });

  it('asks when someone else is here, and resolves with the answer', async () => {
    useCloudStore.getState().patch({ others: [ana] });
    const a = confirmReplaceAll();
    expect(useCloudStore.getState().replacing).toEqual({ who: 'Ana', many: false });
    expect(confirmReplaceAll()).toBe(a); // one question at a time
    useCloudStore.getState().answerReplace(false);
    await expect(a).resolves.toBe(false);
    expect(useCloudStore.getState().replacing).toBeNull();
    const b = confirmReplaceAll();
    useCloudStore.getState().answerReplace(true);
    await expect(b).resolves.toBe(true);
  });

  it('leaving the design cancels a pending question', async () => {
    useCloudStore.getState().patch({ others: [ana] });
    const a = confirmReplaceAll();
    useCloudStore.getState().begin(null);
    await expect(a).resolves.toBe(false);
  });
});

describe('whole-design actions', () => {
  beforeEach(() => {
    useCloudStore.getState().begin(null);
    useStudioStore.setState({ readOnly: false, historyDriver: null, onLocalChange: null });
    useStudioStore.getState().hydrate(freshDoc());
  });

  it('run synchronously on the local editor (nobody else here)', () => {
    expect(setYear(2031)).toBeUndefined();
    expect(useStudioStore.getState().doc.year).toBe(2031);
    useStudioStore.getState().mutate((d) => void (d.cur = 4));
    const before = useStudioStore.getState().doc.pages.length;
    expect(fillYear()).toBeUndefined();
    expect(useStudioStore.getState().doc.pages.length).toBeLessThan(before);
  });

  it('wait for the answer when someone else is here; Cancel changes nothing', async () => {
    useCloudStore.getState().patch({ others: [ana] });
    const year = useStudioStore.getState().doc.year;
    const pending = setYear(2032);
    expect(pending).toBeInstanceOf(Promise);
    expect(useStudioStore.getState().doc.year).toBe(year);
    useCloudStore.getState().answerReplace(false);
    await pending;
    expect(useStudioStore.getState().doc.year).toBe(year);
    const again = setYear(2033);
    useCloudStore.getState().answerReplace(true);
    await again;
    expect(useStudioStore.getState().doc.year).toBe(2033);
  });
});
