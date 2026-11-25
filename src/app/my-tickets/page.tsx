import { and, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SignOutButton } from '@/components/sign-out-button';
import { db } from '@/db';
import { events, orders, ticketPasses } from '@/db/schema';
import { formatEventDate } from '@/lib/format';
import { getServerSession } from '@/lib/auth-service';

async function MyTicketsContent() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }

  const email = session.user.email.toLowerCase();

  // ক্রেতার ইমেইল অনুযায়ী সব অ্যাক্টিভ টিকিট পাস নিয়ে আসা (Ownership check)
  const myPasses = await db
    .select({
      passId: ticketPasses.id,
      passCode: ticketPasses.passCode,
      status: ticketPasses.status,
      eventTitle: events.title,
      eventStartsAt: events.eventStartsAt,
      venueLabel: events.venueLabel,
      orderNumber: orders.orderNumber,
    })
    .from(ticketPasses)
    .innerJoin(orders, eq(ticketPasses.orderId, orders.id))
    .innerJoin(events, eq(ticketPasses.eventId, events.id))
    .where(and(eq(orders.buyerEmail, email), eq(orders.status, 'paid')))
    .orderBy(desc(ticketPasses.createdAt));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <p className="text-sm text-neutral-600">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {session.user.role === 'admin' && (
            <Link
              href="/admin"
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              Admin Panel
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      {myPasses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-neutral-600">
            এই ইমেইলে এখনো কোনো কনফার্মড টিকিট পাওয়া যায়নি।
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            ইভেন্ট দেখুন
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myPasses.map((item) => (
            <div
              key={item.passId}
              className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center"
            >
              <div>
                <p className="text-xs text-neutral-500">
                  Order: {item.orderNumber} •{' '}
                  {formatEventDate(item.eventStartsAt)}
                </p>
                <h2 className="mt-1 text-lg font-bold">{item.eventTitle}</h2>
                <p className="text-sm text-neutral-600">{item.venueLabel}</p>
              </div>
              <div className="rounded-lg bg-neutral-900 px-4 py-2 text-center font-mono text-base font-bold tracking-widest text-white">
                {item.passCode}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyTicketsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold">
            SeatZero
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Events
          </Link>
        </div>
      </header>
      <main className="px-4 py-10">
        <Suspense
          fallback={
            <div className="text-center text-sm text-neutral-500">
              Loading tickets...
            </div>
          }
        >
          <MyTicketsContent />
        </Suspense>
      </main>
    </div>
  );
}
