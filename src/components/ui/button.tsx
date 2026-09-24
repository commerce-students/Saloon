import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'quiet' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-sans font-medium tracking-[0.02em] transition-all duration-200 ease-[var(--ease-quiet)] disabled:cursor-not-allowed disabled:opacity-50 select-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-ivory hover:bg-[#332e2b] active:bg-ink shadow-[0_1px_2px_rgba(35,32,30,0.10)]',
  accent: 'bg-accent text-ivory hover:bg-[#6a4849] active:bg-accent',
  outline: 'border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-cream/60',
  quiet: 'bg-cream text-ink hover:bg-sand',
  link: 'text-ink underline decoration-line-strong decoration-1 underline-offset-4 hover:decoration-ink',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[0.8125rem] rounded-[2px]',
  md: 'h-11 px-6 text-sm rounded-[2px]',
  lg: 'h-[3.25rem] px-8 text-[0.9375rem] rounded-[2px]',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
): string {
  return [base, variant === 'link' ? '' : sizes[size], variants[variant], className]
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

/** Primary button element with a built-in loading state. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  external?: boolean;
} & Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'className' | 'children'>;

/** Anchor styled as a button — uses client-side navigation for internal links. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  external = false,
  ...props
}: ButtonLinkProps) {
  const classes = buttonClasses(variant, size, className);

  if (
    external ||
    href.startsWith('http') ||
    href.startsWith('tel:') ||
    href.startsWith('mailto:')
  ) {
    return (
      <a
        href={href}
        className={classes}
        {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
