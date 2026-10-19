'use client';

import Link from 'next/link';
import { useCloudBarHandler } from './useCloudBarHandler';

/** Cloud designs only: back to My designs, the design's name (editable by its owner) and the sync state. */
export default function CloudBar() {
  const h = useCloudBarHandler();
  if (!h.cloud) return null;
  return (
    <div className="cloudbar">
      <Link className="btn" href="/designs" title="Back to My designs">
        <span aria-hidden="true">‹</span> My designs
      </Link>
      <div className="cloud-id">
        {h.canRename ? (
          <input
            className="cloud-name"
            aria-label="Design name"
            maxLength={80}
            value={h.draft}
            onChange={(e) => h.setDraft(e.target.value)}
            onBlur={h.commit}
            onKeyDown={h.onKeyDown}
          />
        ) : (
          <span className="cloud-name ro" title={h.name}>{h.name}</span>
        )}
        <span className="sync" data-state={h.state} data-testid="sync-state" role="status" title={h.label}>
          {h.label}
        </span>
      </div>
    </div>
  );
}
