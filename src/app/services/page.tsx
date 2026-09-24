import type { Metadata } from 'next';

import { BookingSteps } from '@/components/sections/booking-steps';
import { Services } from '@/components/sections/services';
import { WhatsAppCTA } from '@/components/sections/whatsapp-cta';
import { Container } from '@/components/ui/container';
import { listActiveServices } from '@/lib/booking/catalog';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Treatments & Services',
  description:
    'Browse the treatments available at Chic by Sisters Clinic in Muscat and book your appointment online in a few steps.',
  alternates: { canonical: '/services' },
});

export default async function ServicesPage() {
  const services = await listActiveServices();

  return (
    <>
      <Container className="pt-14 pb-2 sm:pt-16">
        <p className="text-eyebrow">Treatments &amp; Services</p>
        <h1 className="mt-4 max-w-2xl font-serif text-[2.25rem] leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">
          Every appointment, bookable in a few steps
        </h1>
        <p className="text-ink-soft mt-6 max-w-xl text-[1.0625rem] leading-relaxed">
          Choose a treatment below to start your booking with that appointment already selected. If
          you are unsure which is right for you, a consultation is the calmest way to begin.
        </p>
      </Container>

      <Services services={services} showViewAll={false} />
      <BookingSteps />
      <WhatsAppCTA />
    </>
  );
}
