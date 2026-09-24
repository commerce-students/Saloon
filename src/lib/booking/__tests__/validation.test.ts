import { describe, expect, it } from 'vitest';

import {
  cleanCustomerDetails,
  validateCustomerDetails,
  validateEmail,
  validateName,
  validateNotes,
  validatePhone,
} from '../validation';

describe('validateName', () => {
  it('requires a name', () => {
    expect(validateName('')).toBeDefined();
    expect(validateName('   ')).toBeDefined();
    expect(validateName('A')).toBeDefined();
  });

  it('accepts realistic names', () => {
    expect(validateName('Maryam')).toBeUndefined();
    expect(validateName('Fatma Al Balushi')).toBeUndefined();
    expect(validateName('Aisha bint Said')).toBeUndefined();
  });

  it('rejects excessively long names', () => {
    expect(validateName('a'.repeat(81))).toBeDefined();
  });
});

describe('validatePhone', () => {
  it('accepts Omani numbers in several formats', () => {
    expect(validatePhone('91234567')).toBeUndefined();
    expect(validatePhone('+968 9123 4567')).toBeUndefined();
    expect(validatePhone('00968 9123 4567')).toBeUndefined();
    expect(validatePhone('+968-9123-4567')).toBeUndefined();
  });

  it('requires at least 8 digits', () => {
    expect(validatePhone('1234567')).toBeDefined();
    expect(validatePhone('')).toBeDefined();
    expect(validatePhone('   ')).toBeDefined();
  });

  it('rejects letters', () => {
    expect(validatePhone('call me')).toBeDefined();
  });

  it('rejects implausibly long numbers', () => {
    expect(validatePhone('+123456789012345678')).toBeDefined();
  });

  it('warns about Omani mobile prefixes for local 8-digit numbers', () => {
    expect(validatePhone('51234567')).toBeDefined();
    expect(validatePhone('11111111')).toBeDefined();
  });
});

describe('validateEmail', () => {
  it('is optional', () => {
    expect(validateEmail('')).toBeUndefined();
  });

  it('accepts valid addresses', () => {
    expect(validateEmail('aisha@example.com')).toBeUndefined();
    expect(validateEmail('aisha.alkindi+clinic@example.co.uk')).toBeUndefined();
  });

  it('rejects malformed addresses', () => {
    expect(validateEmail('aisha@')).toBeDefined();
    expect(validateEmail('aisha@example')).toBeDefined();
    expect(validateEmail('not an email')).toBeDefined();
  });
});

describe('validateNotes', () => {
  it('caps the length', () => {
    expect(validateNotes('Please use the quiet room')).toBeUndefined();
    expect(validateNotes('a'.repeat(501))).toBeDefined();
  });
});

describe('validateCustomerDetails', () => {
  it('passes with the minimum required details', () => {
    const result = validateCustomerDetails({
      name: 'Maryam',
      phone: '91234567',
      email: '',
      notes: '',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('reports every problem at once so the form can highlight all fields', () => {
    const result = validateCustomerDetails({
      name: '',
      phone: '12',
      email: 'nope',
      notes: 'a'.repeat(600),
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['email', 'name', 'notes', 'phone']);
  });
});

describe('cleanCustomerDetails', () => {
  it('trims, normalises and drops empty optionals', () => {
    const clean = cleanCustomerDetails({
      name: '  Maryam   Al  Balushi ',
      phone: '+968 9123 4567',
      email: '  maryam@example.com ',
      notes: '   ',
    });

    expect(clean).toEqual({
      name: 'Maryam Al Balushi',
      phone: '+96891234567',
      email: 'maryam@example.com',
      notes: null,
    });
  });
});
