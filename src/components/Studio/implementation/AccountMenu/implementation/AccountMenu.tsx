'use client';

import Link from 'next/link';
import { useAccountMenuHandler } from './useAccountMenuHandler';

/** Top bar account control: "Sign in" when signed out, otherwise an initial avatar with a small menu. */
export default function AccountMenu() {
  const h = useAccountMenuHandler();
  if (!h.enabled || !h.ready) return null;
  if (!h.user) {
    return (
      <Link className="btn" href="/login">
        Sign in
      </Link>
    );
  }
  return (
    <div className="acct" ref={h.box}>
      <button className="acct-avatar" onClick={h.toggle} aria-label="Account" aria-haspopup="menu" aria-expanded={h.open} title={h.user.email}>
        {h.initial}
      </button>
      {h.open && (
        <div className="acct-menu" role="menu" aria-label="Account">
          <div className="acct-who">
            <b>{h.user.name}</b>
            <span>{h.user.email}</span>
          </div>
          <Link className="acct-item" role="menuitem" href="/designs">
            My designs
          </Link>
          <button className="acct-item" role="menuitem" onClick={h.signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
