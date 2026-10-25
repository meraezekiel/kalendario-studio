'use client';

import { usePhotosPanelHandler } from './usePhotosPanelHandler';

export default function PhotosPanel() {
  const { items, others, showLibrary, armed, upload, toggleArm, addToPage, setAsBackground, remove, addFromLibrary, deleteFromLibrary, onDragStart } = usePhotosPanelHandler();
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
              style={src ? { backgroundImage: `url('${src}')` } : undefined}
            >
              <button className="x" aria-label="Remove photo" onClick={(e) => { e.stopPropagation(); remove(i); }}>✕</button>
              <button aria-label="Add to page" title="Add to page" onClick={(e) => { e.stopPropagation(); addToPage(id); }}>+</button>
              <button className="bgb" aria-label="Use as background" title="Use as background" onClick={(e) => { e.stopPropagation(); setAsBackground(id); }}>▣</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Photos you upload appear here. You can also drop files or paste an image straight onto the page.</div>
      )}
      <p className="hint" style={{ marginTop: 10 }}>
        Drag a photo onto a frame to fill it, onto a calendar day to put it in that box, or anywhere else to add it as a picture. Press ▣ to use it as the page&apos;s background image. On a phone, tap a photo, then tap where it goes.
      </p>
      {showLibrary && others.length > 0 && (
        <>
          <h3 style={{ marginTop: 18 }}>More of your photos</h3>
          <div className="tray" data-testid="library">
            {others.map(({ photo, url, deleting }, k) => (
              <div
                key={photo.src}
                className="t"
                role="button"
                aria-label={`Add photo ${k + 1} to this design`}
                title="Add to this design"
                onClick={() => addFromLibrary(photo)}
                style={url ? { backgroundImage: `url('${url}')`, cursor: 'pointer' } : { cursor: 'pointer' }}
              >
                <button
                  className={`x${deleting ? ' sure' : ''}`}
                  aria-label={deleting ? 'Delete for good' : 'Delete photo'}
                  title={deleting ? 'Press again to delete for good' : 'Delete photo'}
                  onClick={(e) => { e.stopPropagation(); deleteFromLibrary(photo); }}
                >
                  {deleting ? '🗑' : '✕'}
                </button>
                <button aria-label="Add to this design" title="Add to this design" onClick={(e) => { e.stopPropagation(); addFromLibrary(photo); }}>+</button>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Photos from your other designs. Adding one here doesn&apos;t use any more of your photo space. ✕ deletes a photo for good (only once no design uses it).
          </p>
        </>
      )}
    </section>
  );
}
