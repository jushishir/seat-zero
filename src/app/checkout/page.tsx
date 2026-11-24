import Link from 'next/link';
import { Suspense } from 'react';
import { CheckoutForm } from '@/components/checkout-form';
import { formatEventDate, formatPrice } from '@/lib/format';
import { getEventBySlug } from '@/modules/catalog';

type CheckoutPageProps = {
  searchParams: Promise<{ event?: string; qty?: string }>;
};

async function CheckoutContent({ searchParams }: CheckoutPageProps) {
  const { event: slug, qty } = await searchParams;

  if (!slug) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-neutral-600">কোনো ইভেন্ট নির্বাচন করা হয়নি।</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          ইভেন্ট দেখুন
        </Link>
      </div>
    );
  }

  const event = await getEventBySlug(slug);
  if (!event || event.availableSeats === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-neutral-600">
          ইভেন্টটি পাওয়া যায়নি অথবা সব সিট বিক্রি হয়ে গেছে।
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          অন্য ইভেন্ট দেখুন
        </Link>
      </div>
    );
  }

  const parsedQty = Number.parseInt(qty ?? '1', 10);
  const safeQty = Math.min(
    Math.min(5, event.availableSeats),
    Math.max(1, Number.isNaN(parsedQty) ? 1 : parsedQty),
  );
  const totalMinor = event.priceMinor * safeQty;

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
      {/* বাম পাশে: ফর্ম */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 md:col-span-3">
        <h1 className="text-xl font-bold">Attendee Information</h1>
        <p className="mt-1 text-sm text-neutral-500">
          কোনো অ্যাকাউন্ট ছাড়াই দ্রুত টিকিট বুক করুন।
        </p>
        <div className="mt-6">
          <CheckoutForm
            eventId={event.id}
            quantity={safeQty}
            totalMinor={totalMinor}
            currency={event.currency}
          />
        </div>
      </div>

      {/* ডান পাশে: অর্ডার সারাংশ */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 md:col-span-2 md:self-start">
        <h2 className="text-base font-bold">Order Summary</h2>
        <div className="mt-4 space-y-2 border-b border-neutral-100 pb-4 text-sm">
          <p className="font-semibold text-neutral-900">{event.title}</p>
          <p className="text-neutral-500">
            {formatEventDate(event.eventStartsAt)}
          </p>
          <div className="flex justify-between pt-2 text-neutral-700">
            <span>
              {formatPrice(event.priceMinor, event.currency)} × {safeQty}
            </span>
            <span className="font-medium">
              {formatPrice(totalMinor, event.currency)}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(totalMinor, event.currency)}</span>
        </div>
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Continue চাপার পর আপনার সিটগুলো ১০ মিনিটের জন্য সংরক্ষিত থাকবে।
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage({ searchParams }: CheckoutPageProps) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold">
            SeatZero
          </Link>
          <span className="text-xs font-medium text-neutral-500">
            Secure Guest Checkout
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <Suspense
          fallback={
            <div className="py-12 text-center text-sm text-neutral-500">
              Loading checkout...
            </div>
          }
        >
          <CheckoutContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
