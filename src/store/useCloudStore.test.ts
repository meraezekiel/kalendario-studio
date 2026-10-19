import { beforeEach, describe, expect, it } from 'vitest';
import { colorFor } from '@/lib/cloud/presence';
import { confirmReplaceAll, useCloudStore } from './useCloudStore';
import { useStudioStore } from './useStudioStore';

const ana = { key: 't1', uid: 'u1', name: 'Ana', color: colorFor('u1'), page: 0, sel: [] };

describe('confirmReplaceAll', () => {
  beforeEach(() => {
    useCloudStore.getState().begin(null);
    useStudioStore.setState({ readOnly: false });
  });

  it('resolves true at once when nobody else is here', async () => {
    await expect(confirmReplaceAll()).resolves.toBe(true);
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
