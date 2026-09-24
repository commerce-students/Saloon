import { MessageCircle } from 'lucide-react';

import { Button, ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { clinic, contact, whatsappHref } from '@/config/clinic';

/**
 * WhatsApp is a secondary channel — booking is the primary route. The button is
 * a plain `wa.me` click-to-chat link (no API, no credentials in the browser) and
 * stays disabled with an honest label until the clinic publishes a number.
 */
export function WhatsAppCTA() {
  const whatsapp = whatsappHref(`Hello ${clinic.name}, I would like help with an appointment.`);

  return (
    <section
      aria-labelledby="whatsapp-heading"
      className="border-line bg-cream/40 border-y py-14 sm:py-16"
    >
      <Container>
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-eyebrow">Prefer WhatsApp?</p>
            <h2
              id="whatsapp-heading"
              className="mt-4 font-serif text-[1.75rem] leading-snug sm:text-[2.125rem]"
            >
              Chat with our team
            </h2>
            <p className="text-ink-soft mt-4 text-[1rem] leading-relaxed">
              Use WhatsApp for quick questions, directions or to reach the clinic before your visit.
              For appointments, booking online is faster — you will see the exact times still
              available.
            </p>
            {!contact.hasWhatsApp ? (
              <p className="border-nude text-ink-muted mt-4 border-l-2 pl-4 text-[0.8125rem] leading-relaxed">
                The clinic’s WhatsApp number has not been published yet. Set{' '}
                <code className="text-[0.8125rem]">NEXT_PUBLIC_CLINIC_WHATSAPP</code> and this
                button becomes active — the number is never hard-coded.
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col xl:flex-row">
            {whatsapp ? (
              <ButtonLink href={whatsapp} external variant="primary" size="lg">
                <MessageCircle className="size-4" aria-hidden="true" />
                Chat on WhatsApp
              </ButtonLink>
            ) : (
              <>
                <Button variant="primary" size="lg" disabled>
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Chat on WhatsApp
                </Button>
                <p className="text-ink-muted text-[0.75rem] sm:max-w-[10rem]">
                  Available once the clinic confirms its number.
                </p>
              </>
            )}
            <ButtonLink href="/book" variant="outline" size="lg">
              Book an appointment
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
