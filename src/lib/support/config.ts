/**
 * ✏️ EDIT THIS FILE to set up your support links.
 *
 * - `coffeeUrl`: your Buy Me a Coffee page, e.g. 'https://buymeacoffee.com/yourname'.
 *   Leave it '' to hide the coffee button everywhere.
 * - `gcashQr`: your GCash QR code, saved in /public (e.g. '/gcash-qr.png'), and `gcashName` the name
 *   GCash shows when it's scanned, so people know it's really you. Leave gcashQr '' to hide "Support the dev".
 * - `designServiceUrl`: where people message you to have a calendar designed for them, e.g.
 *   'https://m.me/yourpage'. Leave it '' to hide the "I'll design it for you" offer.
 *
 * The Print Kit products (affiliate links with a picture and price) aren't set here: the admin
 * manages them at /admin/products. With no products, coffee page, GCash QR or design service, the Print Kit tab stays hidden.
 */
export interface SupportConfig {
  coffeeUrl: string;
  gcashQr: string;
  gcashName: string;
  designServiceUrl: string;
}

export const SUPPORT: SupportConfig = {
  coffeeUrl: '',
  gcashQr: '/gcash-qr.png',
  gcashName: '',
  designServiceUrl: 'https://m.me/100089328967349',
};
