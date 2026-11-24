import crypto from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  events,
  idempotencyKeys,
  orderItems,
  orders,
  seatInventory,
} from '@/db/schema';

// ১. ইনপুট ভ্যালিডেশনের জন্য Zod Schema (Zod v4 স্ট্যান্ডার্ড)
export const CheckoutInputSchema = z.object({
  eventId: z.uuid('সঠিক Event ID দিন'),
  quantity: z
    .number()
    .int()
    .min(1, 'কমপক্ষে ১টি টিকিট নিতে হবে')
    .max(5, 'এক অর্ডারে সর্বোচ্চ ৫টি টিকিট নেওয়া যাবে'),
  buyerName: z.string().trim().min(2, 'পুরো নাম লিখুন').max(100),
  buyerEmail: z.email('সঠিক ইমেইল ঠিকানা দিন'),
  buyerPhone: z.string().trim().min(6, 'সঠিক ফোন নম্বর দিন').max(20),
});

export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

type CheckoutResult = {
  status: number;
  body: Record<string, unknown>;
  eventSlug?: string;
};

export async function createPendingCheckout(
  input: CheckoutInput,
  idempotencyKey: string,
): Promise<CheckoutResult> {
  // ২. একই Key-তে যেন কেউ ভিন্ন ডেটা না পাঠায়, সেজন্য ইনপুটের SHA-256 হ্যাশ বানানো
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');

  // ৩. আগে থেকেই এই Idempotency-Key প্রসেস হয়ে থাকলে পুরনো উত্তরই ফেরত দেওয়া
  const [existingKey] = await db
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, idempotencyKey))
    .limit(1);

  if (existingKey) {
    if (existingKey.requestHash !== requestHash) {
      return {
        status: 409,
        body: { error: 'এই Idempotency-Key দিয়ে ভিন্ন তথ্য পাঠানো হয়েছে।' },
      };
    }
    return {
      status: existingKey.responseStatus,
      body: existingKey.responseBody as Record<string, unknown>,
    };
  }

  // ৪. মূল ট্রানজ্যাকশন শুরু (সব কাজ একসাথে হবে অথবা কিছুই হবে না)
  return await db.transaction(async (tx) => {
    // ক. ইভেন্টটি আসলেই published আছে কি না এবং তার আসল দাম জানা
    const [event] = await tx
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        priceMinor: events.priceMinor,
        currency: events.currency,
      })
      .from(events)
      .where(and(eq(events.id, input.eventId), eq(events.status, 'published')))
      .limit(1);

    if (!event) {
      return {
        status: 404,
        body: { error: 'ইভেন্টটি পাওয়া যায়নি বা পাবলিশ করা নেই।' },
      };
    }

    // খ. Atomic Seat Lock: শর্তসাপেক্ষ আপডেট (ওভারসেলিং অসম্ভব)
    const [lockedSeat] = await tx
      .update(seatInventory)
      .set({
        availableSeats: sql`${seatInventory.availableSeats} - ${input.quantity}`,
        reservedSeats: sql`${seatInventory.reservedSeats} + ${input.quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(seatInventory.eventId, event.id),
          gte(seatInventory.availableSeats, input.quantity),
        ),
      )
      .returning({ availableSeats: seatInventory.availableSeats });

    if (!lockedSeat) {
      return {
        status: 409,
        body: { error: 'দুঃখিত, পর্যাপ্ত সিট খালি নেই।' },
      };
    }

    // গ. দাম সবসময় সার্ভারে হিসাব হবে (ব্রাউজারের পাঠানো দাম কখনোই বিশ্বাস করা হয় না)
    const lineTotalMinor = event.priceMinor * input.quantity;
    const orderNumber = `SZ-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // ১০ মিনিট লক

    // ঘ. orders এবং order_items (snapshot) সেভ করা
    const [createdOrder] = await tx
      .insert(orders)
      .values({
        orderNumber,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail.toLowerCase(),
        buyerPhone: input.buyerPhone,
        totalMinor: lineTotalMinor,
        currency: event.currency,
        status: 'pending',
        expiresAt,
      })
      .returning({
        id: orders.id,
        orderNumber: orders.orderNumber,
        totalMinor: orders.totalMinor,
        currency: orders.currency,
        expiresAt: orders.expiresAt,
      });

    await tx.insert(orderItems).values({
      orderId: createdOrder.id,
      eventId: event.id,
      eventTitleSnapshot: event.title,
      unitPriceMinorSnapshot: event.priceMinor,
      quantity: input.quantity,
      lineTotalMinor,
    });

    const responseBody = {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      totalMinor: createdOrder.totalMinor,
      currency: createdOrder.currency,
      expiresAt: createdOrder.expiresAt.toISOString(),
      paymentUrl: `/mock-pay/${createdOrder.id}`,
    };

    // ঙ. ভবিষ্যতের ডুপ্লিকেট রিকোয়েস্ট ঠেকাতে Idempotency রেকর্ড সেভ করা
    await tx.insert(idempotencyKeys).values({
      key: idempotencyKey,
      scope: 'checkout',
      requestHash,
      responseStatus: 201,
      responseBody,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return {
      status: 201,
      body: responseBody,
      eventSlug: event.slug,
    };
  });
}
