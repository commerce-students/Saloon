import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const tones: Record<AlertTone, { wrapper: string; icon: ReactNode }> = {
  info: {
    wrapper: 'border-line-strong bg-cream text-ink-soft',
    icon: <Info className="text-ink-muted size-4 shrink-0" aria-hidden="true" />,
  },
  success: {
    wrapper: 'border-[#c9dbd0] bg-[#f2f7f4] text-[#33543f]',
    icon: <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />,
  },
  warning: {
    wrapper: 'border-[#e6dabb] bg-[#fbf6ea] text-[#6f5526]',
    icon: <TriangleAlert className="text-warning size-4 shrink-0" aria-hidden="true" />,
  },
  error: {
    wrapper: 'border-[#e6c9c8] bg-[#fbf1f0] text-[#7a3432]',
    icon: <AlertCircle className="text-danger size-4 shrink-0" aria-hidden="true" />,
  },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className = '',
  live = false,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
  /** Announces changes to screen readers (used for booking errors). */
  live?: boolean;
}) {
  const { wrapper, icon } = tones[tone];

  return (
    <div
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
      className={`flex items-start gap-3 rounded-[2px] border px-4 py-3.5 text-[0.875rem] leading-relaxed ${wrapper} ${className}`}
    >
      <span className="mt-0.5">{icon}</span>
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
      </div>
    </div>
  );
}
