'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatPrice } from '@/lib/format';

type BookingBoxProps = {
  slug: string;
  priceMinor: number;
  currency: string;
  availableSeats: number;
};

export function BookingBox({
  slug,
  priceMinor,
  currency,
  availableSeats,
}: BookingBoxProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);

  const isSoldOut = availableSeats === 0;
  const maxAllowed = Math.min(5, availableSeats);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold">
          {formatPrice(priceMinor, currency)}
        </span>
        <span className="text-sm text-neutral-500">/ ticket</span>
      </div>

      <p className="mt-2 text-sm font-medium text-neutral-700">
        {isSoldOut ? (
          <span className="text-neutral-500">Status: Sold Out</span>
        ) : availableSeats <= 5 ? (
          <span className="text-amber-700">
            Status: Only {availableSeats} seats left!
          </span>
        ) : (
          <span className="text-emerald-700">
            Status: {availableSeats} seats available
          </span>
        )}
      </p>

      {!isSoldOut && (
        <div className="mt-5">
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Quantity (Max {maxAllowed})
          </label>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 font-bold hover:bg-neutral-100 disabled:opacity-40"
            >
              -
            </button>
            <span className="w-8 text-center text-base font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
              disabled={quantity >= maxAllowed}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 font-bold hover:bg-neutral-100 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={isSoldOut}
        onClick={() =>
          router.push(
            `/checkout?event=${encodeURIComponent(slug)}&qty=${quantity}`,
          )
        }
        className="mt-6 w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600"
      >
        {isSoldOut
          ? 'Sold Out'
          : `Continue to Checkout • ${formatPrice(priceMinor * quantity, currency)}`}
      </button>
    </div>
  );
}
