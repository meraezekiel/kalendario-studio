import { useMemo, useState } from 'react';
import { productImageUrl } from '@/lib/cloud/products';
import { countEvent } from '@/lib/cloud/stats';
import { formatPrice, priceAsOf } from '@/lib/support/products';
import { getSupport } from '@/lib/support/support';
import { useProductsStore } from '@/store/useProductsStore';
import { orderPrints } from '@/store/actions';

export function useSupportPanelHandler() {
  const support = useMemo(getSupport, []);
  const products = useProductsStore((s) => s.products);
  const [qr, setQr] = useState(false);
  return {
    coffeeUrl: support.coffeeUrl,
    gcashQr: support.gcashQr,
    gcashName: support.gcashName,
    qrOpen: qr,
    toggleQr: () => {
      if (!qr) countEvent('gcash_open');
      setQr(!qr);
    },
    designServiceUrl: support.designServiceUrl,
    printOrderUrl: support.printOrderUrl,
    printShop: support.printShop,
    printShopPlace: support.printShopPlace,
    order: orderPrints,
    productClicked: () => countEvent('product_click'),
    designServiceClicked: () => countEvent('design_service_click'),
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
