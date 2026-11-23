import Link from 'next/link';
import { formatEventDate, formatPrice } from '@/lib/format';
import { getPublishedEvents } from '@/modules/catalog';

function SeatBadge({ availableSeats }: { availableSeats: number }) {
  if (availableSeats === 0) {
    return (
      <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700">
        Sold Out
      </span>
    );
  }

  if (availableSeats <= 5) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
        Only {availableSeats} left!
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
      Available ({availableSeats})
    </span>
  );
}

export default async function HomePage() {
  const eventsList = await getPublishedEvents();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            SeatZero
          </Link>
          <span className="text-sm text-neutral-500">Workshop Box Office</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Upcoming Workshops & Meetups
          </h1>
          <p className="mt-2 text-neutral-600">
            সরাসরি ও অনলাইন টেক ওয়ার্কশপের টিকিট বুক করুন কয়েক সেকেন্ডে।
          </p>
        </div>

        {eventsList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center text-neutral-500">
            এখনো কোনো ইভেন্ট পাবলিশ করা হয়নি।
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {eventsList.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-400 hover:shadow-sm"
              >
                {/* কভার ছবির জায়গা (Sprint 3-এ আসল ছবি বসবে) */}
                <div className="flex aspect-video items-center justify-center bg-neutral-100 text-sm font-medium text-neutral-400">
                  {event.coverImageUrl ? 'Cover Ready' : 'Workshop Banner'}
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <p className="text-xs font-medium text-neutral-500">
                      {formatEventDate(event.eventStartsAt)}
                    </p>
                    <h2 className="mt-1.5 text-lg font-semibold leading-snug group-hover:underline">
                      {event.title}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      {event.venueLabel}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                    <span className="text-base font-bold">
                      {formatPrice(event.priceMinor, event.currency)}
                    </span>
                    <SeatBadge availableSeats={event.availableSeats} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
