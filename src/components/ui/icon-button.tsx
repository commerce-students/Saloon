'use client';

import { Pencil, RotateCcw } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

const icons = {
  edit: Pencil,
  reset: RotateCcw,
} as const;

/** Compact bordered button with an optional leading icon. */
export function IconButton({
  icon,
  label,
  children,
  className = '',
  ...props
}: {
  icon?: keyof typeof icons;
  label: string;
  children?: React.ReactNode;
} & ComponentPropsWithoutRef<'button'>) {
  const Icon = icon ? icons[icon] : null;

  return (
    <button
      type="button"
      aria-label={label}
      className={`border-line-strong bg-ivory text-ink hover:border-ink hover:bg-cream inline-flex min-h-9 items-center gap-2 border px-3.5 font-sans text-[0.75rem] tracking-[0.08em] uppercase transition-colors duration-200 ${className}`}
      {...props}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children ?? label}
    </button>
  );
}
