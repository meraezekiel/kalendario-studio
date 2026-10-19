'use client';

import AddPanel from './AddPanel/implementation/AddPanel';
import GraphicsPanel from './GraphicsPanel/implementation/GraphicsPanel';
import PagesPanel from './PagesPanel/implementation/PagesPanel';
import PhotosPanel from './PhotosPanel/implementation/PhotosPanel';
import SupportPanel from './SupportPanel/implementation/SupportPanel';
import TemplatesPanel from './TemplatesPanel/implementation/TemplatesPanel';
import { useDrawerHandler } from './useDrawerHandler';

export default function Drawer() {
  const { tab, readOnly } = useDrawerHandler();
  return (
    <aside className="drawer" aria-label={`${tab} panel`}>
      {/* A view-only design: nothing here may add to it (the Pages tab disables its own editing parts). */}
      <fieldset className="edit-lock" disabled={readOnly && tab !== 'page' && tab !== 'support'}>
        {tab === 'templates' && <TemplatesPanel />}
        {tab === 'add' && <AddPanel />}
        {tab === 'graphics' && <GraphicsPanel />}
        {tab === 'photos' && <PhotosPanel />}
        {tab === 'page' && <PagesPanel />}
        {tab === 'support' && <SupportPanel />}
      </fieldset>
    </aside>
  );
}
