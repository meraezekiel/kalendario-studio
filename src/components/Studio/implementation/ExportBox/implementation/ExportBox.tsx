'use client';

import PageView from '@/components/PageView/implementation/PageView';
import { useExportBoxHandler } from './useExportBoxHandler';

/** Offscreen copy of the current page used as the PNG source. */
export default function ExportBox() {
  const { ref, page } = useExportBoxHandler();
  if (!page) return null;
  return (
    <div ref={ref} className="export-box" aria-hidden>
      <PageView page={page} />
    </div>
  );
}
