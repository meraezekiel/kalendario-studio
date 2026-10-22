/**
 * Reads a Shopee product's name and picture from its link, the way chat apps build link previews.
 * Shopee doesn't show the price there (only its Open API does), so the admin still types that.
 * Runs on the server: the browser can't read shopee.ph pages.
 */

/** Chat-app previews get the product's name and picture; ordinary browsers get an empty app shell. */
const PREVIEW_AGENT = 'WhatsApp/2.23';
/** Short links only redirect to the product page for browsers (previews get a cut-off name instead). */
const BROWSER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MAX_HOPS = 5;
const MAX_IMAGE_BYTES = 3_000_000;

export interface ShopeePreview {
  name: string;
  /** The picture as a data: URL, or null when there's none. */
  image: string | null;
}

const hostIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** Only Shopee's own https links (short links included) are fetched, never other sites. */
export function isShopeeUrl(link: string) {
  try {
    const u = new URL(link.trim());
    return u.protocol === 'https:' && (hostIs(u.hostname, 'shopee.ph') || hostIs(u.hostname, 'shp.ee'));
  } catch {
    return false;
  }
}

/** Shopee serves product pictures from susercontent.com. */
const isShopeeImage = (link: string) => {
  try {
    const u = new URL(link);
    return u.protocol === 'https:' && hostIs(u.hostname, 'susercontent.com');
  } catch {
    return false;
  }
};

/** The shop and item numbers in a product address (…-i.SHOP.ITEM, /product/SHOP/ITEM or /shopname/SHOP/ITEM). */
export function shopeeItem(link: string): { shop: string; item: string } | null {
  try {
    const { pathname } = new URL(link);
    const m = /-i\.(\d+)\.(\d+)$/.exec(pathname) ?? /^\/[^/]+\/(\d+)\/(\d+)\/?$/.exec(pathname);
    return m ? { shop: m[1], item: m[2] } : null;
  } catch {
    return null;
  }
}

const decode = (s: string) =>
  s.replace(/&(amp|quot|#39|#x27|lt|gt);/g, (_, e: string) => ({ amp: '&', quot: '"', '#39': "'", '#x27': "'", lt: '<', gt: '>' })[e] ?? '');

/** An `og:` value from a page's meta tags (attributes in either order). */
export function metaOf(html: string, prop: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const p = /\bproperty=["']([^"']+)["']/i.exec(tag)?.[1];
    const c = /\bcontent=["']([^"']*)["']/i.exec(tag)?.[1];
    if (p === prop && c !== undefined) return decode(c).trim();
  }
  return '';
}

/** "Ring binder … | Shopee Philippines" → "Ring binder …". */
export function cleanName(title: string) {
  return title.replace(/\s*\|\s*Shopee\s+Philippines\s*$/i, '').replace(/\s+/g, ' ').trim();
}

/** Fetches a Shopee page, following redirects only while they stay on Shopee; returns its final address and HTML. */
async function fetchPage(link: string, agent: string, body = true) {
  let url = link;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!isShopeeUrl(url)) throw new Error('That link leaves Shopee.');
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(8000) });
    const next = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Shopee answered ${res.status}.`);
    if (!body) await res.body?.cancel();
    return { url, html: body ? await res.text() : '' };
  }
  throw new Error('Too many redirects.');
}

async function fetchImage(link: string): Promise<string | null> {
  if (!isShopeeImage(link)) return null;
  const res = await fetch(link, { signal: AbortSignal.timeout(8000) });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) return null;
  return `data:${type};base64,${bytes.toString('base64')}`;
}

/** The product's name and picture from its Shopee link. Throws when the link can't be read. */
export async function shopeePreview(link: string): Promise<ShopeePreview> {
  link = link.trim();
  // The product's own page has its whole name; a short link's preview cuts it off.
  const item = shopeeItem(link) ?? shopeeItem((await fetchPage(link, BROWSER_AGENT, false).catch(() => ({ url: link }))).url);
  let name = '';
  let image = '';
  if (item) {
    try {
      const page = await fetchPage(`https://shopee.ph/product/${item.shop}/${item.item}`, PREVIEW_AGENT);
      name = cleanName(metaOf(page.html, 'og:title'));
      image = metaOf(page.html, 'og:image');
    } catch {
      /* fall back to the link's own preview */
    }
  }
  if (!name || !image) {
    const page = await fetchPage(link, PREVIEW_AGENT);
    name ||= cleanName(metaOf(page.html, 'og:title'));
    image ||= metaOf(page.html, 'og:image');
  }
  if (!name && !image) throw new Error('No product found at that link.');
  return { name, image: image ? await fetchImage(image).catch(() => null) : null };
}
