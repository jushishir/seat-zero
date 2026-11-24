import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { MockPayActions } from '@/components/mock-pay-actions';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { formatPrice } from '@/lib/format';

type MockPayProps = {
  params: Promise<{ orderId: string }>;
};

async function MockPayContent({ params }: MockPayProps) {
  const { orderId } = await params;
  const validId = z.uuid().safeParse(orderId);
  if (!validId.success) {
    notFound();
  }

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      buyerName: orders.buyerName,
      totalMinor: orders.totalMinor,
      currency: orders.currency,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, validId.data))
    .limit(1);

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Mock Payment Gateway
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {order.status.toUpperCase()}
        </span>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <p className="text-neutral-500">
          Order Number:{' '}
          <strong className="font-mono text-neutral-900">
            {order.orderNumber}
          </strong>
        </p>
        <p className="text-neutral-500">
          Buyer: <strong className="text-neutral-900">{order.buyerName}</strong>
        </p>
        <p className="text-neutral-500">
          Amount to Pay:{' '}
          <strong className="text-xl text-neutral-900">
            {formatPrice(order.totalMinor, order.currency)}
          </strong>
        </p>
      </div>

      <MockPayActions orderId={order.id} status={order.status} />

      <Link
        href="/"
        className="mt-5 block text-center text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        ← Back to events
      </Link>
    </div>
  );
}

export default function MockPayPage({ params }: MockPayProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Suspense
        fallback={
          <div className="text-sm text-neutral-500">Loading payment...</div>
        }
      >
        <MockPayContent params={params} />
      </Suspense>
    </div>
  );
}
