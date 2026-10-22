import { createClient } from '@supabase/supabase-js';
import { isShopeeUrl, shopeePreview } from '@/lib/support/shopeeLink';

/** Admin only: POST { url } → { name, image }, read from a Shopee product link for /admin/products. */
export async function POST(req: Request) {
  const token = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return Response.json({ error: 'Accounts aren’t set up on this site.' }, { status: 503 });
  if (!token) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  // Asks the database as this user, so only the admin gets through (and nobody can use this to fetch pages).
  const db = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: admin } = await db.rpc('is_admin');
  if (admin !== true) return Response.json({ error: 'This is for the site admin.' }, { status: 403 });

  const link = String(((await req.json().catch(() => ({}))) as { url?: unknown }).url ?? '');
  if (!isShopeeUrl(link)) return Response.json({ error: 'Paste a Shopee link (https://s.shopee.ph/… or https://shopee.ph/…).' }, { status: 400 });
  try {
    return Response.json(await shopeePreview(link));
  } catch {
    return Response.json({ error: 'Couldn’t read that Shopee link.' }, { status: 502 });
  }
}
