import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/modules/payments';

export async function POST(req: Request) {
  // অবশ্যই raw text হিসেবে নিতে হবে, req.json() নয়
  const rawBody = await req.text();
  const signature = req.headers.get('x-webhook-signature');

  try {
    const result = await processPaymentWebhook(rawBody, signature, 'mock');

    for (const slug of result.slugs) {
      revalidateTag(`event-${slug}`, 'max');
    }
    if (result.slugs.length > 0) {
      revalidateTag('events', 'max');
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
