import Image from 'next/image';

import detailImage from '@/assets/detail.jpg';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';

/**
 * Trust section.
 *
 * Deliberately free of reviews, awards, certifications and before/after claims
 * — none of those have been verified for this clinic, and inventing them would
 * mislead customers. What remains is a factual description of how the clinic
 * handles appointments.
 */
export function Approach() {
  const points = [
    {
      title: 'Appointments are honoured',
      body: 'The diary reserves the full treatment time for you, including the moments between appointments.',
    },
    {
      title: 'Your details stay private',
      body: 'Only the information needed to manage your visit is collected, and it is never shared or sold.',
    },
    {
      title: 'Change your mind freely',
      body: 'Reschedule or cancel from your confirmation link at any time before your appointment.',
    },
  ];

  return (
    <section aria-labelledby="approach-heading" className="bg-ivory py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="The experience"
              title="Considered, unhurried, private"
              intro="Chic by Sisters Clinic is a women’s clinic, and the experience is built around that: calm surroundings, clear information, and appointments that start when they are meant to."
            />

            <dl className="divide-line border-line mt-10 flex flex-col divide-y border-t">
              {points.map((point) => (
                <div key={point.title} className="py-5">
                  <dt className="text-ink font-sans text-[0.9375rem] font-medium">{point.title}</dt>
                  <dd className="text-ink-soft mt-1.5 text-[0.9375rem] leading-relaxed">
                    {point.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative order-first lg:order-last">
            <div className="bg-cream relative aspect-square overflow-hidden">
              <Image
                src={detailImage}
                alt="Folded linen and ceramic bowl detail in soft neutral tones"
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 40vw, 90vw"
                placeholder="blur"
                className="object-cover"
              />
            </div>
            <p className="text-ink-muted mt-4 text-[0.75rem] leading-relaxed">
              Illustrative image — replace with approved clinic photography.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
