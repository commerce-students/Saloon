import type { Metadata } from 'next';

import { AppointmentLookup } from '@/components/manage/appointment-lookup';
import { RecentAppointments } from '@/components/manage/recent-appointments';
import { Container } from '@/components/ui/container';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Manage Your Appointment',
  description:
    'View, reschedule or cancel your appointment at Chic by Sisters Clinic using your secure management link.',
  alternates: { canonical: '/manage' },
  robots: { index: false, follow: false },
});

/**
 * Management hub.
 *
 * Two ways in: the appointments this device remembers, or a reference code plus
 * the mobile number used to book. The `/manage/[token]` page itself is the
 * secure entry point and is never linked from the public navigation.
 */
export default function ManagePage() {
  return (
    <Container className="py-14 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-eyebrow">Appointments</p>
        <h1 className="mt-4 font-serif text-[2.25rem] leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">
          Manage your appointment
        </h1>
        <p className="text-ink-soft mt-6 text-[1.0625rem] leading-relaxed">
          Reschedule or cancel without calling the clinic. For your privacy, each appointment is
          opened with its own secure link — you can also look one up using your reference code and
          mobile number.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <h2 className="text-eyebrow mb-5">On this device</h2>
          <RecentAppointments />
        </div>

        <div>
          <AppointmentLookup />
        </div>
      </div>

      <div className="border-line mt-12 max-w-2xl border-t pt-8">
        <h2 className="text-eyebrow">How your appointment is protected</h2>
        <p className="text-ink-soft mt-4 text-[0.875rem] leading-relaxed">
          Every appointment gets a long, random management link. The link is the key: the booking
          system will only return an appointment to someone who holds it, and simply hiding a URL is
          never treated as security. When the clinic’s Supabase project is connected, the same rule
          is enforced in the database, so even a tampered request cannot read or change someone
          else’s appointment.
        </p>
      </div>
    </Container>
  );
}
