'use client';

import Modal from '@/components/Modal/implementation/Modal';
import { useOrderDialogHandler } from './useOrderDialogHandler';

/** Order printed copies of this calendar from the print shop: a short form, then the order goes by Messenger. */
export default function OrderDialog() {
  const h = useOrderDialogHandler();
  if (!h.open || !h.orderUrl) return null;
  if (h.step === 'send') {
    return (
      <Modal
        title="Send your order"
        onClose={h.close}
        testId="order-dialog"
        actions={
          <>
            <button type="button" className="btn" onClick={h.back}>Back</button>
            <button type="button" className="btn" onClick={h.close}>Done</button>
          </>
        }
      >
        <ol className="order-steps">
          <li>
            <p>Save your design file. {h.shop} prints from it.</p>
            <button type="button" className="btn" onClick={h.saveFile} data-testid="order-save-file">
              {h.saved ? '✓ Saved ' : 'Save '}{h.file}
            </button>
          </li>
          <li>
            <p>Message {h.shop}: paste the order, then attach the file you saved.</p>
            <a className="btn primary" href={h.orderUrl} target="_blank" rel="noopener noreferrer" onClick={h.send} data-testid="order-send">
              {h.copied ? '✓ Order copied. Open Messenger' : 'Copy order & open Messenger'}
            </a>
          </li>
        </ol>
        <textarea className="order-text" readOnly value={h.message} rows={8} aria-label="Your order" onFocus={(e) => e.target.select()} data-testid="order-text" />
        <p className="hint">{h.shop} will reply with the price, how to pay and when it&apos;s ready.</p>
      </Modal>
    );
  }
  return (
    <Modal
      title={`Order prints from ${h.shop}`}
      onClose={h.close}
      testId="order-dialog"
      actions={
        <>
          <button type="button" className="btn" onClick={h.close}>Cancel</button>
          <button type="submit" form="order-form" className="btn primary">Next</button>
        </>
      }
    >
      <p className="hint">No printer? {h.shop}{h.place ? ` (${h.place})` : ''} prints your calendar for you.</p>
      <form id="order-form" className="order-form" onSubmit={h.next} noValidate>
        <div className="g2">
          <label className="f">
            Copies
            <input type="number" min={1} step={1} inputMode="numeric" value={h.order.copies || ''} onChange={(e) => h.setCopies(e.target.value)} />
          </label>
          <label className="f">
            Get it by
            <select value={h.order.delivery ? 'delivery' : 'pickup'} onChange={(e) => h.edit({ delivery: e.target.value === 'delivery' })}>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
          </label>
        </div>
        <label className="f">
          Your name
          <input type="text" autoComplete="name" value={h.order.name} onChange={(e) => h.edit({ name: e.target.value })} />
        </label>
        <label className="f">
          Contact number
          <input type="tel" autoComplete="tel" placeholder="09xx xxx xxxx" value={h.order.contact} onChange={(e) => h.edit({ contact: e.target.value })} />
        </label>
        {h.order.delivery && (
          <label className="f">
            Delivery address
            <textarea rows={2} autoComplete="street-address" value={h.order.address} onChange={(e) => h.edit({ address: e.target.value })} />
          </label>
        )}
        <label className="f">
          Notes (optional)
          <textarea rows={2} placeholder="e.g. spiral bound, needed by Dec 15" value={h.order.notes} onChange={(e) => h.edit({ notes: e.target.value })} />
        </label>
      </form>
      {h.error && <p className="auth-error" role="alert">{h.error}</p>}
    </Modal>
  );
}
