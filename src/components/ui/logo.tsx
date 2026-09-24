import Link from 'next/link';

import { clinic } from '@/config/clinic';

/**
 * Wordmark. The clinic's real logo file can replace the monogram later — the
 * layout (monogram + stacked wordmark) stays the same.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${clinic.name} — home`}
      className={`group inline-flex items-center gap-3 ${className}`}
    >
      <span
        aria-hidden="true"
        className="border-line-strong bg-ivory text-accent group-hover:border-accent grid size-10 shrink-0 place-items-center border font-serif text-[0.9375rem] leading-none tracking-[0.06em] transition-colors duration-300"
      >
        CS
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-ink font-sans text-[0.6875rem] font-semibold tracking-[0.2em] uppercase sm:text-[0.75rem]">
          Chic by Sisters Clinic
        </span>
        <span className="text-ink-muted mt-1.5 font-sans text-[0.5625rem] tracking-[0.3em] uppercase">
          Muscat · Oman
        </span>
      </span>
    </Link>
  );
}
