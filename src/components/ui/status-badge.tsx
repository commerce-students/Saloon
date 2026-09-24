import type { AppointmentStatus } from '@/lib/booking/types';

import { Badge, type BadgeTone } from './badge';

const statusMap: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Awaiting confirmation', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  'no-show': { label: 'Not attended', tone: 'danger' },
  rescheduled: { label: 'Rescheduled', tone: 'accent' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, tone } = statusMap[status] ?? statusMap.pending;
  return <Badge tone={tone}>{label}</Badge>;
}
