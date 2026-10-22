import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProductPreview } from '@/lib/cloud/productPreview';
import { addProduct, deleteProduct, listProducts, removeProductImage, reorderProducts, updateProduct, uploadProductImage } from '@/lib/cloud/products';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { moveItem, type Product } from '@/lib/support/products';
import { isShopeeUrl } from '@/lib/support/shopeeLink';
import { useAuthStore } from '@/store/useAuthStore';

export type ProductFields = Partial<Omit<Product, 'id'>>;

/** Picture files among dropped or picked files. */
export const imageFiles = (files: FileList | File[] | null | undefined) => [...(files ?? [])].filter((f) => /^image\/(jpeg|png|webp|gif)$/.test(f.type));

/** The /admin/products page: the admin's list of affiliate products for the Print Kit tab. */
export function useAdminProductsHandler() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const ready = useAuthStore((s) => s.ready);
  const admin = useAuthStore((s) => s.admin);
  const [list, setList] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const listRef = useRef<Product[]>([]);
  listRef.current = list ?? [];

  useEffect(() => useAuthStore.getState().init(), []);

  const load = useCallback(async () => {
    try {
      setList(await listProducts());
    } catch {
      setError('Could not load the products. Check your connection and try again.');
      setList((v) => v ?? []);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      if (!useAuthStore.getState().leaving) router.replace(`/login?next=${encodeURIComponent('/admin/products')}`);
      return;
    }
    if (admin) void load();
  }, [ready, userId, admin, router, load]);

  const replace = (p: Product) => setList((l) => l?.map((x) => (x.id === p.id ? p : x)) ?? l);

  /** Adds products at the end: one per picture, or one empty product when there are none. */
  const add = async (files: File[] = []) => {
    setError('');
    setAdding(true);
    let position = listRef.current.reduce((n, p) => Math.max(n, p.position), 0);
    try {
      for (const file of files.length ? files : [null]) {
        const image = file ? await uploadProductImage(file) : null;
        const name = file ? file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() : '';
        const p = await addProduct({ position: ++position, image, name });
        setList((l) => [...(l ?? []), p]);
      }
    } catch {
      setError('Could not add the product. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  /** Adds a product from its Shopee link: the name and picture come from Shopee, the price is typed after. */
  const addFromLink = async (link: string): Promise<boolean> => {
    setError('');
    if (!isShopeeUrl(link)) {
      setError('Paste a Shopee link, like https://s.shopee.ph/…');
      return false;
    }
    setAdding(true);
    const position = listRef.current.reduce((n, p) => Math.max(n, p.position), 0) + 1;
    let found: { name: string; image: File | null } = { name: '', image: null };
    try {
      found = await fetchProductPreview(link);
    } catch {
      setError('Couldn’t read the name and picture from Shopee, so the product was added with just its link. Fill in the rest below.');
    }
    try {
      const image = found.image ? await uploadProductImage(found.image).catch(() => null) : null;
      const p = await addProduct({ position, name: found.name, url: link.trim(), image });
      setList((l) => [...(l ?? []), p]);
      return true;
    } catch {
      setError('Could not add the product. Please try again.');
      return false;
    } finally {
      setAdding(false);
    }
  };

  /** Saves some fields of one product (showing them at once); returns whether it worked. */
  const save = async (id: string, fields: ProductFields): Promise<boolean> => {
    setError('');
    const before = listRef.current.find((p) => p.id === id);
    if (before) replace({ ...before, ...fields });
    try {
      replace(await updateProduct(id, fields));
      return true;
    } catch {
      if (before) replace(before);
      setError('Could not save that change. Please try again.');
      return false;
    }
  };

  /** Puts a new picture on a product, then removes the old one. */
  const setImage = async (p: Product, file: File) => {
    setError('');
    try {
      const image = await uploadProductImage(file);
      if (await save(p.id, { image })) {
        if (p.image) await removeProductImage(p.image);
      } else {
        await removeProductImage(image);
      }
    } catch {
      setError('Could not upload that picture. Use a JPG or PNG and try again.');
    }
  };

  const remove = async (p: Product) => {
    setError('');
    try {
      await deleteProduct(p);
      setList((l) => l?.filter((x) => x.id !== p.id) ?? l);
    } catch {
      setError('Could not delete that product. Please try again.');
    }
  };

  /** Moves one product to a new place in the list and saves the order. */
  const move = async (from: number, to: number) => {
    const next = moveItem(listRef.current, from, to);
    if (next === listRef.current) return;
    setList(next.map((p, i) => ({ ...p, position: i + 1 })));
    try {
      await reorderProducts(next.map((p) => p.id));
    } catch {
      setError('Could not save the new order. Please try again.');
      await load();
    }
  };

  const shown = list?.filter((p) => !p.hidden).length ?? 0;
  return {
    enabled: cloudEnabled(),
    signedIn: !!userId,
    admin,
    list,
    error,
    adding,
    summary: list ? `${list.length} product${list.length === 1 ? '' : 's'} · ${shown} shown in the Print Kit` : '',
    add,
    addFromLink,
    save,
    setImage,
    remove,
    move,
  };
}
