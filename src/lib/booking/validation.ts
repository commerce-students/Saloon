/** Customer-detail validation shared by the booking form and the backends. */

import { normalisePhone } from './ids';

export interface CustomerDetailsInput {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export interface CustomerDetailsClean {
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
}

export type FieldErrors = Partial<Record<keyof CustomerDetailsInput, string>>;

export const NOTES_MAX_LENGTH = 500;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Returns `{}` when the value is acceptable, otherwise a customer-facing message. */
export function validateName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your full name.';
  if (trimmed.length < 2) return 'Please enter at least 2 characters.';
  if (trimmed.length > 80) return 'Please keep your name under 80 characters.';
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your mobile number.';
  if (/[a-z]/i.test(trimmed)) return 'Phone numbers cannot contain letters.';

  const digits = normalisePhone(trimmed).replace(/\D/g, '');
  if (digits.length < 8) return 'Please enter a valid mobile number (at least 8 digits).';
  if (digits.length > 15) return 'Please enter a valid mobile number (at most 15 digits).';
  if (!value.trim().startsWith('+') && digits.length === 8 && !/^[79]/.test(digits)) {
    // Oman mobile numbers start with 7 or 9; other lengths are left to the clinic to verify.
    return 'Oman mobile numbers usually start with 7 or 9.';
  }
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined; // optional field
  if (!EMAIL_PATTERN.test(trimmed)) return 'Please enter a valid email address, or leave it blank.';
  if (trimmed.length > 120) return 'Please use a shorter email address.';
  return undefined;
}

export function validateNotes(value: string): string | undefined {
  if (value.length > NOTES_MAX_LENGTH) {
    return `Please keep notes under ${NOTES_MAX_LENGTH} characters.`;
  }
  return undefined;
}

export function validateCustomerDetails(input: CustomerDetailsInput): {
  errors: FieldErrors;
  valid: boolean;
} {
  const errors: FieldErrors = {};
  const name = validateName(input.name);
  const phone = validatePhone(input.phone);
  const email = validateEmail(input.email);
  const notes = validateNotes(input.notes);

  if (name) errors.name = name;
  if (phone) errors.phone = phone;
  if (email) errors.email = email;
  if (notes) errors.notes = notes;

  return { errors, valid: Object.keys(errors).length === 0 };
}

/** Trims and normalises raw form values for storage / transport. */
export function cleanCustomerDetails(input: CustomerDetailsInput): CustomerDetailsClean {
  const email = input.email.trim();
  const notes = input.notes.trim();
  return {
    name: input.name.trim().replace(/\s+/g, ' '),
    phone: normalisePhone(input.phone),
    email: email.length > 0 ? email : null,
    notes: notes.length > 0 ? notes : null,
  };
}
