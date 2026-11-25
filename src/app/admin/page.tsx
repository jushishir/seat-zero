import Link from 'next/link';
import { Suspense } from 'react';
import { SignOutButton } from '@/components/sign-out-button';
import { requireAdminSession } from '@/lib/auth-service';

async function AdminShell() {
  const session = await requireAdminSession();

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-neutral-200 bg-white p-8">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold">SeatZero Admin</h1>
          <p className="text-sm text-neutral-600">
            Signed in as {session.user.email} (MFA Verified ✓)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Storefront
          </Link>
          <SignOutButton />
        </div>
      </div>
      <p className="mt-6 text-sm text-neutral-700">
        আপনার Admin সেশন ও 2FA সুরক্ষা ১০০% সক্রিয়! পরের পাঠে (পাঠ ১৫) এখানে
        ইভেন্ট, বুকিং, চেক-ইন এবং অডিট লগ ড্যাশবোর্ড যুক্ত হবে।
      </p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-900">
      <Suspense
        fallback={<div className="text-center text-sm">Checking access...</div>}
      >
        <AdminShell />
      </Suspense>
    </div>
  );
}
