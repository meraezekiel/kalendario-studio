import type { ShopeePreview } from '../support/shopeeLink';
import { toBlob } from './photos';
import { supabase } from './supabase';

/** Admin only: a Shopee product's name and picture (as a file to upload), read by the server from its link. */
export async function fetchProductPreview(url: string): Promise<{ name: string; image: File | null }> {
  const { data } = await supabase().auth.getSession();
  const res = await fetch('/api/product-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ url }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<ShopeePreview> & { error?: string };
  if (!res.ok) throw new Error(body.error || 'Couldn’t read that Shopee link.');
  const blob = body.image ? toBlob(body.image) : null;
  return { name: body.name ?? '', image: blob ? new File([blob], 'product.jpg', { type: blob.type }) : null };
}
