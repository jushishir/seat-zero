'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function MockPayActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<'succeeded' | 'failed' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (status !== 'pending') {
    return (
      <button
        type="button"
        onClick={() => router.push(`/orders/${orderId}/confirmation`)}
        className="mt-6 w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
      >
        অর্ডার স্ট্যাটাস ও টিকিট দেখুন →
      </button>
    );
  }

  async function simulate(outcome: 'succeeded' | 'failed') {
    setLoading(outcome);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/mock-pay/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, outcome }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'সমস্যা হয়েছে');
        setLoading(null);
        return;
      }

      router.push(data.redirectUrl);
      router.refresh();
    } catch {
      setErrorMsg('নেটওয়ার্ক সমস্যা হয়েছে।');
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      {errorMsg && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {errorMsg}
        </p>
      )}

      <button
        type="button"
        disabled={loading !== null}
        onClick={() => simulate('succeeded')}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading === 'succeeded'
          ? 'Processing payment...'
          : '✓ Simulate Payment Success'}
      </button>

      <button
        type="button"
        disabled={loading !== null}
        onClick={() => simulate('failed')}
        className="w-full rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {loading === 'failed' ? 'Cancelling...' : '✕ Simulate Payment Failed'}
      </button>
    </div>
  );
}
