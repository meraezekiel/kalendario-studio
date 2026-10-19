'use client';

import Modal from '@/components/Modal/implementation/Modal';
import { useSignOutConfirmHandler } from './useSignOutConfirmHandler';

/**
 * Asks before signing out while some cloud edits haven't reached the account yet. For the open design it
 * offers to wait for them; for designs not open here, to open the design so it can sync.
 */
export default function SignOutConfirm() {
  const h = useSignOutConfirmHandler();
  if (!h.state) return null;
  return (
    <Modal
      title="Some changes haven't synced yet."
      onClose={h.cancel}
      testId="signout-confirm"
      actions={
        h.away ? (
          <>
            <button type="button" className="btn" onClick={h.cancel}>Cancel</button>
            <button type="button" className="btn" onClick={h.signOutAnyway}>Sign out anyway</button>
            <button type="button" className="btn primary" onClick={h.open}>Open design</button>
          </>
        ) : (
          <>
            <button type="button" className="btn" onClick={h.cancel}>{h.waiting ? 'Cancel' : 'Keep editing'}</button>
            {!h.waiting && <button type="button" className="btn" onClick={h.signOutAnyway}>Sign out anyway</button>}
            {!h.waiting && (
              <button type="button" className="btn primary" onClick={h.wait}>
                {h.state === 'stuck' ? 'Try again' : 'Wait'}
              </button>
            )}
          </>
        )
      }
    >
      <p role={h.waiting ? 'status' : undefined}>{h.message}</p>
    </Modal>
  );
}
