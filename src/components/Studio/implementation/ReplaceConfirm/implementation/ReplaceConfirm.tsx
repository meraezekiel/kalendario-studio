'use client';

import Modal from '@/components/Modal/implementation/Modal';
import { useReplaceConfirmHandler } from './useReplaceConfirmHandler';

/** Asks before a change that replaces every page while someone else is in the design. */
export default function ReplaceConfirm() {
  const h = useReplaceConfirmHandler();
  if (!h.message) return null;
  return (
    <Modal
      title="Replace all pages?"
      onClose={h.cancel}
      testId="replace-confirm"
      actions={
        <>
          <button type="button" className="btn" onClick={h.cancel} data-autofocus>Cancel</button>
          <button type="button" className="btn primary" onClick={h.replace}>Replace anyway</button>
        </>
      }
    >
      <p>{h.message}</p>
    </Modal>
  );
}
