'use client';

import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import type { Product } from '@/lib/support/products';
import type { ProductFields } from '../../useAdminProductsHandler';
import { useProductCardHandler } from './useProductCardHandler';

interface Props {
  product: Product;
  /** Props for the drag handle (pointer drag and arrow keys). */
  handle: React.HTMLAttributes<HTMLButtonElement>;
  dragging: boolean;
  save: (id: string, fields: ProductFields) => Promise<boolean>;
  setImage: (p: Product, file: File) => Promise<void>;
  remove: (p: Product) => void;
}

/** One product on /admin/products: picture, name, price, note and Shopee link, all editable in place. */
export default function ProductCard({ product: p, handle, dragging, save, setImage, remove }: Props) {
  const h = useProductCardHandler(p, save, setImage);
  return (
    <div className={`product${dragging ? ' dragging' : ''}${p.hidden ? ' off' : ''}`} data-testid="product" data-name={p.name}>
      <button type="button" className="product-grip" aria-label={`Move ${p.name || 'product'} (drag, or use the arrow keys)`} title="Drag to reorder" {...handle}>
        ⋮⋮
      </button>
      <button
        type="button"
        className={`product-img${h.over ? ' over' : ''}`}
        onClick={h.openPicker}
        title="Drop a picture here, or click to choose one"
        data-testid="product-image"
        {...h.drop}
      >
        {h.image ? <img src={h.image} alt="" /> : <span>Drop a picture or click</span>}
        {h.uploading && <span className="product-img-busy">Uploading…</span>}
      </button>
      <input ref={h.picker} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={h.picked} data-testid="product-file" />
      <div className="product-fields">
        <label className="f">
          Name
          <input type="text" value={h.draft.name} onChange={h.edit('name')} onBlur={h.blur('name')} onKeyDown={h.enter} placeholder="e.g. Desk calendar stand" />
        </label>
        <div className="product-row">
          <label className="f product-price">
            Price (₱)
            <input type="text" inputMode="decimal" value={h.draft.price} onChange={h.edit('price')} onBlur={h.blur('price')} onKeyDown={h.enter} placeholder="e.g. 249" />
          </label>
          <label className="f">
            Note
            <input type="text" value={h.draft.note} onChange={h.edit('note')} onBlur={h.blur('note')} onKeyDown={h.enter} placeholder="Optional, e.g. for 8×5 in calendars" />
          </label>
        </div>
        {h.problem.price && <p className="auth-error">{h.problem.price}</p>}
        <label className="f">
          Shopee affiliate link
          <input type="text" inputMode="url" value={h.draft.url} onChange={h.edit('url')} onBlur={h.blur('url')} onKeyDown={h.enter} placeholder="https://s.shopee.ph/…" />
        </label>
        {h.problem.url && <p className="auth-error">{h.problem.url}</p>}
        <div className="product-foot">
          {h.priceLabel && (
            <span className="hint">
              {h.asOf}
              {' · '}
              <button type="button" className="linkish" onClick={h.recheck} title={`${h.priceLabel} is still the price on Shopee`}>
                Still {h.priceLabel} today
              </button>
            </span>
          )}
          {h.incomplete && !p.hidden && <span className="hint product-warn">Needs a name and a link to show</span>}
          <span className="grow" />
          {h.state && <span className="hint" role="status">{h.state === 'saving' ? 'Saving…' : 'Saved'}</span>}
          <label className="chk product-show">
            <input type="checkbox" checked={!p.hidden} onChange={h.toggleHidden} />
            Show
          </label>
          <ConfirmButton className="btn danger" onConfirm={() => remove(p)} confirmLabel="Click again to delete">
            Delete
          </ConfirmButton>
        </div>
      </div>
    </div>
  );
}
