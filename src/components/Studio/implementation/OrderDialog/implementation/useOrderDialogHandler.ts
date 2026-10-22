import { useMemo, useState } from 'react';
import { designFileName } from '@/lib/calendar/designFile';
import { countEvent } from '@/lib/cloud/stats';
import { describeDesign, EMPTY_ORDER, orderMessage, orderProblem, type PrintOrder } from '@/lib/support/order';
import { getSupport } from '@/lib/support/support';
import { saveDesignFile } from '@/store/actions';
import { toast, useStudioStore } from '@/store/useStudioStore';

/**
 * "Order prints": the customer fills in copies, pickup or delivery and how to reach them, then saves the
 * design file and sends the order to the print shop's Messenger with the file attached.
 */
export function useOrderDialogHandler() {
  const open = useStudioStore((s) => s.ordering);
  const doc = useStudioStore((s) => s.doc);
  const support = useMemo(getSupport, []);
  const [order, setOrder] = useState<PrintOrder>(EMPTY_ORDER);
  const [step, setStep] = useState<'form' | 'send'>('form');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const file = designFileName(doc);
  const message = orderMessage(order, describeDesign(doc), support.printShop, file);

  const close = () => {
    useStudioStore.getState().set({ ordering: false });
    setStep('form');
    setError('');
    setSaved(false);
    setCopied(false);
  };
  const edit = (patch: Partial<PrintOrder>) => {
    setOrder((o) => ({ ...o, ...patch }));
    setError('');
  };

  return {
    open,
    shop: support.printShop,
    place: support.printShopPlace,
    orderUrl: support.printOrderUrl,
    order,
    step,
    error,
    file,
    message,
    saved,
    copied,
    close,
    edit,
    setCopies: (v: string) => edit({ copies: v === '' ? 0 : Number(v) }),
    next: (e?: React.FormEvent) => {
      e?.preventDefault();
      const problem = orderProblem(order);
      if (problem) return setError(problem);
      setStep('send');
    },
    back: () => setStep('form'),
    saveFile: async () => {
      await saveDesignFile();
      setSaved(true);
    },
    /** Copies the order before the Messenger tab takes focus (clipboard writes need a focused page). */
    send: () => {
      countEvent('print_order');
      navigator.clipboard?.writeText(message).then(
        () => setCopied(true),
        () => toast('Could not copy. Select the order text and copy it yourself.'),
      );
    },
  };
}
