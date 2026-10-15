import { useMemo } from 'react';
import { getSupport } from '@/lib/support/support';

export function useSupportPanelHandler() {
  const support = useMemo(getSupport, []);
  return { coffeeUrl: support.coffeeUrl, links: support.links, affiliate: support.affiliate };
}
