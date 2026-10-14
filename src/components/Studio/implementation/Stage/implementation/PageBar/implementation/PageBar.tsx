'use client';

import { usePageBarHandler } from './usePageBarHandler';

export default function PageBar() {
  const { tabs, cur, goTo, add } = usePageBarHandler();
  return (
    <div className="pagebar" data-testid="pagebar">
      {tabs.map((t) => (
        <button key={t.id} className={t.i === cur ? 'on' : ''} aria-current={t.i === cur ? 'page' : undefined} onClick={() => goTo(t.i)}>
          {t.label}
        </button>
      ))}
      <button onClick={add} title="Add a blank page">+ Page</button>
    </div>
  );
}
