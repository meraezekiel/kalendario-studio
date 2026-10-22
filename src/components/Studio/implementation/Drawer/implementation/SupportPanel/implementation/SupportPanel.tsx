'use client';

import { useSupportPanelHandler } from './useSupportPanelHandler';

/** The Print Kit tab: things that help when printing at home (affiliate products), then a quiet coffee link. */
export default function SupportPanel() {
  const h = useSupportPanelHandler();
  return (
    <>
      {h.products.length > 0 && (
        <section>
          <h3>Print Kit</h3>
          <p className="hint" style={{ fontSize: 13 }}>Everything you need to print your calendar at home: stands, binding, paper and more.</p>
          <ul className="supplies" data-testid="supply-links">
            {h.products.map((p) => (
              <li key={p.id}>
                <a href={p.url} target="_blank" rel="noopener noreferrer sponsored" onClick={h.productClicked}>
                  {p.image ? <img src={p.image} alt="" width={64} height={64} /> : <span className="supply-noimg" aria-hidden="true" />}
                  <span className="supply-text">
                    <b>{p.name}</b>
                    {p.note && <span>{p.note}</span>}
                    {p.price && (
                      <span className="supply-price">
                        <strong>{p.price}</strong>
                        {p.asOf && <small>{p.asOf}</small>}
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="hint" data-testid="affiliate-note">Prices can change on Shopee. These are affiliate links, so buying through them costs you nothing extra.</p>
        </section>
      )}
      {h.designServiceUrl && (
        <section className="kit-service" data-testid="design-service">
          <b>Busy? I’ll design it for you.</b>
          <p className="hint">Send your logo, photos and details, and get a print-ready calendar for your business, family or giveaway.</p>
          <a className="btn primary" href={h.designServiceUrl} target="_blank" rel="noopener noreferrer" onClick={h.designServiceClicked}>
            Message me
          </a>
        </section>
      )}
      <section className="kit-foot">
        <p className="hint">Kalendaryo Studio is free to use, with no ads.{h.coffeeUrl || h.gcashQr ? ' If it saved you time, any amount keeps it going.' : ''}</p>
        {h.gcashQr && (
          <>
            <button type="button" className="btn kit-gcash" onClick={h.toggleQr} aria-expanded={h.qrOpen} data-testid="gcash-button">
              💙 Support the dev (GCash)
            </button>
            {h.qrOpen && (
              <figure className="kit-qr" data-testid="gcash-qr">
                <img src={h.gcashQr} alt="GCash QR code" />
                <figcaption className="hint">
                  Scan with GCash{h.gcashName ? ` · ${h.gcashName}` : ''}. Salamat po!
                </figcaption>
              </figure>
            )}
          </>
        )}
        {h.coffeeUrl && (
          <a className="btn coffee" href={h.coffeeUrl} target="_blank" rel="noopener noreferrer" data-testid="coffee-link">
            ☕ Buy me a coffee
          </a>
        )}
      </section>
    </>
  );
}
