'use client';

import { useThanksNoteHandler } from './useThanksNoteHandler';

/** A small, one-time note after the first export or print. Never blocks the editor and hides by itself. */
export default function ThanksNote() {
  const h = useThanksNoteHandler();
  if (!h.open) return null;
  return (
    <aside className="thanks" role="status" data-testid="thanks-note">
      <button className="thanks-x" aria-label="Close" onClick={h.close}>✕</button>
      <b>Your calendar is ready 🎉</b>
      <p>This is a free hobby project. If it helped, you can support it. Totally optional.</p>
      <div className="thanks-acts">
        {h.coffeeUrl && <a className="btn coffee" href={h.coffeeUrl} target="_blank" rel="noopener noreferrer" onClick={h.close}>☕ Buy me a coffee</a>}
        {h.hasLinks && <button className="btn" onClick={h.showSupplies}>Print supplies</button>}
      </div>
    </aside>
  );
}
