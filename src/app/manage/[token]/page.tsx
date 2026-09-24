import type { Metadata } from 'next';

import { ManageAppointmentView } from '@/components/manage/manage-appointment-view';
import { Container } from '@/components/ui/container';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Your Appointment',
  description: 'View, reschedule or cancel your appointment at Chic by Sisters Clinic.',
  robots: { index: false, follow: false, nocache: true },
});

/**
 * Secure appointment page.
 *
 * The token in the path is passed straight to the backend, which is the only
 * thing allowed to decide what is returned. `noindex` and the route-level
 * `X-Robots-Tag` header keep this page out of search results.
 */
export default async function ManageAppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <Container className="py-14 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-eyebrow">Appointments</p>
        <h1 className="mt-4 font-serif text-[2rem] leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
          Your Appointment
        </h1>
        <p className="text-ink-soft mt-5 text-[0.9375rem] leading-relaxed">
          Reschedule or cancel below. Changes take effect immediately.
        </p>
      </div>

      <div className="mt-10 max-w-2xl">
        <ManageAppointmentView token={token} />
      </div>
    </Container>
  );
}
