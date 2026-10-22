import { create } from 'zustand';
import { listProducts } from '@/lib/cloud/products';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { type Product, visibleProducts } from '@/lib/support/products';
import { previewProducts } from '@/lib/support/support';

interface ProductsState {
  /** The Print Kit products visitors see, in order; empty until loaded (or when there are none). */
  products: Product[];
  /** Reads them once per page load; a failure just leaves the section hidden. */
  load(): void;
}

let loading = false;

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  load() {
    if (loading) return;
    loading = true;
    const preview = previewProducts();
    if (preview) return set({ products: visibleProducts(preview) });
    if (!cloudEnabled()) return;
    listProducts().then(
      (list) => set({ products: visibleProducts(list) }),
      () => {},
    );
  },
}));
