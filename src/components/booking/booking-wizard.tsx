'use client';

import { ArrowLeft, ArrowRight, CalendarCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { clinicLocationLine } from '@/config/clinic';
import { useBookingFlow } from '@/hooks/use-booking-flow';
import { getBookingBackend } from '@/lib/booking';
import type { BookingStep } from '@/hooks/use-booking-flow';
import { formatCurrency } from '@/lib/format';
import { formatDuration, formatTime } from '@/lib/booking/date';
import type { Appointment, Service } from '@/lib/booking/types';

import { BookingNotice } from './booking-notice';
import { BookingProgress } from './booking-progress';
import { BookingSummary, BookingSummaryStrip } from './booking-summary';
import { Confirmation } from './confirmation';
import { CustomerDetails } from './customer-details';
import { DatePicker } from './date-picker';
import { ServiceSelector } from './service-selector';
import { TimeSlotSelector } from './time-slot-selector';

const STEP_TITLES: Record<BookingStep, { title: string; intro: string }> = {
  service: {
    title: 'Choose your treatment',
    intro:
      'Select the appointment you would like to book. Times are reserved for the full duration.',
  },
  date: {
    title: 'Choose a date',
    intro: 'Only dates with free appointments can be selected. Closed days are shown in grey.',
  },
  time: {
    title: 'Choose a time',
    intro: 'Times already reserved are shown crossed out so you can see the whole day at a glance.',
  },
  details: {
    title: 'Your details',
    intro: 'We only need a few details to hold the appointment for you.',
  },
  confirm: {
    title: 'Confirm your appointment',
    intro: 'Please check the details below. You can change anything before confirming.',
  },
};

/**
 * The booking experience.
 *
 * Five steps (Service → Date → Time → Details → Confirm) with a persistent
 * summary on large screens and a compact strip on mobile. The confirmation
 * replaces the wizard in place, so the customer never loses context or has to
 * hunt for a success page.
 */
export function BookingWizard({
  initialServiceId,
  services,
}: {
  initialServiceId?: string;
  /** Server-rendered catalogue; keeps the first step instant and indexable. */
  services?: Service[];
}) {
  const flow = useBookingFlow(initialServiceId, services);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [maxReached, setMaxReached] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setMaxReached((current) => Math.max(current, flow.stepIndex));
  }, [flow.stepIndex]);

  // Move focus to the step heading after each transition: essential for
  // keyboard and screen-reader users, and it keeps the viewport anchored.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, [flow.step]);

  const handleConfirm = async () => {
    const result = await flow.confirm();
    if (!result.ok) return;

    // Re-read through the backend so the confirmation always shows the stored
    // appointment (including the final end time), never a client-side guess.
    const lookup = await getBookingBackend().getByToken(result.token);
    if (lookup.ok) setAppointment(lookup.appointment);
  };

  if (appointment) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
        <Confirmation appointment={appointment} />
      </div>
    );
  }

  const { title, intro } = STEP_TITLES[flow.step];
  const showSummary =
    flow.service !== null &&
    (flow.step === 'time' || flow.step === 'details' || flow.step === 'confirm');

  return (
    <div className="mx-auto w-full max-w-6xl px-0 pb-16 sm:px-6 lg:py-12">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 lg:px-2">
        <div className="border-line bg-ivory border-y sm:border sm:shadow-[var(--shadow-soft)]">
          <BookingProgress
            current={flow.step}
            maxReachedIndex={maxReached}
            onNavigate={(step) => flow.goToStep(step)}
          />

          <BookingSummaryStrip
            serviceName={flow.service?.name ?? null}
            serviceDurationMinutes={flow.service?.durationMinutes ?? null}
            dateKey={flow.dateKey}
            time={flow.slot?.startTime ?? null}
          />

          <div className="px-5 py-7 sm:px-7 sm:py-9">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-serif text-[1.75rem] leading-tight outline-none sm:text-[2rem]"
            >
              {title}
            </h1>
            <p className="text-ink-soft mt-2.5 max-w-xl text-[0.9375rem] leading-relaxed">
              {intro}
            </p>

            <div className="mt-8">
              {flow.step === 'service' ? (
                <ServiceSelector
                  services={flow.services}
                  error={flow.servicesError}
                  selectedId={flow.service?.id ?? null}
                  onSelect={flow.selectService}
                />
              ) : null}

              {flow.step === 'date' && flow.service ? (
                <DatePicker
                  serviceId={flow.service.id}
                  value={flow.dateKey}
                  onSelect={flow.selectDate}
                />
              ) : null}

              {flow.step === 'time' && flow.service ? (
                <TimeSlotSelector
                  dateKey={flow.dateKey}
                  availability={flow.availability}
                  loading={flow.loadingAvailability}
                  selectedStart={flow.slot?.startTime ?? null}
                  onSelect={flow.selectSlot}
                  errorMessage={flow.errorMessage}
                  serviceDurationMinutes={flow.service.durationMinutes}
                  onChangeDate={() => flow.goToStep('date')}
                />
              ) : null}

              {flow.step === 'details' ? (
                <CustomerDetails
                  details={flow.details}
                  errors={flow.fieldErrors}
                  onChange={flow.updateField}
                  disabled={flow.submitting}
                />
              ) : null}

              {flow.step === 'confirm' ? (
                <div>
                  <div className="border-line border px-5 py-2 sm:px-6">
                    <BookingSummary
                      serviceName={flow.service?.name ?? null}
                      serviceDurationMinutes={flow.service?.durationMinutes ?? null}
                      price={flow.service?.price ?? null}
                      formatPrice={(value) =>
                        formatCurrency(value, flow.service?.currency ?? 'OMR')
                      }
                      dateKey={flow.dateKey}
                      time={flow.slot?.startTime ?? null}
                      customerName={flow.details.name}
                      customerPhone={flow.details.phone}
                      onEditService={() => flow.goToStep('service')}
                      onEditDate={() => flow.goToStep('date')}
                      onEditTime={() => flow.goToStep('time')}
                      onEditDetails={() => flow.goToStep('details')}
                    />
                  </div>

                  {flow.details.notes.trim().length > 0 ? (
                    <p className="text-ink-muted mt-4 text-[0.8125rem] leading-relaxed">
                      <span className="text-ink-soft">Notes for the team: </span>
                      {flow.details.notes}
                    </p>
                  ) : null}

                  <BookingNotice className="mt-6" />

                  <p className="text-ink-muted mt-6 text-[0.8125rem] leading-relaxed">
                    By confirming you agree to the clinic holding these details to manage your
                    appointment. If you need to change or cancel, use the management link afterwards
                    — there is no cancellation fee for doing so in advance.
                  </p>
                </div>
              ) : null}
            </div>

            {flow.errorMessage && flow.step !== 'time' ? (
              <Alert tone="error" className="mt-6" title="We could not continue" live>
                {flow.errorMessage}
              </Alert>
            ) : null}

            {/* Step controls */}
            <div className="border-line mt-9 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              {flow.stepIndex > 0 ? (
                <Button variant="outline" size="lg" onClick={flow.goBack} type="button">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
              ) : (
                <span className="hidden sm:block" />
              )}

              {flow.step === 'confirm' ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleConfirm}
                  loading={flow.submitting}
                  className="w-full sm:w-auto"
                >
                  <CalendarCheck className="size-4" aria-hidden="true" />
                  {flow.submitting ? 'Confirming…' : 'Confirm Appointment'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={flow.goNext}
                  disabled={!flow.canContinue}
                  className="w-full sm:w-auto"
                >
                  Continue
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>

            {!flow.canContinue && flow.step !== 'details' ? (
              <p className="text-ink-muted mt-3 text-center text-[0.75rem] sm:text-right">
                {flow.step === 'service'
                  ? 'Select a treatment to continue.'
                  : flow.step === 'date'
                    ? 'Select an available date to continue.'
                    : 'Select an available time to continue.'}
              </p>
            ) : null}
          </div>
        </div>

        {/* Persistent summary — large screens only. */}
        <aside className="hidden lg:block">
          {showSummary ? (
            <div className="border-line bg-cream/30 sticky top-28 border px-6 py-6">
              <h2 className="font-serif text-[1.25rem]">Appointment summary</h2>
              <BookingSummary
                compact
                serviceName={flow.service?.name ?? null}
                serviceDurationMinutes={flow.service?.durationMinutes ?? null}
                price={flow.service?.price ?? null}
                formatPrice={(value) => formatCurrency(value, flow.service?.currency ?? 'OMR')}
                dateKey={flow.dateKey}
                time={flow.slot?.startTime ?? null}
                customerName={flow.details.name || null}
                customerPhone={flow.details.phone || null}
                location={clinicLocationLine}
              />
              <p className="border-line text-ink-muted mt-5 border-t pt-5 text-[0.8125rem] leading-relaxed">
                {flow.service
                  ? `${flow.service.name} · ${formatDuration(flow.service.durationMinutes)}`
                  : 'Select a treatment to begin.'}
                {flow.slot ? ` · finishes at ${formatTime(flow.slot.endTime)}` : ''}
              </p>
            </div>
          ) : (
            <div className="border-line bg-cream/30 sticky top-28 border px-6 py-6">
              <h2 className="font-serif text-[1.25rem]">How booking works</h2>
              <ol className="text-ink-soft mt-4 flex flex-col gap-3 text-[0.875rem] leading-relaxed">
                <li>1. Choose your treatment and see the exact duration.</li>
                <li>2. Pick a date — unavailable days are visible but blocked.</li>
                <li>3. Choose a time from the live diary.</li>
                <li>4. Add your details and confirm.</li>
                <li>5. Manage or cancel later from your confirmation link.</li>
              </ol>
              <p className="border-line text-ink-muted mt-5 border-t pt-5 text-[0.8125rem] leading-relaxed">
                Booking takes about a minute and needs no phone call. If you would rather speak to
                someone, the clinic’s WhatsApp and phone options are on the contact section.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
