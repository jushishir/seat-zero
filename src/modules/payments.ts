import crypto from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  events,
  orderItems,
  orders,
  seatInventory,
  ticketPasses,
  webhookEvents,
} from '@/db/schema';

const WebhookPayloadSchema = z.object({
  eventId: z.string().min(4),
  type: z.enum(['payment.succeeded', 'payment.failed']),
  orderId: z.uuid(),
});

function getWebhookSecret(): string {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('WEBHOOK_SECRET is not configured');
  }
  return secret;
}

// ১. HMAC-SHA256 দিয়ে সিগনেচার তৈরি (Mock গেটওয়ে ব্যবহার করবে)
export function signWebhookPayload(rawBody: string): string {
  return crypto
    .createHmac('sha256', getWebhookSecret())
    .update(rawBody)
    .digest('hex');
}

// ২. নিরাপদভাবে সিগনেচার যাচাই (Timing Attack সুরক্ষাসহ)
export function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string | null,
): boolean {
  if (!receivedSignature) return false;

  const expected = signWebhookPayload(rawBody);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(receivedSignature, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// ৩. প্রতি আসনের জন্য ইউনিক টিকিট কোড তৈরি: যেমন "SZ-4A9F-1B2C"
function generatePassCode(): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SZ-${part1}-${part2}`;
}

export async function processPaymentWebhook(
  rawBody: string,
  signature: string | null,
  provider = 'mock',
): Promise<{ status: number; body: Record<string, unknown>; slugs: string[] }> {
  // ক. সিগনেচার ভুল হলে সাথে সাথে 401 দিয়ে ফেরত পাঠানো
  if (!verifyWebhookSignature(rawBody, signature)) {
    return {
      status: 401,
      body: { error: 'Invalid webhook signature' },
      slugs: [],
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'Invalid JSON' }, slugs: [] };
  }

  const parsed = WebhookPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      status: 400,
      body: { error: 'Invalid webhook payload' },
      slugs: [],
    };
  }

  const { eventId, type, orderId } = parsed.data;

  // খ. ইভেন্ট Deduplication: আগে প্রসেস হয়ে থাকলে ডুপ্লিকেট হিসেবে এড়িয়ে যাবে
  const [insertedWebhook] = await db
    .insert(webhookEvents)
    .values({
      provider,
      providerEventId: eventId,
      payload: parsed.data,
      status: 'received',
    })
    .onConflictDoNothing({
      target: [webhookEvents.provider, webhookEvents.providerEventId],
    })
    .returning({ id: webhookEvents.id });

  if (!insertedWebhook) {
    return {
      status: 200,
      body: { received: true, duplicate: true },
      slugs: [],
    };
  }

  const touchedSlugs: string[] = [];

  try {
    await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // আগেই পেমেন্ট কনফার্ম হয়ে থাকলে আর কিছু করার দরকার নেই
      if (order.status === 'paid') {
        return;
      }

      const items = await tx
        .select({
          eventId: orderItems.eventId,
          quantity: orderItems.quantity,
          slug: events.slug,
        })
        .from(orderItems)
        .innerJoin(events, eq(orderItems.eventId, events.id))
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        touchedSlugs.push(item.slug);
      }

      // যদি পেমেন্ট ব্যর্থ হয় এবং অর্ডার এখনো pending থাকে -> সিট ছেড়ে দেওয়া
      if (type === 'payment.failed') {
        if (order.status === 'pending') {
          for (const item of items) {
            await tx
              .update(seatInventory)
              .set({
                availableSeats: sql`${seatInventory.availableSeats} + ${item.quantity}`,
                reservedSeats: sql`${seatInventory.reservedSeats} - ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(seatInventory.eventId, item.eventId));
          }
          await tx
            .update(orders)
            .set({ status: 'cancelled' })
            .where(eq(orders.id, order.id));
        }
        return;
      }

      // যদি পেমেন্ট সফল হয়:
      if (order.status === 'pending') {
        // স্বাভাবিক পথ: reserved সিটগুলো sold-এ রূপান্তর + টিকিট পাস তৈরি
        for (const item of items) {
          await tx
            .update(seatInventory)
            .set({
              reservedSeats: sql`${seatInventory.reservedSeats} - ${item.quantity}`,
              soldSeats: sql`${seatInventory.soldSeats} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(seatInventory.eventId, item.eventId));

          const passes = Array.from({ length: item.quantity }, () => ({
            orderId: order.id,
            eventId: item.eventId,
            passCode: generatePassCode(),
            attendeeEmail: order.buyerEmail,
            status: 'active',
          }));
          await tx.insert(ticketPasses).values(passes);
        }

        await tx
          .update(orders)
          .set({ status: 'paid', paidAt: new Date() })
          .where(eq(orders.id, order.id));
      } else if (order.status === 'expired') {
        // Race Condition সুরক্ষা: অর্ডার expire হয়ে যাওয়ার পর দেরিতে পেমেন্ট এলে
        let allRecovered = true;

        for (const item of items) {
          const [recovered] = await tx
            .update(seatInventory)
            .set({
              availableSeats: sql`${seatInventory.availableSeats} - ${item.quantity}`,
              soldSeats: sql`${seatInventory.soldSeats} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(seatInventory.eventId, item.eventId),
                gte(seatInventory.availableSeats, item.quantity),
              ),
            )
            .returning({ eventId: seatInventory.eventId });

          if (!recovered) {
            allRecovered = false;
            break;
          }
        }

        if (!allRecovered) {
          // অন্য কেউ সিট কিনে ফেললে ওভারসেল না করে refund_required মার্ক করা
          await tx
            .update(orders)
            .set({ status: 'refund_required' })
            .where(eq(orders.id, order.id));
          return;
        }

        for (const item of items) {
          const passes = Array.from({ length: item.quantity }, () => ({
            orderId: order.id,
            eventId: item.eventId,
            passCode: generatePassCode(),
            attendeeEmail: order.buyerEmail,
            status: 'active',
          }));
          await tx.insert(ticketPasses).values(passes);
        }

        await tx
          .update(orders)
          .set({ status: 'paid', paidAt: new Date() })
          .where(eq(orders.id, order.id));
      }
    });

    await db
      .update(webhookEvents)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(webhookEvents.id, insertedWebhook.id));

    return { status: 200, body: { received: true }, slugs: touchedSlugs };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await db
      .update(webhookEvents)
      .set({ status: 'failed', errorMessage: message })
      .where(eq(webhookEvents.id, insertedWebhook.id));

    throw err;
  }
}
