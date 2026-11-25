import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBar } from '@/components/search-bar';
import { formatEventDate, formatPrice } from '@/lib/format';
import { searchPublishedEvents } from '@/modules/catalog';

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

async function SearchResults({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams;
  const results = await searchPublishedEvents(q);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {q ? `Search results for "${q}"` : 'All Workshops'}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {results.length} টি ইভেন্ট পাওয়া গেছে
          </p>
        </div>
        <SearchBar defaultValue={q} />
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-600">
            "{q}" নামে কোনো ওয়ার্কশপ খুঁজে পাওয়া যায়নি।
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            সব ইভেন্ট দেখুন
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-400"
            >
              <div className="flex aspect-video items-center justify-center overflow-hidden bg-neutral-100 text-sm font-medium text-neutral-400">
                {event.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.coverImageUrl}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  'Workshop Banner'
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-neutral-500">
                    {formatEventDate(event.eventStartsAt)}
                  </p>
                  <h2 className="mt-1.5 text-lg font-semibold group-hover:underline">
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
                  <span className="text-xs font-medium text-neutral-600">
                    {event.availableSeats === 0
                      ? 'Sold Out'
                      : `${event.availableSeats} seats left`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            SeatZero
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <Suspense
          fallback={
            <div className="py-12 text-center text-sm text-neutral-500">
              Searching...
            </div>
          }
        >
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
