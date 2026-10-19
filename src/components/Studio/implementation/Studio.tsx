'use client';

import Link from 'next/link';
import CloudBanner from './CloudBanner/implementation/CloudBanner';
import Drawer from'./Drawer/implementation/Drawer';
import ExportBox from './ExportBox/implementation/ExportBox';
import Inspector from './Inspector/implementation/Inspector';
import PrintArea from './PrintArea/implementation/PrintArea';
import Stage from './Stage/implementation/Stage';
import Toast from './Toast/implementation/Toast';
import ThanksNote from './ThanksNote/implementation/ThanksNote';
import ToolRail from './ToolRail/implementation/ToolRail';
import TopBar from './TopBar/implementation/TopBar';
import { useStudioHandler } from './useStudioHandler';

/** The calendar editor: top bar, tool rail + drawer, canvas, inspector. With `designId`, edits a cloud design. */
export default function Studio({ designId }: { designId?: string }) {
  const { ready, denied, readOnly } = useStudioHandler(designId);
  if (denied) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">Kalendaryo Studio</div>
          <p className="auth-title" role="alert">You don&apos;t have access to this design.</p>
          <p className="hint">Ask its owner to share it with you, or open one of your own.</p>
          <Link className="btn primary auth-wide" href="/designs">My designs</Link>
        </div>
      </main>
    );
  }
  if (!ready) return <div className="boot">Loading Kalendaryo Studio…</div>;
  return (
    <>
      <div className={readOnly ? 'app readonly' : 'app'}>
        <TopBar />
        <ToolRail />
        <Drawer />
        <Stage />
        <Inspector />
      </div>
      <PrintArea />
      <ExportBox />
      <Toast />
      <ThanksNote />
      <CloudBanner cloud={!!designId} />
    </>
  );
}
