'use client';

import Link from 'next/link';
import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import type { DesignRow } from '@/lib/cloud/designs';
import { useDesignCardHandler } from './useDesignCardHandler';

interface Props {
  design: DesignRow;
  onRename: (name: string) => void;
  onRemove: () => void;
}

/** One design in the My designs grid: preview, name, last edit, and (for its owner) rename and delete. */
export default function DesignCard({ design, onRename, onRemove }: Props) {
  const h = useDesignCardHandler(design, onRename);
  const href = `/d/${design.id}`;
  return (
    <article className="dcard" data-design-id={design.id}>
      <Link className="dcard-thumb" href={href} aria-label={`Open ${design.name}`}>
        {design.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- a small data: URL preview
          <img src={design.thumb} alt="" />
        ) : (
          <span className="dcard-blank">No preview yet</span>
        )}
      </Link>
      <div className="dcard-body">
        {h.editing ? (
          <input
            className="dcard-input"
            aria-label="Design name"
            autoFocus
            maxLength={80}
            value={h.draft}
            onChange={(e) => h.setDraft(e.target.value)}
            onKeyDown={h.onKeyDown}
            onBlur={h.commit}
          />
        ) : (
          <Link className="dcard-name" href={href} title={design.name}>{design.name}</Link>
        )}
        <div className="dcard-meta">
          <span>{h.edited}</span>
          {h.badge && <span className="dcard-badge">{h.badge}</span>}
        </div>
        {h.owner && (
          <div className="dcard-acts">
            <button type="button" className="btn" onClick={h.startRename}>Rename</button>
            <ConfirmButton className="btn danger" onConfirm={onRemove} confirmLabel="Click again to delete">Delete</ConfirmButton>
          </div>
        )}
      </div>
    </article>
  );
}
