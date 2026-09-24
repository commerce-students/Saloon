import type { Metadata } from 'next';

import { clinic, clinicLocationLine, siteUrl } from '@/config/clinic';

/**
 * Technical SEO helpers.
 *
 * Titles read naturally with "Muscat" / "Oman" rather than stuffing keywords.
 * Structured data is generated from the clinic config, so as soon as the real
 * address and phone number are provided the markup becomes complete — nothing
 * is invented in the meantime.
 */

export function absoluteUrl(path = '/'): string {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

const description =
  'Book your appointment online at Chic by Sisters Clinic, a premium women’s aesthetics and beauty clinic in Muscat, Oman. Choose your treatment, pick a time and confirm in under a minute.';

export function buildMetadata(overrides: Metadata = {}): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: 'Chic by Sisters Clinic — Book an Appointment in Muscat',
      template: '%s | Chic by Sisters Clinic',
    },
    description,
    applicationName: clinic.name,
    keywords: [
      'Chic by Sisters Clinic',
      'women’s clinic Muscat',
      'beauty clinic Oman',
      'book appointment Muscat',
      'aesthetics clinic Muscat',
    ],
    authors: [{ name: clinic.name }],
    creator: clinic.name,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: clinic.name,
      locale: 'en_OM',
      url: siteUrl,
      title: 'Chic by Sisters Clinic — Book an Appointment in Muscat',
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Chic by Sisters Clinic — Book an Appointment in Muscat',
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    formatDetection: { telephone: true },
    ...overrides,
  };
}

/**
 * schema.org `BeautySalon` markup. Address, telephone and social profiles are
 * only emitted when the clinic has supplied them — the block degrades cleanly
 * instead of publishing placeholder contact details as fact.
 */
export function buildLocalBusinessSchema(): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    '@id': `${siteUrl}/#clinic`,
    name: clinic.name,
    url: siteUrl,
    description: clinic.tagline,
    areaServed: [
      { '@type': 'City', name: 'Muscat' },
      { '@type': 'Country', name: 'Oman' },
    ],
    address: {
      '@type': 'PostalAddress',
      ...(clinic.address ? { streetAddress: clinic.address } : {}),
      addressLocality: clinic.city,
      addressCountry: clinic.countryCode,
    },
    currenciesAccepted: 'OMR',
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/book`,
        inLanguage: 'en',
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      result: { '@type': 'Reservation', name: 'Appointment' },
    },
  };

  if (clinic.phone) schema.telephone = clinic.phone;
  if (clinic.email) schema.email = clinic.email;
  if (clinic.social.instagram) schema.sameAs = [clinic.social.instagram];

  return schema;
}

export function buildWebsiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: clinic.name,
    url: siteUrl,
    inLanguage: 'en',
    description: `${clinic.name} — ${clinicLocationLine}. Online appointment booking.`,
  };
}

/** Serialises JSON-LD safely for injection into a `<script>` tag. */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
