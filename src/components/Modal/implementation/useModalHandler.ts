import { useEffect, useId, useRef } from 'react';

/** Escape closes; focus moves into the dialog on open and back to where it was on close. */
export function useModalHandler(onClose: () => void) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('[data-autofocus], input, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      before?.focus?.();
    };
  }, []);

  /** Clicking the dimmed backdrop (not the dialog) cancels. */
  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };
  return { titleId, box, onBackdrop };
}
