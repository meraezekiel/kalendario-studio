/**
 * ✏️ EDIT THIS FILE to set up your support links.
 *
 * - `coffeeUrl`: your Buy Me a Coffee page, e.g. 'https://buymeacoffee.com/yourname'.
 *   Leave it '' to hide the coffee button everywhere.
 * - `links`: printing supplies shown in the Support tab. Replace each `url` with your
 *   Shopee / Lazada affiliate link. Remove an item, or set its url to '', to hide it.
 *   An empty list hides the whole "Print supplies" section.
 * - `affiliate`: true shows the short "affiliate links" note. Keep it true once any
 *   link is an affiliate link (being upfront keeps people's trust).
 */
export interface SupportLink {
  title: string;
  note?: string;
  url: string;
}

export interface SupportConfig {
  coffeeUrl: string;
  links: SupportLink[];
  affiliate: boolean;
}

export const SUPPORT: SupportConfig = {
  coffeeUrl: '',
  affiliate: false,
  links: [
    { title: 'Desk calendar stand', note: 'For 8×5 in desk calendars', url: 'https://shopee.ph/search?keyword=desk%20calendar%20stand' },
    { title: 'Spiral binding / wire-o', note: 'For wall and desk calendars', url: 'https://shopee.ph/search?keyword=calendar%20wire%20binding' },
    { title: 'Photo paper (glossy)', note: 'A4 or 4R for photo calendars', url: 'https://shopee.ph/search?keyword=glossy%20photo%20paper%20a4' },
    { title: 'Matte cardstock', note: 'Thicker paper for wall calendars', url: 'https://shopee.ph/search?keyword=cardstock%20a4' },
    { title: 'Paper cutter / trimmer', note: 'Clean edges for mini 3×3 calendars', url: 'https://shopee.ph/search?keyword=paper%20trimmer' },
  ],
};
