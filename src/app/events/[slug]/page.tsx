import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BookingBox } from '@/components/booking-box';
import { formatEventDate } from '@/lib/format';
import { getEventBySlug } from '@/modules/catalog';

type PageProps = {
  params: Promise<{ slug: string }>;
};

// ব্রাউজার ট্যাবের টাইটেল ও SEO-র জন্য ডায়নামিক মেটাডেটা
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return { title: 'Event Not Found | SeatZero' };
  }

  return {
    title: `${event.title} | SeatZero`,
    description: event.description,
  };
}

// মূল ডায়নামিক অংশটি আলাদা async কম্পোনেন্টে রাখা হয়েছে যাতে <Suspense>-এর ভেতরে চলে
async function EventDetailContent({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 aspect-[21/9] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 flex items-center justify-center text-neutral-400 font-medium">
        {event.coverImageUrl ? 'Event Cover Ready' : 'Event Cover Banner'}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* বাম পাশে: ইভেন্টের বিস্তারিত (Server-rendered, Zero JS) */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            {event.title}
          </h1>

          <div className="mt-4 space-y-1 text-sm text-neutral-600">
            <p>
              <strong className="text-neutral-900">Date & Time:</strong>{' '}
              {formatEventDate(event.eventStartsAt)} (+06)
            </p>
            <p>
              <strong className="text-neutral-900">Venue:</strong>{' '}
              {event.venueLabel}
            </p>
          </div>

          <div className="mt-8 border-t border-neutral-200 pt-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              About this workshop
            </h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-neutral-700">
              {event.description}
            </p>
          </div>
        </div>

        {/* ডান পাশে: টিকিট বাছাইয়ের Client Component */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <BookingBox
            slug={event.slug}
            priceMinor={event.priceMinor}
            currency={event.currency}
            availableSeats={event.availableSeats}
          />
        </div>
      </div>
    </main>
  );
}

export default function EventDetailPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            ← Back to all events
          </Link>
          <Link href="/" className="text-lg font-bold tracking-tight">
            SeatZero
          </Link>
        </div>
      </header>

      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-neutral-500">
            Loading event details...
          </div>
        }
      >
        <EventDetailContent params={params} />
      </Suspense>
    </div>
  );
}
