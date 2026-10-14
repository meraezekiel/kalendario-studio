import type { El } from '@/lib/calendar/types';
import { updateEl } from '@/store/useStudioStore';

/** `{...bind('size')}` gives a field its value and an onChange that edits the element (merged undo per field). */
export function useBindHandler<T extends El>(el: T) {
  return <K extends keyof T & string>(k: K) => ({
    value: el[k],
    onChange: (v: T[K]) => updateEl<T>(el.id, { [k]: v } as unknown as Partial<T>, `f:${el.id}:${k}`),
  });
}
