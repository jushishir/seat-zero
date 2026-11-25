import crypto from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendTicketEmail } from '@/adapters/email';
import { processPaymentWebhook, signWebhookPayload } from '@/modules/payments';

const SimulateSchema = z.object({
  orderId: z.uuid(),
  outcome: z.enum(['succeeded', 'failed']),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SimulateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { orderId, outcome } = parsed.data;

  const webhookBody = JSON.stringify({
    eventId: `mock_${crypto.randomUUID()}`,
    type: outcome === 'succeeded' ? 'payment.succeeded' : 'payment.failed',
    orderId,
  });

  const signature = signWebhookPayload(webhookBody);

  try {
    const result = await processPaymentWebhook(webhookBody, signature, 'mock');

    for (const slug of result.slugs) {
      revalidateTag(`event-${slug}`, 'max');
    }
    if (result.slugs.length > 0) {
      revalidateTag('events', 'max');
    }

    if (result.emailPayload) {
      const emailData = result.emailPayload;
      after(async () => {
        await sendTicketEmail(emailData);
      });
    }

    return NextResponse.json(
      { ok: true, redirectUrl: `/orders/${orderId}/confirmation` },
      { status: result.status },
    );
  } catch (error) {
    console.error('Mock payment simulation failed:', error);
    return NextResponse.json(
      { error: 'পেমেন্ট প্রসেস করতে সমস্যা হয়েছে।' },
      { status: 500 },
    );
  }
}
