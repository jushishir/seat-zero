'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatPrice } from '@/lib/format';

type CheckoutFormProps = {
  eventId: string;
  quantity: number;
  totalMinor: number;
  currency: string;
};

export function CheckoutForm({
  eventId,
  quantity,
  totalMinor,
  currency,
}: CheckoutFormProps) {
  const router = useRouter();

  // পেজ লোডের সময় একবারই Idempotency-Key তৈরি হয়ে স্থির থাকবে
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          eventId,
          quantity,
          buyerName,
          buyerEmail,
          buyerPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'চেকআউট করতে সমস্যা হয়েছে।');
        setIsSubmitting(false);
        return;
      }

      // অর্ডার ও সিট লক সফল হলে Mock Payment পেজে পাঠাবে
      router.push(data.paymentUrl);
    } catch {
      setErrorMsg('নেটওয়ার্ক সমস্যা হয়েছে, আবার চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Full Name *
        </label>
        <input
          type="text"
          required
          minLength={2}
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Tanvir Ahmed"
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Email Address * (টিকিট এখানে পাঠানো হবে)
        </label>
        <input
          type="email"
          required
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          placeholder="tanvir@example.com"
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Phone Number *
        </label>
        <input
          type="tel"
          required
          minLength={6}
          value={buyerPhone}
          onChange={(e) => setBuyerPhone(e.target.value)}
          placeholder="+880 1700-000000"
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {isSubmitting
          ? 'Reserving seats...'
          : `Continue to Payment (${formatPrice(totalMinor, currency)})`}
      </button>
    </form>
  );
}
