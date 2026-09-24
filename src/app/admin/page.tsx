import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@/components/ui/container';
import { getAdminUser } from '@/lib/supabase/server-client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Staff area',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Staff area — deliberately minimal.
 *
 * This route exists to lock in the security architecture before the dashboard
 * itself is built:
 *
 *   • Authorisation is decided on the server by `getAdminUser()`, which reads the
 *     Supabase Auth session from cookies and checks `app_metadata.role`.
 *   • The page is `noindex`, is not linked from any public navigation, and the
 *     route carries an `X-Robots-Tag: noindex` header.
 *   • Hiding the URL is *not* the control — an unauthenticated visitor sees
 *     nothing, and when the dashboard is built it will call `requireAdminUser()`
 *     before rendering any data, with Row Level Security enforced in the
 *     database as the second layer.
 *
 * The admin features themselves (appointments, services, staff, availability,
 * customers and the “Running Late” action) are specified in
 * `docs/ADMIN_DASHBOARD.md`; the SQL building blocks already exist in
 * `supabase/schema.sql`.
 */
export default async function AdminPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getAdminUser() : null;

  return (
    <Container className="py-16 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-eyebrow">Staff area</p>
        <h1 className="mt-4 font-serif text-[2.25rem] leading-tight sm:text-[2.75rem]">
          Admin dashboard — not built yet
        </h1>

        {!configured ? (
          <div className="border-nude text-ink-soft mt-6 border-l-2 pl-5 text-[1rem] leading-relaxed">
            <p>
              Supabase is not configured in this deployment, so there is no staff sign-in and no
              appointment data to manage yet. The public booking website is unaffected.
            </p>
            <p className="mt-4">
              Once <code className="text-[0.875rem]">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="text-[0.875rem]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set and{' '}
              <code className="text-[0.875rem]">supabase/schema.sql</code> has been applied, this
              page requires an authenticated staff account.
            </p>
          </div>
        ) : user ? (
          <div className="text-ink-soft mt-6 text-[1rem] leading-relaxed">
            <p>
              Signed in as <strong className="text-ink font-medium">{user.email}</strong> (role:{' '}
              {user.role}). The dashboard screens are defined in{' '}
              <Link href="/" className="border-line-strong border-b">
                the project documentation
              </Link>{' '}
              and are ready to be implemented on top of the existing database functions.
            </p>
          </div>
        ) : (
          <div className="text-ink-soft mt-6 text-[1rem] leading-relaxed">
            <p>
              <strong className="text-ink font-medium">Sign-in required.</strong> This area is only
              available to Chic by Sisters Clinic staff accounts created in Supabase Auth. Customers
              manage their own appointments from the confirmation link instead.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="border-line-strong text-ink hover:bg-cream inline-flex h-11 items-center justify-center border px-6 font-sans text-sm transition-colors"
          >
            Back to the website
          </Link>
          <Link
            href="/manage"
            className="border-line-strong text-ink hover:bg-cream inline-flex h-11 items-center justify-center border px-6 font-sans text-sm transition-colors"
          >
            Customer appointment management
          </Link>
        </div>
      </div>
    </Container>
  );
}
