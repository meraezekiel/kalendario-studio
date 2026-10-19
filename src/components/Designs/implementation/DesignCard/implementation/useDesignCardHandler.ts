import { useState, type KeyboardEvent } from 'react';
import type { DesignRow } from '@/lib/cloud/designs';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** "just now", "5 minutes ago", "yesterday", … */
export function relativeTime(iso: string, now = Date.now()): string {
  const secs = Math.round((new Date(iso).getTime() - now) / 1000);
  if (!Number.isFinite(secs) || Math.abs(secs) < 60) return 'just now';
  const fmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(secs) >= size) return fmt.format(Math.round(secs / size), unit);
  }
  return 'just now';
}

const ROLE_LABEL = { owner: '', editor: 'Can edit', viewer: 'Can view' } as const;

export function useDesignCardHandler(design: DesignRow, onRename: (name: string) => void) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(design.name);

  const startRename = () => {
    setDraft(design.name);
    setEditing(true);
  };
  const commit = () => {
    if (!editing) return;
    setEditing(false);
    onRename(draft);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit();
    else if (e.key === 'Escape') setEditing(false);
  };

  return {
    owner: design.role === 'owner',
    badge: ROLE_LABEL[design.role],
    edited: `Edited ${relativeTime(design.updated_at)}`,
    editing,
    draft,
    setDraft,
    startRename,
    commit,
    onKeyDown,
  };
}
