import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';

import { Container } from '@/components/ui/container';
import { Logo } from '@/components/ui/logo';
import {
  clinic,
  clinicLocationLine,
  contact,
  directionsHref,
  telephoneHref,
  whatsappHref,
} from '@/config/clinic';
import { footerNav } from '@/config/navigation';

export function SiteFooter() {
  const phone = telephoneHref();
  const whatsapp = whatsappHref();
  const year = new Date().getFullYear();

  return (
    <footer className="border-line bg-cream border-t">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="text-ink-soft mt-6 max-w-sm text-[0.9375rem] leading-relaxed">
              {clinic.tagline} Appointments are confirmed online in a few steps — no waiting for a
              call back.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="border-ink hover:border-accent hover:text-accent border-b pb-0.5 font-sans text-[0.8125rem] tracking-[0.1em] uppercase transition-colors"
              >
                Book an appointment
              </Link>
              <Link
                href="/manage"
                className="border-line-strong text-ink-muted hover:border-accent hover:text-accent border-b pb-0.5 font-sans text-[0.8125rem] tracking-[0.1em] uppercase transition-colors"
              >
                Manage appointment
              </Link>
            </div>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-eyebrow">Explore</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-ink-soft hover:text-accent text-[0.9375rem] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-eyebrow">Visit &amp; contact</h2>
            <ul className="text-ink-soft mt-5 flex flex-col gap-3.5 text-[0.9375rem]">
              <li className="flex items-start gap-3">
                <MapPin className="text-accent-soft mt-1 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {clinic.address ?? 'Full address to be confirmed'}
                  <br />
                  {clinicLocationLine}
                </span>
              </li>
              {phone ? (
                <li className="flex items-center gap-3">
                  <Phone className="text-accent-soft size-4 shrink-0" aria-hidden="true" />
                  <a href={phone} className="hover:text-accent transition-colors">
                    {clinic.phone}
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
              <li className="flex items-center gap-3">
                <Clock className="text-accent-soft size-4 shrink-0" aria-hidden="true" />
                <span>Opening hours to be confirmed</span>
              </li>
              <li>
                <a
                  href={directionsHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-line-strong hover:border-accent hover:text-accent border-b pb-0.5 text-[0.8125rem] tracking-[0.08em] uppercase transition-colors"
                >
                  Get directions
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-line mt-14 border-t pt-8">
          <p className="text-ink-muted max-w-3xl text-[0.8125rem] leading-relaxed">
            <strong className="text-ink-soft font-medium">Demo build.</strong> This deployment runs
            with placeholder services, sample availability and appointments stored in your own
            browser — nothing is sent to the clinic yet. Contact details, opening hours and the
            service list are deliberately left blank until Chic by Sisters Clinic supplies them.
            {whatsapp ? null : ' The WhatsApp number is not published yet.'}
            {contact.hasAddress ? null : ' The exact clinic address is not published yet.'}
          </p>
          <div className="text-ink-muted mt-6 flex flex-col gap-2 text-[0.8125rem] sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {clinic.name}. All rights reserved.
            </p>
            <p>{clinicLocationLine} · Website by the clinic’s digital team</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
