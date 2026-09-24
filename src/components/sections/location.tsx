import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Image from 'next/image';

import receptionImage from '@/assets/reception.jpg';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import {
  clinic,
  clinicLocationLine,
  contact,
  directionsHref,
  mapEmbedHref,
  telephoneHref,
  whatsappHref,
} from '@/config/clinic';

/**
 * Location section.
 *
 * The exact street address has not been supplied, so the map points at the city
 * and everything else is labelled "to be confirmed". Set
 * `NEXT_PUBLIC_CLINIC_ADDRESS` and `NEXT_PUBLIC_CLINIC_MAP_QUERY` to switch the
 * block to real, precise information — no code changes required.
 */
export function Location() {
  const phone = telephoneHref();
  const whatsapp = whatsappHref(
    'Hello Chic by Sisters Clinic, I would like directions to the clinic.',
  );
  const isApproximate = !contact.hasMapPin;

  return (
    <section
      id="location"
      aria-labelledby="location-heading"
      className="bg-ivory scroll-mt-28 py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeading
          eyebrow="Visit us"
          title="Visit Us"
          intro="Chic by Sisters Clinic welcomes women from across Muscat. Booking online means your time is reserved before you travel."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col gap-7">
            <div>
              <h3 className="text-eyebrow">Address</h3>
              <p className="text-ink mt-3 flex items-start gap-3 text-[1.0625rem] leading-relaxed">
                <MapPin className="text-accent-soft mt-1 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {clinic.address ?? (
                    <>
                      <span className="text-ink-soft">
                        Street address to be confirmed by the clinic.
                      </span>
                      <span className="text-ink-muted mt-1 block text-[0.875rem]">
                        Set <code className="text-[0.8125rem]">NEXT_PUBLIC_CLINIC_ADDRESS</code> to
                        publish it here.
                      </span>
                    </>
                  )}
                  <br />
                  {clinicLocationLine}
                </span>
              </p>
            </div>

            <div className="border-line grid gap-5 border-t pt-7 sm:grid-cols-2">
              <div>
                <h3 className="text-eyebrow">Opening hours</h3>
                <p className="text-ink-soft mt-3 flex items-start gap-3 text-[0.9375rem] leading-relaxed">
                  <Clock className="text-accent-soft mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    To be confirmed
                    <span className="text-ink-muted mt-1 block text-[0.8125rem]">
                      Live availability already reflects the clinic’s diary.
                    </span>
                  </span>
                </p>
              </div>

              <div>
                <h3 className="text-eyebrow">Contact</h3>
                <ul className="text-ink-soft mt-3 flex flex-col gap-2.5 text-[0.9375rem]">
                  {phone ? (
                    <li className="flex items-center gap-3">
                      <Phone className="text-accent-soft size-4 shrink-0" aria-hidden="true" />
                      <a href={phone} className="hover:text-accent transition-colors">
                        {clinic.phone}
                      </a>
                    </li>
                  ) : (
                    <li className="flex items-center gap-3">
                      <Phone className="text-accent-soft size-4 shrink-0" aria-hidden="true" />
                      <span>Phone number to be confirmed</span>
                    </li>
                  )}

                  {whatsapp ? (
                    <li className="flex items-center gap-3">
                      <MessageCircle
                        className="text-accent-soft size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent transition-colors"
                      >
                        WhatsApp
                      </a>
                    </li>
                  ) : null}

                  {clinic.email ? (
                    <li className="flex items-center gap-3">
                      <Mail className="text-accent-soft size-4 shrink-0" aria-hidden="true" />
                      <a
                        href={`mailto:${clinic.email}`}
                        className="hover:text-accent transition-colors"
                      >
                        {clinic.email}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>

            <div className="border-line flex flex-col gap-3 border-t pt-7 sm:flex-row">
              <ButtonLink href={directionsHref()} external variant="primary" size="lg">
                <MapPin className="size-4" aria-hidden="true" />
                Get Directions
              </ButtonLink>
              {phone ? (
                <ButtonLink href={phone} variant="outline" size="lg">
                  <Phone className="size-4" aria-hidden="true" />
                  Contact the clinic
                </ButtonLink>
              ) : (
                <ButtonLink href="/book" variant="outline" size="lg">
                  Book instead of calling
                </ButtonLink>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="border-line bg-cream relative aspect-4/3 overflow-hidden border">
              <Image
                src={receptionImage}
                alt="Reception area illustration with arched plaster walls and linen textures"
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 45vw, 90vw"
                placeholder="blur"
                className="object-cover"
              />
            </div>

            <div className="border-line bg-cream/30 border">
              <div className="border-line flex items-center justify-between gap-3 border-b px-5 py-3">
                <p className="text-eyebrow">
                  {isApproximate ? 'Approximate area' : 'Clinic location'}
                </p>
                <a
                  href={directionsHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-muted hover:text-accent inline-flex items-center gap-1.5 text-[0.75rem] tracking-[0.08em] uppercase transition-colors"
                >
                  Open in Maps
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              </div>

              <div className="bg-cream relative aspect-16/10 w-full">
                {/* Map iframe is lazy-loaded so it never delays the first paint. */}
                <iframe
                  title={`Map of ${clinic.name} — ${clinicLocationLine}`}
                  src={mapEmbedHref()}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 size-full border-0"
                />
              </div>

              {isApproximate ? (
                <p className="border-line text-ink-muted border-t px-5 py-3 text-[0.8125rem] leading-relaxed">
                  This map shows the wider Muscat area. The clinic’s exact pin will be published
                  once the address is confirmed.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
