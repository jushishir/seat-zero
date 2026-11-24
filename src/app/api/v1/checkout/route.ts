import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CheckoutInputSchema, createPendingCheckout } from '@/modules/orders';

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('idempotency-key')?.trim();

  if (!idempotencyKey || idempotencyKey.length < 8) {
    return NextResponse.json(
      { error: 'Idempotency-Key হেডার দেওয়া বাধ্যতামূলক।' },
      { status: 400 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'সঠিক JSON পাঠান।' }, { status: 400 });
  }

  const parsed = CheckoutInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'ইনপুট তথ্য সঠিক নয়।',
        details: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await createPendingCheckout(parsed.data, idempotencyKey);

    // যদি নতুন অর্ডার তৈরি হয়ে থাকে, তবে স্টোরফ্রন্টের ক্যাশ রিফ্রেশ করে দেওয়া
    if (result.status === 201 && result.eventSlug) {
      revalidateTag('events', 'max');
      revalidateTag(`event-${result.eventSlug}`, 'max');
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Checkout failed:', error);
    return NextResponse.json(
      { error: 'সার্ভারে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।' },
      { status: 500 },
    );
  }
}
