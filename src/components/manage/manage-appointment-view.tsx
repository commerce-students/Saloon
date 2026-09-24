'use client';

import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { getBookingBackend } from '@/lib/booking';
import type { Appointment } from '@/lib/booking/types';
import { useEffect, useState } from 'react';

import { ManageAppointment } from './manage-appointment';

type State =
  | { status: 'loading' }
  | { status: 'ready'; appointment: Appointment }
  | { status: 'error'; message: string };

/**
 * Loads one appointment by its management token.
 *
 * The token never leaves the URL/request: it is passed to the backend, which
 * decides whether the appointment may be returned at all. There is no client-side
 * check that could be bypassed.
 */
export function ManageAppointmentView({ token }: { token: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    getBookingBackend()
      .getByToken(token)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setState({ status: 'ready', appointment: result.appointment });
        } else {
          setState({ status: 'error', message: result.error.message });
        }
      })
      .catch(() => {
        if (!active) return;
        setState({
          status: 'error',
          message:
            'We could not reach the booking service. Please check your connection and retry.',
        });
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your appointment</span>
        <div className="skeleton border-line h-24 border" />
        <div className="skeleton border-line h-64 border" />
        <div className="skeleton h-12 w-2/3" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <Alert tone="warning" title="We couldn’t find that appointment">
          {state.message}
        </Alert>

        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/manage" variant="primary" size="lg">
            Find my appointment
          </ButtonLink>
          <ButtonLink href="/book" variant="outline" size="lg">
            Book a new appointment
          </ButtonLink>
        </div>

        <p className="text-ink-muted text-[0.8125rem] leading-relaxed">
          Management links are unique to one appointment and cannot be guessed. If you still have
          the message from when you booked, opening that link again will work. Otherwise the clinic
          can look the appointment up using your reference code and mobile number.
        </p>
      </div>
    );
  }

  return <ManageAppointment appointment={state.appointment} />;
}
