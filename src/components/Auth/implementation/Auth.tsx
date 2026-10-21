'use client';

import Link from 'next/link';
import { TABS, useAuthHandler } from './useAuthHandler';

const SUBMIT = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link' } as const;

/** The /login page: Sign in, Create account and Forgot password. */
export default function Auth() {
  const h = useAuthHandler();
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
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">Kalendaryo Studio</div>
        <div className="seg" role="tablist" aria-label="Account">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={h.tab === t.id} className={h.tab === t.id ? 'on' : ''} onClick={() => h.choose(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <form onSubmit={h.submit} className="auth-form">
          {h.tab === 'signup' && (
            <label className="f">
              Name
              <input type="text" autoComplete="name" value={h.name} onChange={(e) => h.setName(e.target.value)} />
            </label>
          )}
          <label className="f">
            Email
            <input type="email" autoComplete="email" required value={h.email} onChange={(e) => h.setEmail(e.target.value)} />
          </label>
          {h.tab !== 'forgot' && (
            <label className="f">
              Password
              <input
                type="password"
                autoComplete={h.tab === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={h.tab === 'signup' ? 6 : undefined}
                value={h.password}
                onChange={(e) => h.setPassword(e.target.value)}
              />
            </label>
          )}
          {h.error && <p className="auth-error" role="alert">{h.error}</p>}
          {h.sent && <p className="auth-sent" role="status">{h.sent}</p>}
          {h.waiting && <p className="auth-sent" role="status">{h.waiting}</p>}
          <button type="submit" className="btn primary auth-wide" disabled={h.busy}>
            {SUBMIT[h.tab]}
          </button>
        </form>
        {h.showGoogle && h.tab !== 'forgot' && (
          <button type="button" className="btn auth-wide" onClick={h.google}>
            Sign in with Google
          </button>
        )}
        <p className="hint auth-foot">
          <Link href="/">Keep designing without an account</Link>
        </p>
      </div>
    </main>
  );
}
