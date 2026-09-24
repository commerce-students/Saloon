import type { Service } from '@/lib/booking/types';

/**
 * ⚠️  DEMO CATALOGUE — NOT REAL CLINIC INFORMATION
 *
 * Chic by Sisters Clinic's actual treatments, durations and prices have not
 * been supplied, so every entry below is generic placeholder content marked
 * `isPlaceholder: true` (the UI labels it as such). No medical claims, results
 * or certifications are implied.
 *
 * To go live, either:
 *   1. Edit this file with the clinic's approved wording, or
 *   2. Configure Supabase and manage services from the database
 *      (`services` table + `src/lib/booking/supabase/backend.ts`).
 */
export const SERVICE_CURRENCY = 'OMR';

export const DEMO_SERVICES: Service[] = [
  {
    id: 'svc-consultation',
    name: 'Consultation & Skin Analysis',
    description: 'A one-to-one assessment to plan a treatment suited to your skin and goals.',
    durationMinutes: 30,
    price: null,
    currency: SERVICE_CURRENCY,
    category: 'Consultation',
    active: true,
    isPlaceholder: true,
  },
  {
    id: 'svc-signature-facial',
    name: 'Signature Facial',
    description: 'A personalised facial designed around your skin’s needs on the day.',
    durationMinutes: 60,
    price: null,
    currency: SERVICE_CURRENCY,
    category: 'Face',
    active: true,
    isPlaceholder: true,
  },
  {
    id: 'svc-advanced-skin',
    name: 'Advanced Skin Treatment',
    description: 'A longer, targeted appointment for specific skin concerns.',
    durationMinutes: 75,
    price: null,
    currency: SERVICE_CURRENCY,
    category: 'Skin',
    active: true,
    isPlaceholder: true,
  },
  {
    id: 'svc-laser-light',
    name: 'Laser & Light Session',
    description: 'A focused session delivered by our trained aesthetics team.',
    durationMinutes: 45,
    price: null,
    currency: SERVICE_CURRENCY,
    category: 'Skin',
    active: true,
    isPlaceholder: true,
  },
  {
    id: 'svc-hands-feet',
    name: 'Manicure & Pedicure',
    description: 'Meticulous hand and foot care in a calm, private setting.',
    durationMinutes: 60,
    price: null,
    currency: SERVICE_CURRENCY,
    category: 'Beauty',
    active: true,
    isPlaceholder: true,
  },
  {
    id: 'svc-bridal',
    name: 'Bridal Preparation Package',
    description: 'A relaxed, extended appointment to prepare for your celebration.',
    durationMinutes: 90,
    price: null,
    currency: SERVICE_CURRENCY,
    category: 'Occasion',
    active: true,
    isPlaceholder: true,
  },
];

/** Look-up helper that keeps working once services come from Supabase. */
export function findDemoService(serviceId: string): Service | undefined {
  return DEMO_SERVICES.find((service) => service.id === serviceId);
}
