'use client';

import Modal from '@/components/Modal/implementation/Modal';
import { useSignOutConfirmHandler } from './useSignOutConfirmHandler';

/** Asks before signing out while some cloud edits haven't reached the account yet. */
export default function SignOutConfirm() {
  const h = useSignOutConfirmHandler();
  if (!h.state) return null;
  return (
    <Modal
      title="Some changes haven't synced yet."
      onClose={h.cancel}
      testId="signout-confirm"
      actions={
        <>
          <button type="button" className="btn" onClick={h.cancel}>{h.waiting ? 'Cancel' : 'Keep editing'}</button>
          {!h.waiting && <button type="button" className="btn" onClick={h.signOutAnyway}>Sign out anyway</button>}
          {!h.waiting && (
            <button type="button" className="btn primary" onClick={h.wait}>
              {h.state === 'stuck' ? 'Try again' : 'Wait'}
            </button>
          )}
        </>
      }
    >
      <p role={h.waiting ? 'status' : undefined}>{h.message}</p>
    </Modal>
  );
}
