import { ArrowRight, CalendarHeart, Clock, MapPin, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

import heroImage from '@/assets/hero.jpg';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { clinicLocationLine } from '@/config/clinic';

const reassurances = [
  { icon: Clock, label: 'Live availability', detail: 'See real appointment times' },
  { icon: ShieldCheck, label: 'Confirmed instantly', detail: 'No waiting for a call back' },
  { icon: MapPin, label: clinicLocationLine, detail: 'Directions on the day' },
];

/**
 * Hero.
 *
 * The image is an illustrative placeholder (see `src/assets/README.md`) — it
 * shows an interiors scene, not a treatment, a member of staff or a result.
 * Replace it with approved clinic photography by overwriting the file.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="bg-ivory relative overflow-hidden">
      <Container className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20 xl:py-24">
        <div className="animate-rise-in max-w-xl">
          <p className="text-eyebrow">Muscat, Oman · Women’s aesthetics &amp; beauty</p>

          <h1
            id="hero-heading"
            className="mt-5 font-serif text-[2.625rem] leading-[1.06] tracking-[-0.02em] sm:text-[3.5rem] lg:text-[4rem]"
          >
            Your Time,
            <br />
            Your Appointment.
          </h1>

          <p className="text-ink-soft mt-7 max-w-md text-[1.0625rem] leading-relaxed sm:text-[1.125rem]">
            Discover a more effortless way to book your visit at Chic by Sisters Clinic.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/book" variant="primary" size="lg" className="w-full sm:w-auto">
              <CalendarHeart className="size-4" aria-hidden="true" />
              Book an Appointment
            </ButtonLink>
            <ButtonLink href="/services" variant="outline" size="lg" className="w-full sm:w-auto">
              View Services
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>

          <dl className="border-line mt-12 grid gap-6 border-t pt-8 sm:grid-cols-3">
            {reassurances.map(({ icon: Icon, label, detail }) => (
              <div key={label} className="flex gap-3">
                <Icon className="text-accent-soft mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <dt className="text-ink font-sans text-[0.8125rem] font-medium tracking-[0.02em]">
                    {label}
                  </dt>
                  <dd className="text-ink-muted mt-0.5 text-[0.75rem] leading-relaxed">{detail}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-scale-in relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="bg-cream relative aspect-4/5 overflow-hidden">
            <Image
              src={heroImage}
              alt="Calm treatment room with soft natural light, linen and neutral interiors"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, (min-width: 640px) 28rem, 90vw"
              placeholder="blur"
              className="object-cover"
            />
          </div>

          {/* Quiet caption instead of a floating card — keeps the layout editorial. */}
          <p className="text-ink-muted mt-4 max-w-xs text-[0.75rem] leading-relaxed">
            Illustrative interior photograph. Clinic photography will replace this image.
          </p>

          <div className="border-line bg-ivory absolute -bottom-4 -left-4 hidden border px-5 py-4 shadow-[var(--shadow-soft)] sm:block">
            <p className="text-eyebrow">Booking takes</p>
            <p className="mt-1 font-serif text-[1.5rem] leading-none">About a minute</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
