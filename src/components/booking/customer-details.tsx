'use client';

import { ShieldCheck } from 'lucide-react';

import { TextAreaField, TextField } from '@/components/ui/field';
import { NOTES_MAX_LENGTH } from '@/lib/booking/validation';
import type { CustomerDetailsInput, FieldErrors } from '@/lib/booking/validation';

/**
 * Step 4 — customer details.
 *
 * Four fields, no more. Mobile numbers are the primary identifier in Oman, so
 * the field accepts a local number, `+968 …` or `00968 …` and validates
 * leniently (the clinic confirms the number when it sends the appointment
 * reminder). Email and notes are genuinely optional.
 */
export function CustomerDetails({
  details,
  errors,
  onChange,
  disabled,
}: {
  details: CustomerDetailsInput;
  errors: FieldErrors;
  onChange: (field: keyof CustomerDetailsInput, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          value={details.name}
          error={errors.name}
          disabled={disabled}
          onChange={(event) => onChange('name', event.target.value)}
          required
        />

        <TextField
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder="9123 4567"
          value={details.phone}
          error={errors.phone}
          hint="Oman numbers can be entered as 9123 4567 or +968 9123 4567."
          disabled={disabled}
          onChange={(event) => onChange('phone', event.target.value)}
          required
        />
      </div>

      <TextField
        label="Email address"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        dir="ltr"
        placeholder="you@example.com"
        value={details.email}
        error={errors.email}
        optional
        disabled={disabled}
        onChange={(event) => onChange('email', event.target.value)}
        hint="Used to send your appointment confirmation and calendar invitation."
      />

      <TextAreaField
        label="Notes for the team"
        name="notes"
        value={details.notes}
        error={errors.notes}
        optional
        disabled={disabled}
        maxLength={NOTES_MAX_LENGTH}
        hint={`Anything the team should know before your visit (${details.notes.length}/${NOTES_MAX_LENGTH}).`}
        onChange={(event) => onChange('notes', event.target.value)}
      />

      <p className="border-line bg-cream/40 text-ink-soft flex items-start gap-2.5 border px-4 py-3.5 text-[0.8125rem] leading-relaxed">
        <ShieldCheck className="text-accent-soft mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Your details are used only to manage this appointment. The clinic does not share them, and
          clinical notes should not be sent through this form — mention anything medical in person
          or by phone.
        </span>
      </p>
    </div>
  );
}
