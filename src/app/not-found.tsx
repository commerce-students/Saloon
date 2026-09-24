import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col justify-center py-20">
      <p className="text-eyebrow">404</p>
      <h1 className="mt-4 max-w-xl font-serif text-[2.25rem] leading-tight sm:text-[3rem]">
        That page has moved on
      </h1>
      <p className="text-ink-soft mt-5 max-w-md text-[1.0625rem] leading-relaxed">
        The link you followed does not exist any more. You can book a new appointment, browse the
        treatments, or manage an appointment you already have.
      </p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/book" variant="primary" size="lg">
          Book an appointment
        </ButtonLink>
        <ButtonLink href="/services" variant="outline" size="lg">
          View services
        </ButtonLink>
        <ButtonLink href="/manage" variant="quiet" size="lg">
          Manage appointment
        </ButtonLink>
      </div>
    </Container>
  );
}
