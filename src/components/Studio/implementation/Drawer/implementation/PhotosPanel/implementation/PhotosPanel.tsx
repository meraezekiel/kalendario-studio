'use client';

import { usePhotosPanelHandler } from './usePhotosPanelHandler';

export default function PhotosPanel() {
  const { items, armed, upload, toggleArm, addToPage, remove, onDragStart } = usePhotosPanelHandler();
  return (
    <section>
      <h3>Your photos</h3>
      <button className="btn primary" onClick={upload} style={{ width: '100%', marginBottom: 10 }}>Upload photos</button>
      {items.length ? (
        <div className="tray" data-testid="tray">
          {items.map(({ id, i, src }) => (
            <div
              key={id}
              className={`t${armed === i ? ' armed' : ''}`}
              draggable
              onDragStart={(e) => onDragStart(e, id)}
              onClick={() => toggleArm(i)}
              role="button"
              aria-label={`Photo ${i + 1}${armed === i ? ', ready to place' : ''}`}
              style={{ backgroundImage: `url('${src}')` }}
            >
              <button className="x" aria-label="Remove photo" onClick={(e) => { e.stopPropagation(); remove(i); }}>✕</button>
              <button aria-label="Add to page" onClick={(e) => { e.stopPropagation(); addToPage(id); }}>+</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Photos you upload appear here. You can also drop files or paste an image straight onto the page.</div>
      )}
      <p className="hint" style={{ marginTop: 10 }}>
        Drag a photo onto a frame to fill it, onto a calendar day to put it in that box, or anywhere else to add it as a picture. On a phone, tap a photo, then tap where it goes.
      </p>
    </section>
  );
}
