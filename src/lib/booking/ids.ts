/**
 * Identifiers and reference codes.
 *
 * Security note: appointment ids and management tokens are generated with the
 * Web Crypto API — never `Math.random()` — so a token cannot be guessed.
 * The token is the *only* thing that authorises the management page, so it is
 * treated like a password: 32 random bytes, hex encoded (64 characters).
 */

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I, L, O, 0, 1

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  throw new Error('Secure random number generation is unavailable in this environment.');
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Unguessable, URL-safe token used to authorise appointment management. */
export function createManageToken(byteLength = 32): string {
  return toHex(randomBytes(Math.max(16, byteLength)));
}

export function createAppointmentId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return toHex(randomBytes(16));
}

/** Short code customers can read out over the phone, e.g. `CBS-7Q4K2B`. */
export function createReferenceCode(prefix = 'CBS'): string {
  const bytes = randomBytes(6);
  const body = Array.from(
    bytes,
    (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length],
  ).join('');
  return `${prefix}-${body}`;
}

/** Accepts `cbs-7q4k2b`, `CBS 7Q4K2B`, `cbs7q4k2b` … and returns the canonical form. */
export function normaliseReferenceCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('CBS')) {
    return `CBS-${cleaned.slice(3)}`;
  }
  return cleaned;
}

/** Digits only, keeping a single leading `+` — `+968 9123 4567` → `+96891234567`. */
export function normalisePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/**
 * Lenient phone comparison: matches on the last 8 digits so `91234567`,
 * `+968 9123 4567` and `00968 9123 4567` all resolve to the same customer.
 */
export function phonesMatch(a: string, b: string): boolean {
  const left = normalisePhone(a).replace(/\D/g, '');
  const right = normalisePhone(b).replace(/\D/g, '');
  if (left.length < 8 || right.length < 8) return left === right;
  return left.slice(-8) === right.slice(-8);
}
