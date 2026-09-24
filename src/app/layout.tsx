import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { MobileBookingBar } from '@/components/layout/mobile-booking-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { buildLocalBusinessSchema, buildMetadata, buildWebsiteSchema, safeJsonLd } from '@/lib/seo';

import './globals.css';

/**
 * Fonts are self-hosted (Cormorant Garamond for editorial headings, Jost for
 * the interface) so the site never waits on a third-party font CDN, works
 * offline and cannot leak visitor data to another domain.
 */
const cormorant = localFont({
  src: [
    { path: './fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/cormorant-garamond-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

const jost = localFont({
  src: [{ path: './fonts/jost-variable.woff2', weight: '300 700', style: 'normal' }],
  variable: '--font-jost',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fcfaf7',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="focus:bg-ink focus:text-ivory sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[2px] focus:px-4 focus:py-2.5 focus:text-sm"
        >
          Skip to main content
        </a>

        <SiteHeader />

        <main id="main" className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>

        <SiteFooter />
        <MobileBookingBar />

        <script
          type="application/ld+json"
          // Structured data from `src/lib/seo.ts` — safeJsonLd escapes `<`.
          dangerouslySetInnerHTML={{ __html: safeJsonLd(buildLocalBusinessSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(buildWebsiteSchema()) }}
        />
      </body>
    </html>
  );
}
