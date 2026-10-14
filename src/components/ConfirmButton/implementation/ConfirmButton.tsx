'use client';

import { useConfirmButtonHandler } from './useConfirmButtonHandler';

interface Props {
  onConfirm: () => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  /** Shown while waiting for the confirming click. */
  confirmLabel?: React.ReactNode;
  children: React.ReactNode;
}

/** A button for destructive or sweeping actions that needs two clicks. */
export default function ConfirmButton({ onConfirm, className = 'btn', style, title, confirmLabel = 'Click again to confirm', children }: Props) {
  const { armed, onClick } = useConfirmButtonHandler(onConfirm);
  return (
    <button type="button" className={`${className}${armed ? ' arm' : ''}`} style={style} title={title} onClick={onClick} data-armed={armed || undefined}>
      {armed ? confirmLabel : children}
    </button>
  );
}
