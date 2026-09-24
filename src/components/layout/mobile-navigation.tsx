'use client';

import { CalendarHeart, MapPin, Menu, Phone, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { clinic, clinicLocationLine, telephoneHref, whatsappHref } from '@/config/clinic';
import { primaryNav } from '@/config/navigation';
import { Button, ButtonLink } from '@/components/ui/button';

/**
 * Mobile menu. A native `<dialog>` gives a real focus trap, Escape handling and
 * background inertness without a third-party dependency.
 */
export function MobileNavigation() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      element.close();
    };
    element.addEventListener('cancel', handleCancel);
    return () => element.removeEventListener('cancel', handleCancel);
  }, []);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  const phone = telephoneHref();
  const whatsapp = whatsappHref(`Hello ${clinic.name}, I would like to ask about an appointment.`);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Open menu"
        className="border-line-strong text-ink hover:bg-cream grid size-11 place-items-center rounded-[2px] border transition-colors lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Site menu"
        className="border-line bg-ivory text-ink backdrop:bg-ink/40 m-0 mr-0 ml-auto h-full max-h-none w-[86%] max-w-sm translate-x-0 border-0 border-l p-0 shadow-[var(--shadow-lift)] md:w-[70%]"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="border-line flex items-center justify-between border-b px-6 py-4">
            <span className="text-eyebrow">Menu</span>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="text-ink-muted hover:bg-cream hover:text-ink grid size-11 place-items-center rounded-[2px] transition-colors"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 py-4">
            <ul className="divide-line divide-y">
              {primaryNav.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-14 items-center justify-between py-4 font-serif text-[1.375rem] transition-colors ${
                        active ? 'text-accent' : 'text-ink hover:text-accent'
                      }`}
                    >
                      {item.label}
                      {active ? (
                        <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href="/manage"
                  onClick={close}
                  className="text-ink hover:text-accent flex min-h-14 items-center justify-between py-4 font-serif text-[1.375rem] transition-colors"
                >
                  Manage appointment
                </Link>
              </li>
            </ul>

            <div className="mt-6 flex flex-col gap-3">
              <p className="text-eyebrow">Visit us</p>
              <p className="text-ink-soft flex items-start gap-2.5 text-[0.9375rem]">
                <MapPin className="text-accent-soft mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {clinic.address ?? 'Full address to be confirmed'}
                  <br />
                  {clinicLocationLine}
                </span>
              </p>
              {phone ? (
                <a
                  href={phone}
                  className="text-ink-soft hover:text-accent inline-flex items-center gap-2.5 text-[0.9375rem] transition-colors"
                >
                  <Phone className="text-accent-soft size-4" aria-hidden="true" />
                  {clinic.phone}
                </a>
              ) : null}
            </div>
          </nav>

          <div className="border-line border-t px-6 py-5">
            <ButtonLink href="/book" variant="primary" size="lg" className="w-full" onClick={close}>
              <CalendarHeart className="size-4" aria-hidden="true" />
              Book an appointment
            </ButtonLink>
            {whatsapp ? (
              <ButtonLink
                href={whatsapp}
                external
                variant="outline"
                size="md"
                className="mt-3 w-full"
                onClick={close}
              >
                Chat on WhatsApp
              </ButtonLink>
            ) : (
              <Button variant="outline" size="md" className="mt-3 w-full" disabled>
                WhatsApp coming soon
              </Button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
