import { readImage } from '../calendar/samplePhoto';
import type { Product } from '../support/products';
import { toBlob } from './photos';
import { supabase } from './supabase';
import { toCloudError } from './transport';

const BUCKET = 'products';
/** Product pictures are shown small; this keeps each one well under the bucket's 1 MB limit. */
const IMAGE_MAX_PX = 600;
const IMAGE_QUALITY = 0.85;

const COLUMNS = 'id, name, note, price, price_checked_at, url, image, position, hidden';

async function run<T>(call: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let res: { data: T; error: unknown };
  try {
    res = await call;
  } catch (e) {
    throw toCloudError(e);
  }
  if (res.error) throw toCloudError(res.error);
  return res.data;
}

/** Postgres numeric can arrive as a string; the app wants a number. */
const fromRow = (r: Product): Product => ({ ...r, price: r.price == null ? null : Number(r.price) });

/** Every product this user may see, in order: the visible ones for visitors, all of them for the admin. */
export async function listProducts(): Promise<Product[]> {
  const rows = (await run(supabase().from('products').select(COLUMNS).order('position').order('created_at'))) as Product[];
  return (rows ?? []).map(fromRow);
}

/** Admin only: a new, empty product at the end of the list. */
export async function addProduct(fields: Partial<Omit<Product, 'id'>> = {}): Promise<Product> {
  return fromRow((await run(supabase().from('products').insert(fields).select(COLUMNS).single())) as Product);
}

/** Admin only: changes some of a product's fields and returns it as stored (with its new price date). */
export async function updateProduct(id: string, fields: Partial<Omit<Product, 'id'>>): Promise<Product> {
  return fromRow((await run(supabase().from('products').update(fields).eq('id', id).select(COLUMNS).single())) as Product);
}

/** Admin only: deletes a product and its picture. */
export async function deleteProduct(p: Product): Promise<void> {
  await run(supabase().from('products').delete().eq('id', p.id));
  if (p.image && !isFullUrl(p.image)) await removeProductImage(p.image);
}

/** Admin only: saves the drag-and-drop order. */
export async function reorderProducts(ids: string[]): Promise<void> {
  await run(supabase().rpc('reorder_products', { ids }));
}

/** Admin only: shrinks a picked picture and stores it; returns its storage path. */
export async function uploadProductImage(file: File): Promise<string> {
  const asset = await readImage(file, IMAGE_MAX_PX, IMAGE_QUALITY, true);
  const blob = toBlob(asset.src);
  const path = `${crypto.randomUUID()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`;
  await run(supabase().storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' }));
  return path;
}

/** Admin only: removes a stored picture (best effort: a leftover file only takes space). */
export async function removeProductImage(path: string): Promise<void> {
  try {
    await supabase().storage.from(BUCKET).remove([path]);
  } catch {
    /* ignore */
  }
}

const isFullUrl = (s: string) => /^https?:\/\//i.test(s);

/** The address of a product's picture. */
export function productImageUrl(image: string | null): string | null {
  if (!image) return null;
  if (isFullUrl(image)) return image;
  return supabase().storage.from(BUCKET).getPublicUrl(image).data.publicUrl;
}
