import { describe, expect, it } from 'vitest';

import {
  createManageToken,
  createReferenceCode,
  normalisePhone,
  normaliseReferenceCode,
  phonesMatch,
} from '../ids';
import { buildIcsContent, googleCalendarUrl } from '../calendar';
import type { Appointment } from '../types';

describe('management tokens', () => {
  it('creates long, hex-encoded, unique tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createManageToken(32)));

    expect(tokens.size).toBe(200);
    for (const token of tokens) {
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('never produces a token shorter than 16 bytes', () => {
    expect(createManageToken(4)).toHaveLength(32);
  });
});

describe('reference codes', () => {
  it('uses an unambiguous alphabet', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(createReferenceCode()).toMatch(/^CBS-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('normalises what customers actually type', () => {
    expect(normaliseReferenceCode('cbs-7q4k2b')).toBe('CBS-7Q4K2B');
    expect(normaliseReferenceCode('CBS 7Q4K2B')).toBe('CBS-7Q4K2B');
    expect(normaliseReferenceCode('cbs7q4k2b')).toBe('CBS-7Q4K2B');
  });
});

describe('phone helpers', () => {
  it('keeps a single leading plus', () => {
    expect(normalisePhone('+968 9123 4567')).toBe('+96891234567');
    expect(normalisePhone('9123 4567')).toBe('91234567');
    expect(normalisePhone('00968 9123 4567')).toBe('009689123456 7'.replace(' ', ''));
  });

  it('matches the same number written in different ways', () => {
    expect(phonesMatch('+968 9123 4567', '91234567')).toBe(true);
    expect(phonesMatch('00968 9123 4567', '+96891234567')).toBe(true);
    expect(phonesMatch('91234567', '91234568')).toBe(false);
  });

  it('does not match on short numbers', () => {
    expect(phonesMatch('123', '456')).toBe(false);
  });
});

describe('calendar export', () => {
  const appointment: Appointment = {
    id: '11111111-2222-3333-4444-555555555555',
    referenceCode: 'CBS-7Q4K2B',
    serviceId: 'svc-signature-facial',
    serviceName: 'Signature Facial',
    serviceDurationMinutes: 60,
    staffId: null,
    staffName: null,
    dateKey: '2026-01-06',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    notes: null,
    customer: { id: 'cus-1', name: 'Maryam', phone: '+96891234567', email: null },
    manageToken: 'a'.repeat(64),
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  };

  it('builds a valid .ics payload in the clinic time zone', () => {
    const ics = buildIcsContent(appointment);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    // 10:00 in Muscat (UTC+4) is 06:00 UTC.
    expect(ics).toContain('DTSTART:20260106T060000Z');
    expect(ics).toContain('DTEND:20260106T070000Z');
    expect(ics).toContain('SUMMARY:Signature Facial — Chic by Sisters Clinic');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics.split('\r\n').length).toBeGreaterThan(10);
  });

  it('marks cancelled appointments as cancelled', () => {
    const ics = buildIcsContent({ ...appointment, status: 'cancelled' });
    expect(ics).toContain('STATUS:CANCELLED');
  });

  it('builds a Google Calendar link with the right window', () => {
    const url = new URL(googleCalendarUrl(appointment));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20260106T060000Z/20260106T070000Z');
    expect(url.searchParams.get('text')).toContain('Signature Facial');
  });
});
