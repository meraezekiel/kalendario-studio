'use client';

import Modal from '@/components/Modal/implementation/Modal';
import type { MemberRole } from '@/lib/cloud/members';
import { ROLES, useShareDialogHandler } from './useShareDialogHandler';

interface Props {
  designId: string;
  onClose: () => void;
}

/** The owner shares a design by email (Can edit / Can view), and changes or removes who has it. */
export default function ShareDialog({ designId, onClose }: Props) {
  const h = useShareDialogHandler(designId);
  return (
    <Modal
      title="Share this design"
      onClose={onClose}
      testId="share-dialog"
      actions={<button type="button" className="btn primary" onClick={onClose}>Done</button>}
    >
      <form className="share-form" onSubmit={h.submit} noValidate>
        <label className="f share-email">
          Email
          <input type="email" autoComplete="off" placeholder="name@example.com" value={h.email} onChange={(e) => h.setEmail(e.target.value)} />
        </label>
        <select aria-label="Access" value={h.role} onChange={(e) => h.setRole(e.target.value as MemberRole)}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button type="submit" className="btn primary" disabled={!h.canShare}>Share</button>
      </form>
      {h.error && <p className="auth-error" role="alert">{h.error}</p>}
      {h.members === null ? (
        <p className="hint">Loading…</p>
      ) : h.members.length === 0 ? (
        <p className="hint">Only you can open this design.</p>
      ) : (
        <ul className="share-list" aria-label="People with access">
          {h.members.map((m) => (
            <li key={m.email} data-testid="member">
              <div className="share-who">
                <span className="share-mail" title={m.email}>{m.email}</span>
                {!m.joined && <span className="hint">Invited — appears for them once they sign up with this email</span>}
              </div>
              <select aria-label={`Access for ${m.email}`} value={m.role} onChange={(e) => h.changeRole(m.email, e.target.value as MemberRole)}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button type="button" className="btn danger" aria-label={`Remove ${m.email}`} onClick={() => h.remove(m.email)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
