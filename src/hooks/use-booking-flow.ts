'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { bookingConfig } from '@/config/booking';
import { addDays, todayKey } from '@/lib/booking/date';
import type { DateKey } from '@/lib/booking/date';
import { cleanCustomerDetails, validateCustomerDetails } from '@/lib/booking/validation';
import type { CustomerDetailsInput, FieldErrors } from '@/lib/booking/validation';
import { getBookingBackend } from '@/lib/booking';
import type { DayAvailability, Slot, Service } from '@/lib/booking/types';

export type BookingStep = 'service' | 'date' | 'time' | 'details' | 'confirm';

export const BOOKING_STEPS: Array<{ id: BookingStep; label: string }> = [
  { id: 'service', label: 'Service' },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Time' },
  { id: 'details', label: 'Details' },
  { id: 'confirm', label: 'Confirm' },
];

export type BookingField = keyof CustomerDetailsInput;

interface UseBookingFlowResult {
  services: Service[] | null;
  servicesError: string | null;
  step: BookingStep;
  stepIndex: number;
  service: Service | null;
  dateKey: DateKey | null;
  slot: Slot | null;
  details: CustomerDetailsInput;
  fieldErrors: FieldErrors;
  errorMessage: string | null;
  submitting: boolean;
  availability: DayAvailability | null;
  loadingAvailability: boolean;
  canContinue: boolean;
  selectService: (service: Service) => void;
  selectDate: (dateKey: DateKey) => void;
  selectSlot: (slot: Slot) => void;
  updateField: (field: BookingField, value: string) => void;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: BookingStep) => void;
  confirm: () => Promise<{ ok: true; token: string } | { ok: false }>;
}

const EMPTY_DETAILS: CustomerDetailsInput = { name: '', phone: '', email: '', notes: '' };

/**
 * All booking-wizard state and backend calls in one place. The UI components
 * stay presentational, which keeps each of them small and easy to test.
 */
export function useBookingFlow(
  initialServiceId?: string,
  /** Services rendered by the server, so the first paint is never empty. */
  initialServices?: Service[],
): UseBookingFlowResult {
  const backend = getBookingBackend();

  const [services, setServices] = useState<Service[] | null>(initialServices ?? null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [step, setStep] = useState<BookingStep>('service');
  const [service, setService] = useState<Service | null>(null);
  const [dateKey, setDateKey] = useState<DateKey | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [details, setDetails] = useState<CustomerDetailsInput>(EMPTY_DETAILS);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // --- Services ------------------------------------------------------------
  useEffect(() => {
    if (initialServices && initialServices.length > 0) return;
    let active = true;
    backend
      .listServices()
      .then((list) => {
        if (!active) return;
        setServices(list);
      })
      .catch(() => {
        if (!active) return;
        setServicesError('We could not load the treatment list. Please refresh the page.');
      });
    return () => {
      active = false;
    };
  }, [backend, initialServices]);

  // Pre-select a service when arriving from a service card ("Book" button).
  useEffect(() => {
    if (!initialServiceId || !services || service) return;
    const match = services.find((entry) => entry.id === initialServiceId);
    if (match) {
      setService(match);
      setStep('date');
    }
  }, [initialServiceId, services, service]);

  const selectService = useCallback((next: Service) => {
    setService(next);
    setErrorMessage(null);
  }, []);

  const selectDate = useCallback((next: DateKey) => {
    setDateKey(next);
    setSlot(null);
    setErrorMessage(null);
  }, []);

  const selectSlot = useCallback((next: Slot) => {
    setSlot(next);
    setErrorMessage(null);
  }, []);

  const updateField = useCallback((field: BookingField, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  // --- Availability for the chosen day -------------------------------------
  useEffect(() => {
    if (!service || !dateKey) {
      setAvailability(null);
      return;
    }

    let active = true;
    setLoadingAvailability(true);

    backend
      .getDayAvailability({ serviceId: service.id, dateKey })
      .then((result) => {
        if (!active) return;
        setAvailability(result);
      })
      .catch(() => {
        if (!active) return;
        setAvailability({ dateKey, isOpen: false, availableCount: 0, slots: [] });
        setErrorMessage('We could not load the available times. Please try again.');
      })
      .finally(() => {
        if (active) setLoadingAvailability(false);
      });

    return () => {
      active = false;
    };
  }, [backend, service, dateKey]);

  const stepIndex = BOOKING_STEPS.findIndex((entry) => entry.id === step);

  const canContinue = useMemo(() => {
    switch (step) {
      case 'service':
        return service !== null;
      case 'date':
        return dateKey !== null;
      case 'time':
        return slot !== null;
      case 'details':
        return validateCustomerDetails(details).valid;
      case 'confirm':
        return true;
    }
  }, [step, service, dateKey, slot, details]);

  const goToStep = useCallback((next: BookingStep) => {
    setErrorMessage(null);
    setStep(next);
  }, []);

  const goNext = useCallback(() => {
    setErrorMessage(null);
    setStep((current) => {
      const index = BOOKING_STEPS.findIndex((entry) => entry.id === current);
      return BOOKING_STEPS[Math.min(index + 1, BOOKING_STEPS.length - 1)]?.id ?? current;
    });
  }, []);

  const goBack = useCallback(() => {
    setErrorMessage(null);
    setStep((current) => {
      const index = BOOKING_STEPS.findIndex((entry) => entry.id === current);
      return BOOKING_STEPS[Math.max(index - 1, 0)]?.id ?? current;
    });
  }, []);

  const confirm = useCallback(async (): Promise<{ ok: true; token: string } | { ok: false }> => {
    if (!service || !dateKey || !slot) return { ok: false };

    const { errors, valid } = validateCustomerDetails(details);
    if (!valid) {
      setFieldErrors(errors);
      setStep('details');
      return { ok: false };
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const clean = cleanCustomerDetails(details);
      const result = await backend.createBooking({
        serviceId: service.id,
        dateKey,
        startTime: slot.startTime,
        expectedEndTime: slot.endTime,
        customer: { name: clean.name, phone: clean.phone, email: clean.email },
        notes: clean.notes,
      });

      if (!result.ok) {
        setErrorMessage(result.error.message);
        // Send the customer back to the time grid so they can pick again.
        setStep('time');
        return { ok: false };
      }

      return { ok: true, token: result.appointment.manageToken };
    } catch {
      setErrorMessage('Something went wrong while confirming. Please try again.');
      return { ok: false };
    } finally {
      setSubmitting(false);
    }
  }, [backend, service, dateKey, slot, details]);

  return {
    services,
    servicesError,
    step,
    stepIndex,
    service,
    dateKey,
    slot,
    details,
    fieldErrors,
    errorMessage,
    submitting,
    availability,
    loadingAvailability,
    canContinue,
    selectService,
    selectDate,
    selectSlot,
    updateField,
    goNext,
    goBack,
    goToStep,
    confirm,
  };
}

/** Convenience: the last bookable date, used to bound the calendar. */
export function lastBookableDate(): DateKey {
  return addDays(todayKey(), bookingConfig.horizonDays);
}
