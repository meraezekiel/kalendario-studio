'use client';

import { useModalHandler } from './useModalHandler';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Buttons along the bottom, e.g. Cancel and the main action. */
  actions: React.ReactNode;
  testId?: string;
}

/** A centred dialog over a dimmed page. Escape or a click outside closes it. */
export default function Modal({ title, onClose, children, actions, testId }: Props) {
  const { titleId, box, onBackdrop } = useModalHandler(onClose);
  return (
    <div className="modal-back" onMouseDown={onBackdrop}>
      <div ref={box} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid={testId}>
        <h2 id={titleId}>{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}
