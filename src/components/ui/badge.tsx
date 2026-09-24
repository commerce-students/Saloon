import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-cream text-ink-soft',
  accent: 'border-accent-soft/60 bg-accent-tint text-accent',
  success: 'border-[#c9dbd0] bg-[#eef5f0] text-success',
  warning: 'border-[#e3d6b8] bg-[#faf4e6] text-warning',
  danger: 'border-[#e6c9c8] bg-[#fbeeed] text-danger',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 font-sans text-[0.6875rem] font-medium tracking-[0.08em] uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
