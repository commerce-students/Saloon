/**
 * Single source of truth for clinic identity, contact details and public URLs.
 *
 * ⚠️  BUSINESS INFORMATION
 * Chic by Sisters Clinic's real address, phone number and WhatsApp number are
 * not published in this repository. Every one of those values is read from an
 * environment variable (see `.env.example`) and is `null` until the clinic
 * supplies it. The UI shows a clearly-worded "to be confirmed" placeholder
 * instead of inventing anything.
 */

export const CLINIC_TIME_ZONE = 'Asia/Muscat';

function readEnv(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Strips spaces, dashes and parentheses so `+968 9123 4567` becomes `+96891234567`. */
export function normalisePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '');
}

export const clinic = {
  name: 'Chic by Sisters Clinic',
  /** Short name used in the compact header and mobile navigation. */
  shortName: 'Chic by Sisters',
  tagline: 'A premium women’s aesthetics & beauty clinic in Muscat, Oman.',
  city: 'Muscat',
  country: 'Oman',
  countryCode: 'OM',
  timeZone: CLINIC_TIME_ZONE,

  /** Confirmed clinic contact details — all optional until supplied. */
  address: readEnv(process.env.NEXT_PUBLIC_CLINIC_ADDRESS),
  phone: readEnv(process.env.NEXT_PUBLIC_CLINIC_PHONE),
  whatsapp: readEnv(process.env.NEXT_PUBLIC_CLINIC_WHATSAPP),
  email: readEnv(process.env.NEXT_PUBLIC_CLINIC_EMAIL),
  mapQuery: readEnv(process.env.NEXT_PUBLIC_CLINIC_MAP_QUERY),
  directionsUrl: readEnv(process.env.NEXT_PUBLIC_CLINIC_DIRECTIONS_URL),

  social: {
    instagram: readEnv(process.env.NEXT_PUBLIC_CLINIC_INSTAGRAM),
  },
} as const;

export const siteUrl = (
  readEnv(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3000'
).replace(/\/+$/, '');

/** Human-readable location line used across the site. */
export const clinicLocationLine = `${clinic.city}, ${clinic.country}`;

export const contact = {
  /** Full street address, or `null` when it has not been supplied yet. */
  hasAddress: clinic.address !== null,
  hasPhone: clinic.phone !== null,
  hasWhatsApp: clinic.whatsapp !== null,
  hasEmail: clinic.email !== null,
  hasMapPin: clinic.mapQuery !== null,
} as const;

/** `tel:` link, or `null` when no phone number is configured. */
export function telephoneHref(): string | null {
  return clinic.phone ? `tel:${normalisePhone(clinic.phone)}` : null;
}

/**
 * `https://wa.me/<number>?text=` link for a plain click-to-chat button.
 * Returns `null` while no WhatsApp number is configured, so the UI can show a
 * graceful "coming soon" state rather than a broken link.
 */
export function whatsappHref(message?: string): string | null {
  if (!clinic.whatsapp) return null;
  const number = normalisePhone(clinic.whatsapp).replace(/^\+/, '');
  if (!/^\d{8,15}$/.test(number)) return null;
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Google Maps embed URL. While the exact pin is unknown this points at the
 * city, clearly labelled as an approximate area on the location section.
 */
export function mapEmbedHref(): string {
  const query = clinic.mapQuery ?? `${clinic.city}, ${clinic.country}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Google Maps directions URL (search fallback when no explicit link is set). */
export function directionsHref(): string {
  if (clinic.directionsUrl) return clinic.directionsUrl;
  const query = clinic.mapQuery ?? `${clinic.city}, ${clinic.country}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}
