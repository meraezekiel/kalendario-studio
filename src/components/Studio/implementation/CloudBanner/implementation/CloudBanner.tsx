'use client';

import { useCloudBannerHandler } from './useCloudBannerHandler';

/** On the local editor, signed in: offers to save this browser's calendar to My designs. */
export default function CloudBanner() {
  const h = useCloudBannerHandler();
  if (!h.open) return null;
  return (
    <aside className="cloud-banner" role="status" data-testid="cloud-banner">
      <b>Keep this calendar on every computer?</b>
      <p>{h.progress ?? 'Save it to My designs and open it wherever you sign in. This browser keeps its copy too.'}</p>
      <div className="thanks-acts">
        <button className="btn primary" onClick={h.save} disabled={!!h.progress}>Save to My designs</button>
        <button className="btn" onClick={h.later} disabled={!!h.progress}>Not now</button>
      </div>
    </aside>
  );
}
