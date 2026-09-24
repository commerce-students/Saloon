'use client';

import { Alert } from '@/components/ui/alert';
import type { Service } from '@/lib/booking/types';

import { ServiceOption } from './service-option';

/** Step 1 — choose the treatment. */
export function ServiceSelector({
  services,
  error,
  selectedId,
  onSelect,
}: {
  services: Service[] | null;
  error?: string | null;
  selectedId: string | null;
  onSelect: (service: Service) => void;
}) {
  if (error) {
    return (
      <Alert tone="error" title="Treatments unavailable">
        {error}
      </Alert>
    );
  }

  if (!services) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading treatments</span>
        {[0, 1, 2].map((index) => (
          <div key={index} className="skeleton border-line h-28 border" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Alert tone="info" title="No treatments published yet">
        The clinic has not published its treatment list yet. Please check back soon or contact the
        clinic directly.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="sr-only">Choose a treatment</legend>
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <ServiceOption
              key={service.id}
              service={service}
              selected={service.id === selectedId}
              onSelect={() => onSelect(service)}
            />
          ))}
        </div>
      </fieldset>

      <p className="text-ink-muted mt-1 text-[0.8125rem] leading-relaxed">
        Not sure which treatment is right for you? Choose a consultation and the team will advise
        you in person before anything is booked.
      </p>
    </div>
  );
}
