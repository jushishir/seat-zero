import Link from 'next/link';
import { SignOutButton } from '@/components/sign-out-button';

export function AdminNav({ email }: { email: string }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-lg font-bold tracking-tight">
            SeatZero Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-neutral-600">
            <Link href="/admin" className="hover:text-neutral-900">
              Events
            </Link>
            <Link href="/admin/bookings" className="hover:text-neutral-900">
              Bookings & Check-in
            </Link>
            <Link href="/admin/audit" className="hover:text-neutral-900">
              Audit Log
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-neutral-500 sm:inline">
            {email}
          </span>
          <Link
            href="/"
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            Storefront →
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
