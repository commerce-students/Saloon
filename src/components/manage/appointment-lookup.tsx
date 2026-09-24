'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { getBookingBackend } from '@/lib/booking';
import { validatePhone } from '@/lib/booking/validation';

/**
 * Look up an appointment without the management link.
 *
 * Two factors are required — the reference code **and** the mobile number used
 * when booking — so a leaked reference alone reveals nothing. Rate limiting and
 * a verification step (SMS one-time code) can be layered on the same endpoint
 * later without changing this component.
 */
export function AppointmentLookup() {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ reference?: string; phone?: string }>({});
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { reference?: string; phone?: string } = {};

    if (reference.trim().length < 6)
      nextErrors.reference = 'Enter the code from your confirmation.';
    const phoneError = validatePhone(phone);
    if (phoneError) nextErrors.phone = phoneError;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSearching(true);
    setMessage(null);

    try {
      const result = await getBookingBackend().lookupByReference(reference, phone);

      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }

      router.push(`/manage/${result.appointment.manageToken}`);
    } catch {
      setMessage('We could not reach the booking service. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-line bg-ivory border px-5 py-6 sm:px-6" noValidate>
      <h2 className="font-serif text-[1.375rem]">Look up an appointment</h2>
      <p className="text-ink-soft mt-2 text-[0.875rem] leading-relaxed">
        Enter your reference code and the mobile number you booked with. Both must match the
        appointment — a reference code on its own will not reveal anything.
      </p>

      {message ? (
        <Alert tone="warning" className="mt-5" live>
          {message}
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-col gap-5">
        <TextField
          label="Appointment reference"
          name="reference"
          dir="ltr"
          placeholder="CBS-7Q4K2B"
          value={reference}
          error={errors.reference}
          disabled={searching}
          onChange={(event) => setReference(event.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />

        <TextField
          label="Mobile number used to book"
          name="phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          placeholder="9123 4567"
          value={phone}
          error={errors.phone}
          disabled={searching}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
        />

        <Button type="submit" variant="primary" size="lg" loading={searching}>
          {!searching ? <Search className="size-4" aria-hidden="true" /> : null}
          {searching ? 'Searching…' : 'Find my appointment'}
        </Button>
      </div>
    </form>
  );
}
