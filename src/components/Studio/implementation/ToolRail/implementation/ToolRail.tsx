'use client';

import type { DrawerTab } from '@/store/useStudioStore';
import { useToolRailHandler } from './useToolRailHandler';

const TABS: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
  { id: 'templates', label: 'Templates', icon: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></> },
  { id: 'add', label: 'Add', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></> },
  { id: 'photos', label: 'Photos', icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></> },
  { id: 'page', label: 'Pages', icon: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /></> },
];

export default function ToolRail() {
  const { tab, setTab } = useToolRailHandler();
  return (
    <nav className="rail" aria-label="Tools">
      {TABS.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{t.icon}</svg>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
