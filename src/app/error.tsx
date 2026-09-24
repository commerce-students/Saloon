'use client';

import { useEffect } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';

/** Route-level error boundary: a calm recovery screen, never a stack trace. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in server logs / monitoring; never shown to the customer.
    console.error('Unhandled application error', error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col justify-center py-20">
      <p className="text-eyebrow">Something went wrong</p>
      <h1 className="mt-4 max-w-xl font-serif text-[2.25rem] leading-tight sm:text-[3rem]">
        We couldn’t load this page
      </h1>
      <p className="text-ink-soft mt-5 max-w-md text-[1.0625rem] leading-relaxed">
        This is usually temporary. Try again — if you were part-way through a booking, nothing has
        been reserved, so you can safely start the appointment again.
      </p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" size="lg" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/book" variant="outline" size="lg">
          Start a booking
        </ButtonLink>
      </div>
    </Container>
  );
}
