import { useMemo } from 'react';
import { productImageUrl } from '@/lib/cloud/products';
import { formatPrice, priceAsOf } from '@/lib/support/products';
import { getSupport } from '@/lib/support/support';
import { useProductsStore } from '@/store/useProductsStore';

export function useSupportPanelHandler() {
  const support = useMemo(getSupport, []);
  const products = useProductsStore((s) => s.products);
  return {
    coffeeUrl: support.coffeeUrl,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      note: p.note,
      url: p.url.trim(),
      image: productImageUrl(p.image),
      price: formatPrice(p.price),
      asOf: p.price == null ? '' : priceAsOf(p.price_checked_at),
    })),
  };
}
