'use client';

import { useSupportPanelHandler } from './useSupportPanelHandler';

/** Optional ways to support the project. Only shown when someone opens the Support tab. */
export default function SupportPanel() {
  const h = useSupportPanelHandler();
  return (
    <>
      <section>
        <h3>Support</h3>
        <p className="hint" style={{ fontSize: 13 }}>
          Kalendaryo Studio is a free hobby project. No ads, no sign-up, and your designs stay in your browser. Everything here is optional.
        </p>
        {h.coffeeUrl && (
          <a className="btn coffee" href={h.coffeeUrl} target="_blank" rel="noopener noreferrer" data-testid="coffee-link">
            ☕ Buy me a coffee
          </a>
        )}
      </section>
      {h.links.length > 0 && (
        <section>
          <h3>Print supplies</h3>
          <p className="hint">Things that help when printing your calendar at home.</p>
          <ul className="supplies" data-testid="supply-links">
            {h.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer sponsored">
                  <b>{l.title}</b>
                  {l.note && <span>{l.note}</span>}
                </a>
              </li>
            ))}
          </ul>
          {h.affiliate && (
            <p className="hint" data-testid="affiliate-note">Some of these are affiliate links: I may earn a small commission at no extra cost to you. It helps keep this tool free.</p>
          )}
        </section>
      )}
    </>
  );
}
