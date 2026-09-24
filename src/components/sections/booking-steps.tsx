import { CalendarDays, CheckCircle2, ClipboardList, Clock3, Sparkles } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';

const steps = [
  {
    icon: Sparkles,
    title: 'Choose your treatment',
    detail: 'See each appointment’s duration before you commit to a time.',
  },
  {
    icon: CalendarDays,
    title: 'Pick a date',
    detail: 'The calendar shows which days are open and which are already full.',
  },
  {
    icon: Clock3,
    title: 'Choose a time',
    detail: 'Real availability — reserved times are crossed out, so nothing clashes.',
  },
  {
    icon: ClipboardList,
    title: 'Add your details',
    detail: 'Name and mobile number. Email and notes are optional.',
  },
  {
    icon: CheckCircle2,
    title: 'Confirmed, with options',
    detail: 'Add it to your calendar, then reschedule or cancel later if you need to.',
  },
];

/** Explains the booking experience before the customer starts it. */
export function BookingSteps() {
  return (
    <section
      aria-labelledby="how-booking-works"
      className="border-line bg-cream/40 border-y py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Booking"
              title="Five short steps, no phone call"
              intro="The whole appointment takes about a minute to arrange. Everything can be reviewed before you confirm, and changed afterwards."
            />
            <div className="mt-8">
              <ButtonLink href="/book" variant="primary" size="lg">
                Start booking
              </ButtonLink>
            </div>
          </div>

          <ol id="how-booking-works" className="flex flex-col">
            {steps.map(({ icon: Icon, title, detail }, index) => (
              <li
                key={title}
                className="border-line flex gap-5 border-b py-5 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="flex flex-col items-center">
                  <span className="border-line bg-ivory text-accent grid size-10 shrink-0 place-items-center border">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {index < steps.length - 1 ? (
                    <span aria-hidden="true" className="bg-line mt-2 w-px flex-1" />
                  ) : null}
                </span>
                <div className="pb-1">
                  <h3 className="text-ink font-sans text-[0.9375rem] font-medium tracking-[0.01em]">
                    {title}
                  </h3>
                  <p className="text-ink-soft mt-1.5 text-[0.875rem] leading-relaxed">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
