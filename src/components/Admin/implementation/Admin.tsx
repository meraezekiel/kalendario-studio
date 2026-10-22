'use client';

import Link from 'next/link';
import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import AccountMenu from '@/components/Studio/implementation/AccountMenu/implementation/AccountMenu';
import { accountMeta, STATUS_LABEL, statusOf, useAdminHandler } from './useAdminHandler';

/** The /admin page: the site admin's list of accounts, to activate, deactivate or decline. */
export default function Admin() {
  const h = useAdminHandler();
  if (!h.enabled || (h.signedIn && !h.admin)) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">Kalendaryo Studio</div>
          <p className="hint">{h.enabled ? 'This page is for the site admin.' : 'Accounts aren’t set up on this site.'}</p>
          <Link className="btn primary auth-wide" href="/">Back to the editor</Link>
        </div>
      </main>
    );
  }
  if (!h.signedIn) return <div className="boot">Loading Kalendaryo Studio…</div>;
  return (
    <div className="designs-page">
      <header className="top">
        <Link className="brand" href="/">Kalendaryo Studio</Link>
        <div className="grow" />
        <AccountMenu />
      </header>
      <main className="designs-main">
        <nav className="admin-tabs">
          <Link href="/admin" aria-current="page">Accounts</Link>
          <Link href="/admin/products">Products</Link>
        </nav>
        <h1 className="admin-title">Accounts</h1>
        <p className="hint admin-summary">{h.summary}</p>
        {h.error && <p className="auth-error" role="alert">{h.error}</p>}
        {!h.list ? (
          <p className="hint">Loading accounts…</p>
        ) : (
          <ul className="accounts">
            {h.list.map((a) => {
              const status = statusOf(a);
              return (
                <li key={a.user_id} className="account" data-email={a.email} data-status={status}>
                  <div className="account-who">
                    <div>
                      <b>{a.name || a.email.split('@')[0]}</b>
                      <span className={`account-status ${status}`}>{STATUS_LABEL[status]}</span>
                    </div>
                    <span>{a.email}</span>
                    <span className="account-meta">{accountMeta(a)}</span>
                  </div>
                  {(status === 'waiting' || status === 'deactivated') && (
                    <button type="button" className="btn primary" onClick={() => h.activate(a.user_id)}>Activate</button>
                  )}
                  {status === 'waiting' && (
                    <ConfirmButton className="btn danger" onConfirm={() => h.decline(a.user_id)} confirmLabel="Click again to decline">Decline</ConfirmButton>
                  )}
                  {status === 'active' && (
                    <ConfirmButton className="btn danger" onConfirm={() => h.deactivate(a.user_id)} confirmLabel="Click again to deactivate">Deactivate</ConfirmButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
