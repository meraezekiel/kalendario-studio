'use client';

import Link from 'next/link';
import AccountMenu from '@/components/Studio/implementation/AccountMenu/implementation/AccountMenu';
import { type StatLine, useAdminStatsHandler } from './useAdminStatsHandler';

function StatTable({ title, lines }: { title: string; lines: StatLine[] }) {
  return (
    <table className="stats">
      <thead>
        <tr>
          <th>{title}</th>
          <th>Today</th>
          <th>7 days</th>
          <th>30 days</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.label} data-label={l.label}>
            <td>{l.label}</td>
            <td>{l.totals.today}</td>
            <td>{l.totals.week}</td>
            <td>{l.totals.month}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The /admin/stats page: daily counts of what people do in the editor, to see who it's for. */
export default function AdminStats() {
  const h = useAdminStatsHandler();
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
          <Link href="/admin">Accounts</Link>
          <Link href="/admin/products">Products</Link>
          <Link href="/admin/stats" aria-current="page">Stats</Link>
        </nav>
        <h1 className="admin-title">Stats</h1>
        <p className="hint admin-summary">
          Counted per day in Philippine time, with no names and no cookies. Visitor numbers and where they come from (Facebook, Google…) are in{' '}
          <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Vercel → Analytics</a>.
        </p>
        {h.error && <p className="auth-error" role="alert">{h.error}</p>}
        {!h.loaded ? (
          <p className="hint">Loading stats…</p>
        ) : (
          <div className="stats-grid">
            <p className="note-box" data-testid="stats-insight">{h.insight}</p>
            <StatTable title="Using the editor" lines={h.use} />
            <StatTable title="Print Kit" lines={h.kit} />
            <StatTable title="Templates picked" lines={h.templates} />
          </div>
        )}
      </main>
    </div>
  );
}
