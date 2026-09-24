import { Container } from '@/components/ui/container';
import { Spinner } from '@/components/ui/spinner';

/** Instant feedback while the appointment is fetched for the management view. */
export default function ManageAppointmentLoading() {
  return (
    <Container className="py-14 sm:py-16">
      <div className="max-w-2xl" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        <p className="text-eyebrow">Appointments</p>
        <div className="mt-4 flex items-center gap-3">
          <Spinner className="text-ink-muted size-4" />
          <p className="text-ink-soft font-serif text-[1.75rem]">Opening your appointment…</p>
        </div>
        <div className="mt-10 flex flex-col gap-4">
          <div className="skeleton border-line h-24 border" />
          <div className="skeleton border-line h-56 border" />
        </div>
      </div>
    </Container>
  );
}
