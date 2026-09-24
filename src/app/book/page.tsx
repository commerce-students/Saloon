import type { Metadata } from 'next';

import { BookingWizard } from '@/components/booking/booking-wizard';
import { Container } from '@/components/ui/container';
import { listActiveServices } from '@/lib/booking/catalog';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Book an Appointment',
  description:
    'Book your appointment online at Chic by Sisters Clinic, Muscat. Choose your treatment, date and time, then confirm in under a minute.',
  alternates: { canonical: '/book' },
  openGraph: {
    title: 'Book an Appointment — Chic by Sisters Clinic',
    description:
      'Choose your treatment, pick a date and time, and confirm your appointment at Chic by Sisters Clinic in Muscat.',
  },
});

/**
 * Booking page. `?service=` pre-selects a treatment when the customer arrives
 * from a service card, which removes a whole step from the flow.
 */
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const params = await searchParams;
  const services = await listActiveServices();

  return (
    <div className="bg-cream/30">
      <Container className="pt-10 pb-6 sm:pt-14">
        <p className="text-eyebrow">Appointments</p>
        <p className="text-ink-soft mt-3 max-w-xl text-[0.9375rem] leading-relaxed">
          Booking online reserves your time immediately. You can change or cancel the appointment
          afterwards from your confirmation.
        </p>
      </Container>

      <BookingWizard initialServiceId={params.service} services={services} />
    </div>
  );
}
