import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kalendaryo Studio',
  description: 'Design and print your own photo calendars, right in the browser.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Caveat:wght@600;700&family=Cormorant+Garamond:wght@600;700&family=Dancing+Script:wght@600;700&family=Figtree:wght@400;500;600;700&family=Fredoka:wght@400;500;600;700&family=Lilita+One&family=Montserrat:wght@400;600;800&family=Pacifico&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;500;600;700;800&family=Roboto+Condensed:wght@600;700&display=swap';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* CORS mode lets the PNG exporter read the font rules instead of failing on a cross-origin stylesheet. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS_URL} crossOrigin="anonymous" />
        <style id="pagesize">{'@page{size:210mm 297mm;margin:0}'}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
