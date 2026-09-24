export interface NavItem {
  label: string;
  href: string;
}

/** Primary navigation. The `/admin` area is deliberately absent. */
export const primaryNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Book Appointment', href: '/book' },
  { label: 'Location', href: '/location' },
];

export const footerNav: NavItem[] = [
  { label: 'Services', href: '/services' },
  { label: 'Book an appointment', href: '/book' },
  { label: 'Visit us', href: '/location' },
  { label: 'Manage appointment', href: '/manage' },
];
