'use client';

import { CalendarHeart, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Logo } from '@/components/ui/logo';
import { clinic, clinicLocationLine, telephoneHref } from '@/config/clinic';
import { primaryNav } from '@/config/navigation';
import { useScrolled } from '@/hooks/use-scrolled';

import { MobileNavigation } from './mobile-navigation';

/**
 * Sticky header that compresses slightly once the page scrolls, keeping the
 * booking button reachable at every viewport size.
 */
export function SiteHeader() {
  const scrolled = useScrolled(20);
  const pathname = usePathname();
  const phone = telephoneHref();

  return (
    <header
      className={`bg-ivory/92 sticky top-0 z-40 border-b backdrop-blur-md transition-[height,border-color,box-shadow] duration-300 ease-[var(--ease-quiet)] ${
        scrolled ? 'border-line shadow-[0_1px_0_rgba(35,32,30,0.02)]' : 'border-transparent'
      }`}
    >
      {/* Slim information strip — desktop only, hidden once you scroll. */}
      <div
        aria-hidden={scrolled}
        className={`border-line bg-cream/70 hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-[var(--ease-quiet)] lg:block ${
          scrolled ? 'max-h-0 opacity-0' : 'max-h-10 border-b opacity-100'
        }`}
      >
        <Container className="flex h-9 items-center justify-between">
          <p className="text-ink-muted flex items-center gap-2 text-[0.75rem] tracking-[0.06em]">
            <MapPin className="text-accent-soft size-3.5" aria-hidden="true" />
            <span>
              {clinicLocationLine}
              {clinic.address ? ` · ${clinic.address}` : ' · address to be confirmed'}
            </span>
          </p>
          {phone ? (
            <a
              href={phone}
              className="text-ink-muted hover:text-accent flex items-center gap-2 text-[0.75rem] tracking-[0.06em] transition-colors"
            >
              <Phone className="text-accent-soft size-3.5" aria-hidden="true" />
              {clinic.phone}
            </a>
          ) : (
            <Link
              href="/manage"
              className="text-ink-muted hover:text-accent text-[0.75rem] tracking-[0.06em] transition-colors"
            >
              Manage an existing appointment
            </Link>
          )}
        </Container>
      </div>

      <Container
        className={`flex items-center justify-between gap-6 transition-[height] duration-300 ease-[var(--ease-quiet)] ${
          scrolled ? 'h-16' : 'h-[4.5rem]'
        }`}
      >
        <Logo />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {primaryNav.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative py-2 font-sans text-[0.8125rem] tracking-[0.1em] uppercase transition-colors duration-200 ${
                      active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={`bg-accent absolute -bottom-0.5 left-0 h-px transition-all duration-300 ease-[var(--ease-quiet)] ${
                        active ? 'w-full' : 'w-0'
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <ButtonLink href="/book" variant="primary" size="md" className="hidden sm:inline-flex">
            <CalendarHeart className="size-4" aria-hidden="true" />
            Book Appointment
          </ButtonLink>
          <ButtonLink href="/book" variant="primary" size="sm" className="sm:hidden">
            Book
          </ButtonLink>
          <MobileNavigation />
        </div>
      </Container>
    </header>
  );
}
