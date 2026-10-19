'use client';

import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import ShareDialog from '@/components/ShareDialog/implementation/ShareDialog';
import AccountMenu from '../../AccountMenu/implementation/AccountMenu';
import Presence from '../../Presence/implementation/Presence';
import CloudBar from './CloudBar/implementation/CloudBar';
import { useTopBarHandler } from './useTopBarHandler';

export default function TopBar() {
  const h = useTopBarHandler();
  return (
    <header className="top">
      {h.cloud ? <CloudBar /> : <div className="brand">Kalendaryo Studio</div>}
      {h.viewer && <span className="view-badge" title="You can look, export and print, but not change this design">View only</span>}
      <button className="btn icon" onClick={h.undo} disabled={!h.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
      <button className="btn icon" onClick={h.redo} disabled={!h.canRedo} title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>
      {!h.framed && (
        <>
          <button className="btn filebtn" onClick={h.saveFile} title="Save your design (photos included) as a file to keep for next year (Ctrl+S)">Save file</button>
          <button className="btn filebtn" onClick={h.openFile} title="Open a saved design file (Ctrl+O)">Open file</button>
        </>
      )}
      {h.viewer && <button className="btn" onClick={h.saveCopy} title="Make your own copy in My designs, to change as you like">Save a copy</button>}
      <div className="grow" />
      <div className="pnav">
        <button className="btn icon" onClick={h.prev} aria-label="Previous page">‹</button>
        <div className="plabel" data-testid="page-label">{h.label}</div>
        <button className="btn icon" onClick={h.next} aria-label="Next page">›</button>
      </div>
      <div className="grow" />
      {!h.readOnly && (
        <ConfirmButton onConfirm={h.sync} title="Copy this page's layout, text and stickers to the other months">Apply design to all months</ConfirmButton>
      )}
      {h.framed ? (
        <span className="hint">Print from the downloaded file</span>
      ) : (
        <span style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={h.printOne}>Print page</button>
          <button className="btn" onClick={h.printAll}>Print all</button>
          <button className="btn" onClick={h.png}>PNG</button>
        </span>
      )}
      {h.cloud && <Presence />}
      {h.owner && <button className="btn" onClick={h.openShare} title="Share this design with people by email">Share</button>}
      <AccountMenu />
      {h.sharing && h.designId && <ShareDialog designId={h.designId} onClose={h.closeShare} />}
    </header>
  );
}
