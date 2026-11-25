import crypto from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { TicketEmailPayload } from '@/adapters/email';
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

export function signWebhookPayload(rawBody: string): string {
  return crypto
    .createHmac('sha256', getWebhookSecret())
    .update(rawBody)
    .digest('hex');
}

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

function generatePassCode(): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SZ-${part1}-${part2}`;
}

export async function processPaymentWebhook(
  rawBody: string,
  signature: string | null,
  provider = 'mock',
): Promise<{
  status: number;
  body: Record<string, unknown>;
  slugs: string[];
  emailPayload?: TicketEmailPayload;
}> {
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
  let emailPayload: TicketEmailPayload | undefined;

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

      if (order.status === 'paid') {
        return;
      }

      const items = await tx
        .select({
          eventId: orderItems.eventId,
          quantity: orderItems.quantity,
          eventTitle: orderItems.eventTitleSnapshot,
          slug: events.slug,
        })
        .from(orderItems)
        .innerJoin(events, eq(orderItems.eventId, events.id))
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        touchedSlugs.push(item.slug);
      }

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

      const allPassCodes: string[] = [];

      if (order.status === 'pending') {
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

          const insertedPasses = await tx
            .insert(ticketPasses)
            .values(passes)
            .returning({ passCode: ticketPasses.passCode });
          allPassCodes.push(...insertedPasses.map((p) => p.passCode));
        }

        await tx
          .update(orders)
          .set({ status: 'paid', paidAt: new Date() })
          .where(eq(orders.id, order.id));
      } else if (order.status === 'expired') {
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

          const insertedPasses = await tx
            .insert(ticketPasses)
            .values(passes)
            .returning({ passCode: ticketPasses.passCode });
          allPassCodes.push(...insertedPasses.map((p) => p.passCode));
        }

        await tx
          .update(orders)
          .set({ status: 'paid', paidAt: new Date() })
          .where(eq(orders.id, order.id));
      }

      if (allPassCodes.length > 0) {
        emailPayload = {
          to: order.buyerEmail,
          buyerName: order.buyerName,
          orderNumber: order.orderNumber,
          eventTitle: items[0]?.eventTitle ?? 'SeatZero Workshop',
          passCodes: allPassCodes,
        };
      }
    });

    await db
      .update(webhookEvents)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(webhookEvents.id, insertedWebhook.id));

    return {
      status: 200,
      body: { received: true },
      slugs: touchedSlugs,
      emailPayload,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await db
      .update(webhookEvents)
      .set({ status: 'failed', errorMessage: message })
      .where(eq(webhookEvents.id, insertedWebhook.id));

    throw err;
  }
}
