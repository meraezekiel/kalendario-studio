'use client';

import Link from 'next/link';
import AccountMenu from '@/components/Studio/implementation/AccountMenu/implementation/AccountMenu';
import DesignCard from './DesignCard/implementation/DesignCard';
import SignUpRequests from './SignUpRequests/implementation/SignUpRequests';
import { useDesignsHandler } from './useDesignsHandler';

/** The /designs page: the account's designs, the ones shared with it, and (for the admin) sign-ups to approve. */
export default function Designs() {
  const h = useDesignsHandler();
  if (!h.enabled) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">Kalendaryo Studio</div>
          <p className="hint">Accounts aren&rsquo;t set up on this site. You can still design and print without one.</p>
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
        <div className="designs-head">
          <div className={`seg designs-tabs${h.tabs.length > 2 ? ' wide' : ''}`} role="tablist" aria-label="Designs">
            {h.tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={h.tab === t.id} className={h.tab === t.id ? 'on' : ''} onClick={() => h.setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="grow" />
          <button type="button" className="btn primary" onClick={h.create} disabled={h.creating}>New design</button>
        </div>
        {h.error && <p className="auth-error" role="alert">{h.error}</p>}
        {h.loading ? (
          <p className="hint">{h.tab === 'requests' ? 'Loading sign-ups…' : 'Loading your designs…'}</p>
        ) : h.requests ? (
          <SignUpRequests list={h.requests} onApprove={h.approve} onDecline={h.decline} />
        ) : h.list!.length === 0 ? (
          <p className="hint designs-empty">{h.empty}</p>
        ) : (
          <div className="designs-grid">
            {h.list!.map((d) => (
              <DesignCard key={d.id} design={d} onRename={(name) => h.rename(d.id, name)} onRemove={() => h.remove(d.id)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
