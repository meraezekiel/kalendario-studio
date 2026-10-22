'use client';

import Link from 'next/link';
import AccountMenu from '@/components/Studio/implementation/AccountMenu/implementation/AccountMenu';
import { useDragReorderHandler } from './handler/useDragReorderHandler';
import ProductCard from './ProductCard/implementation/ProductCard';
import { useAddLinkHandler } from './handler/useAddLinkHandler';
import { useAddZoneHandler } from './handler/useAddZoneHandler';
import { useAdminProductsHandler } from './useAdminProductsHandler';

/** The /admin/products page: the affiliate products shown in the Print Kit tab, to add, edit, reorder and hide. */
export default function AdminProducts() {
  const h = useAdminProductsHandler();
  const list = h.list ?? [];
  const drag = useDragReorderHandler(list.length, (from, to) => void h.move(from, to));
  const zone = useAddZoneHandler(h.add);
  const link = useAddLinkHandler(h.addFromLink);
  if (!h.enabled || (h.signedIn && !h.admin)) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">Kalendaryo Studio</div>
          <p className="hint">{h.enabled ? 'This page is for the site admin.' : 'Accounts aren’t set up on this site.'}</p>
          <Link className="btn primary auth-wide" href="/">Back to the editor</Link>
        </div>
      </main>
    );
  }
  if (!h.signedIn) return <div className="boot">Loading Kalendaryo Studio…</div>;
  return (
    <div className="designs-page">
      <header className="top">
        <Link className="brand" href="/">Kalendaryo Studio</Link>
        <div className="grow" />
        <AccountMenu />
      </header>
      <main className="designs-main">
        <nav className="admin-tabs">
          <Link href="/admin">Accounts</Link>
          <Link href="/admin/products" aria-current="page">Products</Link>
          <Link href="/admin/stats">Stats</Link>
        </nav>
        <h1 className="admin-title">Print Kit</h1>
        <p className="hint admin-summary">
          {h.summary ? `${h.summary}. ` : ''}Changes show in the editor’s Print Kit tab right away. Drag ⋮⋮ to change the order.
        </p>
        {h.error && <p className="auth-error" role="alert">{h.error}</p>}
        {!h.list ? (
          <p className="hint">Loading products…</p>
        ) : (
          <>
            <ul className="products">
              {list.map((p, i) => (
                <li key={p.id} ref={drag.rowRef(i)} style={drag.styleOf(i)} className={drag.dragging === null ? '' : 'moving'}>
                  <ProductCard product={p} handle={drag.handle(i)} dragging={drag.dragging === i} save={h.save} setImage={h.setImage} remove={h.remove} />
                </li>
              ))}
            </ul>
            <form className="product-link" onSubmit={link.onSubmit} data-testid="product-link">
              <label className="f">
                Add from a Shopee link
                <span className="product-link-row">
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="Paste a link, e.g. https://s.shopee.ph/…"
                    value={link.draft}
                    onChange={(e) => link.setDraft(e.target.value)}
                    onPaste={link.onPaste}
                    disabled={h.adding}
                  />
                  <button type="submit" className="btn primary" disabled={h.adding || !link.draft.trim()}>
                    {h.adding ? 'Adding…' : 'Add'}
                  </button>
                </span>
              </label>
              <p className="hint">The name and picture come from Shopee. Then type the price: Shopee doesn’t share it.</p>
            </form>
            <div
              className={`product-add${zone.over ? ' over' : ''}`}
              data-testid="product-add"
              {...zone.drop}
            >
              <p>{h.adding ? 'Adding…' : 'Drop product pictures here to add them, one product each'}</p>
              <div className="product-add-acts">
                <button type="button" className="btn primary" onClick={() => void h.add()} disabled={h.adding}>
                  + Add product
                </button>
                <button type="button" className="btn" onClick={zone.openPicker} disabled={h.adding}>
                  Choose pictures…
                </button>
              </div>
              <input ref={zone.picker} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={zone.picked} data-testid="product-add-files" />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
