import type { Metadata } from 'next';

import { Location } from '@/components/sections/location';
import { WhatsAppCTA } from '@/components/sections/whatsapp-cta';
import { Container } from '@/components/ui/container';
import { clinic } from '@/config/clinic';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Visit Us in Muscat',
  description:
    'Find Chic by Sisters Clinic in Muscat, Oman. See the location, get directions and book your appointment online.',
  alternates: { canonical: '/location' },
});

export default function LocationPage() {
  return (
    <>
      <Container className="pt-14 pb-2 sm:pt-16">
        <p className="text-eyebrow">Getting here</p>
        <h1 className="mt-4 max-w-2xl font-serif text-[2.25rem] leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">
          Visit {clinic.name}
        </h1>
        <p className="text-ink-soft mt-6 max-w-xl text-[1.0625rem] leading-relaxed">
          Directions, contact details and opening information for our Muscat clinic. Book online and
          your time is reserved before you travel.
        </p>
      </Container>

      <Location />
      <WhatsAppCTA />
    </>
  );
}
