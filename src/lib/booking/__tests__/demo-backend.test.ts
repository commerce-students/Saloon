import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDemoBackend } from '../demo-backend';
import { clinicClock, formatTime } from '../date';
import type { BookingBackend } from '../backend';
import type { DayAvailability } from '../types';

/**
 * End-to-end exercise of the demo backend — the code path every visitor uses
 * while the site runs without a database.
 *
 * A tiny in-memory `localStorage` stands in for the browser, so the real
 * storage code (serialisation included) is covered rather than mocked away.
 */
function createFakeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

let backend: BookingBackend;

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: createFakeStorage(),
    dispatchEvent: () => true,
  });
  backend = createDemoBackend();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function firstAvailableDay(serviceId: string): Promise<{ dateKey: string; day: DayAvailability }> {
  const dateKey = await backend.findNextAvailableDate(serviceId);
  if (!dateKey) throw new Error('The demo backend offered no availability at all.');
  const day = await backend.getDayAvailability({ serviceId, dateKey });
  return { dateKey, day };
}

describe('demo backend', () => {
  it('lists the placeholder catalogue', async () => {
    const services = await backend.listServices();
    expect(services.length).toBeGreaterThan(0);
    expect(services.every((service) => service.active)).toBe(true);
    expect(services.every((service) => service.durationMinutes > 0)).toBe(true);
  });

  it('offers bookable times that respect the clinic clock', async () => {
    const [service] = await backend.listServices();
    const { dateKey, day } = await firstAvailableDay(service!.id);

    expect(day.slots.length).toBeGreaterThan(0);
    expect(day.availableCount).toBeGreaterThan(0);
    expect(dateKey >= clinicClock().dateKey).toBe(true);
  });

  it('books an appointment, returns a secure token, and reads it back', async () => {
    const [service] = await backend.listServices();
    const { dateKey, day } = await firstAvailableDay(service!.id);
    const slot = day.slots.find((entry) => entry.available);
    expect(slot).toBeDefined();

    const result = await backend.createBooking({
      serviceId: service!.id,
      dateKey,
      startTime: slot!.startTime,
      expectedEndTime: slot!.endTime,
      customer: { name: 'Maryam Al Balushi', phone: '+968 9123 4567', email: null },
      notes: 'First visit',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { appointment } = result;
    expect(appointment.manageToken).toMatch(/^[0-9a-f]{64}$/);
    expect(appointment.referenceCode).toMatch(/^CBS-[A-Z0-9]{6}$/);
    expect(appointment.status).toBe('confirmed');
    expect(appointment.customer.name).toBe('Maryam Al Balushi');
    expect(appointment.endTime).toBe(slot!.endTime);

    const lookup = await backend.getByToken(appointment.manageToken);
    expect(lookup.ok).toBe(true);
    if (lookup.ok) expect(lookup.appointment.referenceCode).toBe(appointment.referenceCode);
  });

  it('refuses to double book the same time', async () => {
    const [service] = await backend.listServices();
    const { dateKey, day } = await firstAvailableDay(service!.id);
    const slot = day.slots.find((entry) => entry.available)!;

    const first = await backend.createBooking({
      serviceId: service!.id,
      dateKey,
      startTime: slot.startTime,
      customer: { name: 'Aisha', phone: '91234567' },
    });
    expect(first.ok).toBe(true);

    const second = await backend.createBooking({
      serviceId: service!.id,
      dateKey,
      startTime: slot.startTime,
      customer: { name: 'Fatma', phone: '92345678' },
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('slot_unavailable');
    }

    // The slot now reads as taken, and another time is still free.
    const after = await backend.getDayAvailability({ serviceId: service!.id, dateKey });
    const taken = after.slots.find((entry) => entry.startTime === slot.startTime);
    expect(taken?.available).toBe(false);
    expect(taken?.reason).toBe('booked');
  });

  it('rejects a slot whose end time no longer matches', async () => {
    const [service] = await backend.listServices();
    const { dateKey, day } = await firstAvailableDay(service!.id);
    const slot = day.slots.find((entry) => entry.available)!;

    const result = await backend.createBooking({
      serviceId: service!.id,
      dateKey,
      startTime: slot.startTime,
      expectedEndTime: '23:59',
      customer: { name: 'Aisha', phone: '91234567' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('slot_unavailable');
  });

  it('reschedules to another time and keeps the same appointment', async () => {
    const [service] = await backend.listServices();
    const { dateKey, day } = await firstAvailableDay(service!.id);
    const available = day.slots.filter((entry) => entry.available);
    const original = available[0]!;
    const target = available[available.length - 1]!;

    const created = await backend.createBooking({
      serviceId: service!.id,
      dateKey,
      startTime: original.startTime,
      customer: { name: 'Maryam', phone: '91234567' },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const moved = await backend.reschedule({
      manageToken: created.appointment.manageToken,
      dateKey,
      startTime: target.startTime,
    });

    expect(moved.ok).toBe(true);
    if (!moved.ok) return;

    expect(moved.appointment.id).toBe(created.appointment.id);
    expect(moved.appointment.startTime).toBe(target.startTime);
    expect(moved.appointment.endTime).toBe(target.endTime);
    expect(moved.appointment.referenceCode).toBe(created.appointment.referenceCode);
  });

  it('lets an appointment keep its own time when rescheduling', async () => {
    const [service] = await backend.listServices();
    const { dateKey, day } = await firstAvailableDay(service!.id);
    const slot = day.slots.find((entry) => entry.available)!;

    const created = await backend.createBooking({
      serviceId: service!.id,
      dateKey,
      startTime: slot.startTime,
      customer: { name: 'Maryam', phone: '91234567' },
    });
    if (!created.ok) throw new Error('setup failed');

    const moved = await backend.reschedule({
      manageToken: created.appointment.manageToken,
      dateKey,
      startTime: slot.startTime,
    });

    expect(moved.ok).toBe(true);
  });

  it('cancels an appointment and releases the slot', async () => {
    const [service] = await backend.listServices();
    const { dateKey, day } = await firstAvailableDay(service!.id);
    const slot = day.slots.find((entry) => entry.available)!;

    const created = await backend.createBooking({
      serviceId: service!.id,
      dateKey,
      startTime: slot.startTime,
      customer: { name: 'Maryam', phone: '91234567' },
    });
    if (!created.ok) throw new Error('setup failed');

    const cancelled = await backend.cancel(created.appointment.manageToken);
    expect(cancelled?.status).toBe('cancelled');

    const after = await backend.getDayAvailability({ serviceId: service!.id, dateKey });
    expect(after.slots.find((entry) => entry.startTime === slot.startTime)?.available).toBe(true);
  });

  it('finds an appointment by reference only when the phone matches', async () => {
    const [service] = await backend.listServices();
    const { dateKey, day } = await firstAvailableDay(service!.id);
    const slot = day.slots.find((entry) => entry.available)!;

    const created = await backend.createBooking({
      serviceId: service!.id,
      dateKey,
      startTime: slot.startTime,
      customer: { name: 'Maryam', phone: '+968 9123 4567' },
    });
    if (!created.ok) throw new Error('setup failed');

    const wrongPhone = await backend.lookupByReference(created.appointment.referenceCode, '+968 9999 9999');
    expect(wrongPhone.ok).toBe(false);

    const rightPhone = await backend.lookupByReference(
      created.appointment.referenceCode.toLowerCase(),
      '91234567',
    );
    expect(rightPhone.ok).toBe(true);
    if (rightPhone.ok) {
      expect(rightPhone.appointment.manageToken).toBe(created.appointment.manageToken);
    }
  });

  it('never returns an appointment for an unknown or malformed token', async () => {
    const shortToken = await backend.getByToken('abc');
    expect(shortToken.ok).toBe(false);

    const unknownToken = await backend.getByToken('f'.repeat(64));
    expect(unknownToken.ok).toBe(false);

    const reschedule = await backend.reschedule({
      manageToken: 'f'.repeat(64),
      dateKey: '2030-01-01',
      startTime: '10:00',
    });
    expect(reschedule.ok).toBe(false);

    expect(await backend.cancel('f'.repeat(64))).toBeNull();
  });

  it('rejects booking a service that does not exist', async () => {
    const result = await backend.createBooking({
      serviceId: 'svc-does-not-exist',
      dateKey: clinicClock().dateKey,
      startTime: '10:00',
      customer: { name: 'Maryam', phone: '91234567' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('service_not_found');
  });

  it('reports the times the customer already sees', async () => {
    const [service] = await backend.listServices();
    const { day } = await firstAvailableDay(service!.id);
    const slot = day.slots[0]!;

    // Sanity: the interface receives 12-hour labels from 24-hour values.
    expect(formatTime(slot.startTime)).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    expect(slot.endTime > slot.startTime).toBe(true);
  });
});
