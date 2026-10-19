import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarDoc, El } from '@/lib/calendar/types';
import { freshDoc, useStudioStore } from './useStudioStore';

const S = () => useStudioStore.getState();
const firstEls = (d: CalendarDoc) => d.pages[0].els;

beforeEach(() => {
  useStudioStore.setState({ readOnly: false, historyDriver: null, onLocalChange: null, toast: null });
  S().hydrate(freshDoc());
});

describe('studio store cloud hooks', () => {
  it('onLocalChange gets prev, next and tracked from mutate, undo and redo', () => {
    const calls: [CalendarDoc, CalendarDoc, boolean][] = [];
    useStudioStore.setState({ onLocalChange: (p, n, t) => calls.push([p, n, t]) });
    const d0 = S().doc;
    S().mutate((d) => void (d.year = 2040));
    S().mutate((d) => void (d.holidays = false), { history: false });
    S().mutate(() => {}, { history: false }); // no change, no call
    expect(calls.map((c) => c[2])).toEqual([true, false]);
    expect(calls[0][0]).toBe(d0);
    expect(calls[0][1].year).toBe(2040);
    S().undo();
    expect(calls).toHaveLength(3);
    expect(calls[2][2]).toBe(true);
    expect(calls[2][1].year).toBe(d0.year);
    S().redo();
    expect(calls[3][1].year).toBe(2040);
  });

  it('readOnly blocks mutate and toasts at most once per 3 s', () => {
    vi.useFakeTimers();
    try {
      useStudioStore.setState({ readOnly: true });
      const before = S().doc;
      S().mutate((d) => void (d.year = 2050));
      S().mutate((d) => void (d.year = 2051));
      expect(S().doc).toBe(before);
      expect(S().toast).toEqual({ msg: 'This design is view only.', n: 1 });
      vi.advanceTimersByTime(3100);
      S().mutate((d) => void (d.year = 2052));
      expect(S().toast?.n).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('readOnly also blocks checkpoint, undo and redo (nothing reaches onLocalChange)', () => {
    S().mutate((d) => void (d.year = 2045)); // an undo step from before the design became view only
    useStudioStore.setState({ future: [structuredClone(S().doc)] });
    const onLocal = vi.fn();
    const driver = { undo: vi.fn(), redo: vi.fn(), stop: vi.fn() };
    useStudioStore.setState({ readOnly: true, onLocalChange: onLocal });
    const before = S().doc;
    const past = S().past.length;
    S().checkpoint();
    expect(S().past).toHaveLength(past);
    S().undo();
    S().redo();
    expect(S().doc).toBe(before);
    useStudioStore.setState({ historyDriver: driver });
    S().undo();
    S().redo();
    expect(driver.undo).not.toHaveBeenCalled();
    expect(driver.redo).not.toHaveBeenCalled();
    expect(onLocal).not.toHaveBeenCalled();
  });

  it('historyDriver takes over undo/redo and mutate records no local history', () => {
    const driver = { undo: vi.fn(() => true), redo: vi.fn(() => true), stop: vi.fn() };
    useStudioStore.setState({ historyDriver: driver });
    S().mutate((d) => void (d.year = 2041));
    S().checkpoint();
    expect(S().past).toHaveLength(0);
    S().undo();
    S().redo();
    expect(driver.undo).toHaveBeenCalledOnce();
    expect(driver.redo).toHaveBeenCalledOnce();
    expect(S().doc.year).toBe(2041);
  });

  it('with a historyDriver, new steps stop capturing, merged keys and drags do not, and an empty stack toasts', () => {
    const driver = { undo: vi.fn(() => false), redo: vi.fn(() => false), stop: vi.fn() };
    const onLocal = vi.fn();
    useStudioStore.setState({ historyDriver: driver, onLocalChange: onLocal });
    S().mutate((d) => void (d.year = 2041), { key: 'year' });
    expect(driver.stop).toHaveBeenCalledTimes(1);
    S().mutate((d) => void (d.year = 2042), { key: 'year' });
    expect(driver.stop).toHaveBeenCalledTimes(1);
    S().checkpoint();
    expect(driver.stop).toHaveBeenCalledTimes(2);
    S().mutate((d) => void (d.year = 2043), { history: false, inStep: true });
    expect(driver.stop).toHaveBeenCalledTimes(2);
    expect(onLocal).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), true);
    S().mutate((d) => void (d.holidays = !d.holidays), { history: false });
    expect(onLocal).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), false);
    S().undo();
    expect(S().toast?.msg).toBe('Nothing to undo.');
  });

  it('applyRemote keeps cur (clamped), records no history and drops missing selections', () => {
    const local = S().doc;
    S().mutate((d) => void (d.cur = d.pages.length - 1));
    const lastEls = local.pages[local.pages.length - 1].els as El[];
    const [keep, gone] = lastEls;
    S().selectMany([keep.id, gone.id]);
    const pastLen = S().past.length;
    const onLocal = vi.fn();
    useStudioStore.setState({ onLocalChange: onLocal });

    const { cur: _c, ...shared } = structuredClone(S().doc);
    shared.pages[shared.pages.length - 1].els = shared.pages[shared.pages.length - 1].els.filter((e) => e.id !== gone.id);
    S().applyRemote(shared);
    expect(S().doc.cur).toBe(local.pages.length - 1);
    expect(S().past).toHaveLength(pastLen);
    expect(onLocal).not.toHaveBeenCalled();
    expect(S().multi).toEqual([]);
    expect(S().sel).toBe(keep.id);

    // Fewer pages than our current page: cur is clamped.
    S().applyRemote({ ...shared, pages: shared.pages.slice(0, 2) });
    expect(S().doc.cur).toBe(1);
    expect(S().sel).toBe(null);
    expect(firstEls(S().doc)).toHaveLength(firstEls(local).length);
  });
});
