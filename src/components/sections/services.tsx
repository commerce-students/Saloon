import { ArrowRight } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { SERVICE_CURRENCY } from '@/data/services';
import { formatCurrency } from '@/lib/format';
import type { Service } from '@/lib/booking/types';

import { ServiceCard } from './service-card';

/**
 * Services section.
 *
 * The catalogue is demo content (see `src/data/services.ts`): generic names,
 * generic descriptions, no prices and no medical claims. Each card is labelled
 * so nobody mistakes it for approved clinic information.
 */
export function Services({
  services,
  limit,
  showViewAll = true,
  headingLevel = 'h2',
}: {
  services: Service[];
  limit?: number;
  showViewAll?: boolean;
  headingLevel?: 'h2' | 'h1';
}) {
  const visible = typeof limit === 'number' ? services.slice(0, limit) : services;
  const isPlaceholderCatalogue = services.some((service) => service.isPlaceholder);

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="bg-ivory scroll-mt-28 py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            as={headingLevel}
            eyebrow="Treatments & Services"
            title={headingLevel === 'h1' ? 'Treatments & Services' : 'Treatments & services'}
            intro={
              headingLevel === 'h1'
                ? 'Choose an appointment that suits your day. Every treatment below can be booked online in a few steps.'
                : 'Choose an appointment that suits your day. Each treatment can be booked online in a few steps — the diary shows the exact times still available.'
            }
          />
          {showViewAll ? (
            <ButtonLink href="/services" variant="link" className="self-start whitespace-nowrap">
              View all treatments
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          ) : null}
        </div>

        {isPlaceholderCatalogue ? (
          <p className="border-nude text-ink-muted mt-8 border-l-2 pl-4 text-[0.8125rem] leading-relaxed">
            The treatments below are placeholder entries so the booking system can be tested. Chic
            by Sisters Clinic will confirm its real treatment list, durations and prices — they will
            then replace this sample content.
          </p>
        ) : null}

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          ))}
        </ul>

        {visible.length === 0 ? (
          <p className="border-line bg-cream/40 text-ink-soft mt-10 border px-6 py-8 text-center text-[0.9375rem]">
            The treatment list is not published yet. Please check back shortly or contact the clinic
            directly.
          </p>
        ) : null}

        <p className="text-ink-muted mt-10 text-[0.8125rem] leading-relaxed">
          Prices, when shown, are in {SERVICE_CURRENCY}. Any advice about suitability is given
          during your consultation, not by this website.
        </p>
      </Container>
    </section>
  );
}

export { formatCurrency };
