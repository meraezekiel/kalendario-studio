'use client';

import AddPanel from './AddPanel/implementation/AddPanel';
import PagesPanel from './PagesPanel/implementation/PagesPanel';
import PhotosPanel from './PhotosPanel/implementation/PhotosPanel';
import TemplatesPanel from './TemplatesPanel/implementation/TemplatesPanel';
import { useDrawerHandler } from './useDrawerHandler';

export default function Drawer() {
  const { tab } = useDrawerHandler();
  return (
    <aside className="drawer" aria-label={`${tab} panel`}>
      {tab === 'templates' && <TemplatesPanel />}
      {tab === 'add' && <AddPanel />}
      {tab === 'photos' && <PhotosPanel />}
      {tab === 'page' && <PagesPanel />}
    </aside>
  );
}
