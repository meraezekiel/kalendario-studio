'use client';

import Link from 'next/link';
import { useAuthCallbackHandler } from './useAuthCallbackHandler';

/** /auth/callback: signs in from an email link, or asks for a new password after a reset link. */
export default function AuthCallback() {
  const h = useAuthCallbackHandler();
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">Kalendaryo Studio</div>
        {h.phase === 'working' && <p className="hint">Signing you in&hellip;</p>}
        {h.phase === 'failed' && (
          <>
            <p className="auth-error" role="alert">{h.error}</p>
            <Link className="btn primary auth-wide" href="/login">Go to sign in</Link>
          </>
        )}
        {h.phase === 'new-password' && (
          <form onSubmit={h.savePassword} className="auth-form">
            <h2 className="auth-title">Set a new password</h2>
            <label className="f">
              New password
              <input type="password" autoComplete="new-password" required minLength={6} value={h.password} onChange={(e) => h.setPassword(e.target.value)} />
            </label>
            {h.error && <p className="auth-error" role="alert">{h.error}</p>}
            <button type="submit" className="btn primary auth-wide" disabled={h.busy}>Save password</button>
          </form>
        )}
      </div>
    </main>
  );
}
