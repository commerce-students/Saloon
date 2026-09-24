'use client';

import { useEffect, useState } from 'react';

import type { MonthDay } from '@/lib/booking/availability';
import { getBookingBackend } from '@/lib/booking';

/**
 * Month-level availability for the calendar. Always asks the backend (demo or
 * Supabase) so the calendar can never disagree with what is actually bookable.
 */
export function useMonthAvailability(
  serviceId: string | null,
  year: number,
  monthIndex: number,
): { days: MonthDay[] | null; loading: boolean; error: string | null } {
  const [days, setDays] = useState<MonthDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) {
      setDays(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getBookingBackend()
      .getMonthAvailability(serviceId, year, monthIndex)
      .then((result) => {
        if (!active) return;
        setDays(result);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setDays([]);
        setError(
          cause instanceof Error
            ? 'Availability could not be loaded. Please try another month.'
            : 'Availability could not be loaded.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [serviceId, year, monthIndex]);

  return { days, loading, error };
}
