'use client';

import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import type { SignUpRequest } from '@/lib/cloud/approval';
import { useSignUpRequestsHandler } from './useSignUpRequestsHandler';

interface Props {
  list: SignUpRequest[];
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}

/** The admin's list of new accounts waiting for approval, each with Approve and Decline. */
export default function SignUpRequests({ list, onApprove, onDecline }: Props) {
  const h = useSignUpRequestsHandler();
  if (!list.length) return <p className="hint designs-empty">No one is waiting. New sign-ups appear here for you to approve.</p>;
  return (
    <ul className="requests">
      {list.map((r) => (
        <li key={r.user_id} className="request" data-email={r.email}>
          <div className="request-who">
            <b>{r.name || r.email.split('@')[0]}</b>
            <span>{r.email}</span>
            <span className="request-when">Signed up {h.when(r.created_at)}</span>
          </div>
          <button type="button" className="btn primary" onClick={() => onApprove(r.user_id)}>Approve</button>
          <ConfirmButton className="btn danger" onConfirm={() => onDecline(r.user_id)} confirmLabel="Click again to decline">Decline</ConfirmButton>
        </li>
      ))}
    </ul>
  );
}
