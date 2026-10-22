import { useState } from 'react';
import { isShopeeUrl } from '@/lib/support/shopeeLink';

/** The "paste a Shopee link" box: pasting a link adds the product right away; typing one adds it on Enter or the button. */
export function useAddLinkHandler(addFromLink: (link: string) => Promise<boolean>) {
  const [draft, setDraft] = useState('');
  const submit = async (link: string) => {
    if (await addFromLink(link)) setDraft('');
  };
  return {
    draft,
    setDraft,
    onSubmit: (e: React.FormEvent) => {
      e.preventDefault();
      void submit(draft);
    },
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text').trim();
      if (!isShopeeUrl(text)) return;
      e.preventDefault();
      setDraft(text);
      void submit(text);
    },
  };
}
