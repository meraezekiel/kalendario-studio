'use client';

import { useCloudBannerHandler } from './useCloudBannerHandler';

/**
 * In a cloud design (`cloud`) whose access went while it was open: says so and offers a copy. On the
 * local editor, signed in: offers to save this browser's calendar to My designs.
 */
export default function CloudBanner({ cloud }: { cloud: boolean }) {
  const { lost, offer } = useCloudBannerHandler(cloud);
  if (lost.lost) {
    return (
      <aside className="cloud-banner" role="alert" data-testid="cloud-banner">
        <b>You no longer have access to this design.</b>
        <div className="thanks-acts">
          <button className="btn primary" onClick={lost.copy} disabled={lost.saving}>Save as a copy in My designs</button>
          <button className="btn" onClick={lost.close} disabled={lost.saving}>Close</button>
        </div>
      </aside>
    );
  }
  if (!offer.open) return null;
  return (
    <aside className="cloud-banner" role="status" data-testid="cloud-banner">
      <b>Keep this calendar on every computer?</b>
      <p>{offer.progress ?? 'Save it to My designs and open it wherever you sign in. This browser keeps its copy too.'}</p>
      <div className="thanks-acts">
        <button className="btn primary" onClick={offer.save} disabled={!!offer.progress}>Save to My designs</button>
        <button className="btn" onClick={offer.later} disabled={!!offer.progress}>Not now</button>
      </div>
    </aside>
  );
}
