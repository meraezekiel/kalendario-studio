import { useEffect, useRef, useState } from 'react';
import { productImageUrl } from '@/lib/cloud/products';
import { formatPrice, isProductUrl, parsePrice, priceAsOf, type Product } from '@/lib/support/products';
import { imageFiles, type ProductFields } from '../../useAdminProductsHandler';

type Field = 'name' | 'note' | 'price' | 'url';

/** A price as it sits in the box: "249", "1249.50". */
const priceText = (price: number | null) => (price == null ? '' : Number.isInteger(price) ? String(price) : price.toFixed(2));

const draftOf = (p: Product): Record<Field, string> => ({ name: p.name, note: p.note, price: priceText(p.price), url: p.url });

/**
 * One product on /admin/products. Each field saves when it loses focus (or on Enter); a picture can be
 * dropped on the image or picked by clicking it.
 */
export function useProductCardHandler(
  p: Product,
  save: (id: string, fields: ProductFields) => Promise<boolean>,
  setImage: (p: Product, file: File) => Promise<void>,
) {
  const [draft, setDraft] = useState(() => draftOf(p));
  const [problem, setProblem] = useState<Partial<Record<Field, string>>>({});
  const [state, setState] = useState<'' | 'saving' | 'saved'>('');
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const saved = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A saved product comes back from the database: take the fields it changed, and leave alone one
  // still being typed in (the save of another field can land while you're on the next one).
  const last = useRef(p);
  useEffect(() => {
    const was = draftOf(last.current);
    const now = draftOf(p);
    last.current = p;
    setDraft((d) => {
      const next = { ...d };
      for (const f of Object.keys(now) as Field[]) if (now[f] !== was[f]) next[f] = now[f];
      return next;
    });
  }, [p]);
  useEffect(() => () => void (saved.current && clearTimeout(saved.current)), []);

  const store = async (fields: ProductFields) => {
    setState('saving');
    const ok = await save(p.id, fields);
    setState(ok ? 'saved' : '');
    if (saved.current) clearTimeout(saved.current);
    if (ok) saved.current = setTimeout(() => setState(''), 1500);
  };

  const commit = (f: Field) => {
    const text = draft[f].trim();
    setProblem((x) => ({ ...x, [f]: undefined }));
    if (f === 'price') {
      const price = parsePrice(text);
      if (Number.isNaN(price)) return setProblem((x) => ({ ...x, price: 'Type a price like 249 or 1,249.50' }));
      setDraft((d) => ({ ...d, price: priceText(price) }));
      if (price !== p.price) void store({ price });
      return;
    }
    if (f === 'url' && text && !isProductUrl(text)) {
      return setProblem((x) => ({ ...x, url: 'Paste the https:// link from Shopee Affiliate (Custom Link)' }));
    }
    if (text !== p[f]) void store({ [f]: text });
  };

  const pick = async (files: FileList | File[] | null | undefined) => {
    const [file] = imageFiles(files);
    if (!file) return;
    setUploading(true);
    await setImage(p, file);
    setUploading(false);
  };

  return {
    draft,
    problem,
    state,
    over,
    uploading,
    picker,
    image: productImageUrl(p.image),
    priceLabel: formatPrice(p.price),
    asOf: priceAsOf(p.price_checked_at),
    incomplete: !p.name.trim() || !isProductUrl(p.url),
    edit: (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [f]: e.target.value })),
    blur: (f: Field) => () => commit(f),
    enter: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') e.currentTarget.blur();
    },
    /** The price is still right today: moves its "as of" date without changing it. */
    recheck: () => void store({ price_checked_at: new Date().toISOString() }),
    toggleHidden: () => void store({ hidden: !p.hidden }),
    openPicker: () => picker.current?.click(),
    picked: (e: React.ChangeEvent<HTMLInputElement>) => {
      void pick(e.target.files);
      e.target.value = '';
    },
    drop: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        void pick(e.dataTransfer.files);
      },
    },
  };
}
