import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { db } from '@/db';
import { orderItems, orders, ticketPasses } from '@/db/schema';
import { formatPrice } from '@/lib/format';

type ConfirmationProps = {
  params: Promise<{ orderId: string }>;
};

async function ConfirmationContent({ params }: ConfirmationProps) {
  const { orderId } = await params;
  const validId = z.uuid().safeParse(orderId);
  if (!validId.success) {
    notFound();
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, validId.data))
    .limit(1);

  if (!order) {
    notFound();
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const passes = await db
    .select()
    .from(ticketPasses)
    .where(eq(ticketPasses.orderId, order.id));

  const isPaid = order.status === 'paid';

  return (
    <div className="mx-auto max-w-xl">
      {/* স্ট্যাটাস হেডার */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        {isPaid ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-bold text-neutral-900">
              Booking Confirmed!
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              আপনার টিকিটগুলো তৈরি হয়েছে ({order.buyerEmail})।
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-neutral-900">
              Order Status: {order.status.toUpperCase()}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {order.status === 'cancelled'
                ? 'পেমেন্ট বাতিল হয়েছে এবং সংরক্ষিত সিটগুলো ফেরত দেওয়া হয়েছে।'
                : order.status === 'refund_required'
                  ? 'সময় পেরিয়ে যাওয়ায় সিট খালি নেই। আপনার পেমেন্ট রিফান্ড করা হবে।'
                  : 'পেমেন্ট এখনো সম্পন্ন হয়নি।'}
            </p>
          </>
        )}

        <div className="mt-5 flex justify-between border-t border-neutral-100 pt-4 text-sm">
          <span className="text-neutral-500">Order: {order.orderNumber}</span>
          <span className="font-bold text-neutral-900">
            Total: {formatPrice(order.totalMinor, order.currency)}
          </span>
        </div>
      </div>

      {/* ডিজিটাল টিকিট পাস কার্ডগুলো */}
      {isPaid && passes.length > 0 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Your Digital Ticket Passes ({passes.length})
          </h2>

          {passes.map((pass, idx) => (
            <div
              key={pass.id}
              className="rounded-xl border-2 border-dashed border-neutral-300 bg-white p-5"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
                <span>SEATZERO PASS #{idx + 1}</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
                  ACTIVE
                </span>
              </div>

              <h3 className="mt-2 text-lg font-bold text-neutral-900">
                {items[0]?.eventTitleSnapshot}
              </h3>
              <p className="text-sm text-neutral-600">
                Attendee: {order.buyerName} ({order.buyerEmail})
              </p>

              <div className="mt-4 rounded-lg bg-neutral-900 px-4 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-white">
                {pass.passCode}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          ← Browse More Events
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage({ params }: ConfirmationProps) {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12 text-neutral-900">
      <Suspense
        fallback={
          <div className="text-center text-sm text-neutral-500">
            Loading your tickets...
          </div>
        }
      >
        <ConfirmationContent params={params} />
      </Suspense>
    </div>
  );
}
