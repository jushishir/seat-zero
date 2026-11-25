import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  auditLog,
  events,
  orderItems,
  orders,
  seatInventory,
  ticketPasses,
} from '@/db/schema';

export const CreateEventSchema = z.object({
  title: z.string().trim().min(3, 'টাইটেল কমপক্ষে ৩ অক্ষরের হতে হবে').max(120),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-) হতে হবে',
    ),
  description: z.string().trim().min(10, 'বিস্তারিত বিবরণ লিখুন'),
  venueLabel: z.string().trim().min(2, 'ভেন্যু লিখুন'),
  eventStartsAt: z.string().min(1, 'তারিখ ও সময় দিন'),
  priceBdt: z.coerce.number().int().min(0, 'দাম ০ বা তার বেশি হতে হবে'),
  totalCapacity: z.coerce
    .number()
    .int()
    .min(1, 'কমপক্ষে ১টি সিট থাকতে হবে')
    .max(5000),
  status: z.enum(['draft', 'published']).default('published'),
});

type Actor = { id: string; email: string };

export async function createAdminEvent(rawInput: unknown, actor: Actor) {
  const parsed = CreateEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        Object.values(z.flattenError(parsed.error).fieldErrors).flat()[0] ??
        'তথ্য সঠিক নয়',
    };
  }

  const data = parsed.data;
  const startsAt = new Date(`${data.eventStartsAt}:00+06:00`);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false as const, error: 'তারিখটি সঠিক নয়।' };
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [ev] = await tx
        .insert(events)
        .values({
          title: data.title,
          slug: data.slug,
          description: data.description,
          venueLabel: data.venueLabel,
          eventStartsAt: startsAt,
          priceMinor: data.priceBdt * 100,
          currency: 'BDT',
          status: data.status,
        })
        .returning({ id: events.id, slug: events.slug });

      await tx.insert(seatInventory).values({
        eventId: ev.id,
        totalCapacity: data.totalCapacity,
        availableSeats: data.totalCapacity,
        reservedSeats: 0,
        soldSeats: 0,
      });

      await tx.insert(auditLog).values({
        actorUserId: actor.id,
        actorEmail: actor.email,
        action: 'event.created',
        targetType: 'event',
        targetId: ev.id,
        metadata: {
          slug: ev.slug,
          totalCapacity: data.totalCapacity,
          priceBdt: data.priceBdt,
        },
      });

      return ev;
    });

    return { ok: true as const, slug: created.slug };
  } catch (err) {
    console.error('Create event failed:', err);
    return {
      ok: false as const,
      error: 'এই Slug দিয়ে ইতোমধ্যে একটি ইভেন্ট থাকতে পারে।',
    };
  }
}

export async function toggleEventStatus(
  eventId: string,
  nextStatus: 'published' | 'archived',
  actor: Actor,
) {
  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx
      .update(events)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(events.id, eventId))
      .returning({ id: events.id, slug: events.slug });

    if (rows[0]) {
      await tx.insert(auditLog).values({
        actorUserId: actor.id,
        actorEmail: actor.email,
        action: `event.${nextStatus}`,
        targetType: 'event',
        targetId: rows[0].id,
      });
    }
    return rows;
  });

  return updated?.slug ?? null;
}

export async function checkInTicketPass(passId: string, actor: Actor) {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(ticketPasses)
      .set({ checkedInAt: new Date() })
      .where(
        and(eq(ticketPasses.id, passId), eq(ticketPasses.status, 'active')),
      )
      .returning({ id: ticketPasses.id, passCode: ticketPasses.passCode });

    if (updated) {
      await tx.insert(auditLog).values({
        actorUserId: actor.id,
        actorEmail: actor.email,
        action: 'pass.checked_in',
        targetType: 'ticket_pass',
        targetId: updated.id,
        metadata: { passCode: updated.passCode },
      });
    }
  });
}

export async function cancelAdminOrder(
  orderId: string,
  actor: Actor,
): Promise<string[]> {
  const touchedSlugs = new Set<string>();

  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order || (order.status !== 'pending' && order.status !== 'paid')) {
      return;
    }

    const [flipped] = await tx
      .update(orders)
      .set({ status: 'cancelled' })
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
      .returning({ id: orders.id });

    if (!flipped) return;

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
      if (order.status === 'pending') {
        await tx
          .update(seatInventory)
          .set({
            availableSeats: sql`${seatInventory.availableSeats} + ${item.quantity}`,
            reservedSeats: sql`${seatInventory.reservedSeats} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(seatInventory.eventId, item.eventId));
      } else if (order.status === 'paid') {
        await tx
          .update(seatInventory)
          .set({
            availableSeats: sql`${seatInventory.availableSeats} + ${item.quantity}`,
            soldSeats: sql`${seatInventory.soldSeats} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(seatInventory.eventId, item.eventId));
      }
      touchedSlugs.add(item.slug);
    }

    await tx
      .update(ticketPasses)
      .set({ status: 'cancelled' })
      .where(eq(ticketPasses.orderId, order.id));

    await tx.insert(auditLog).values({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'order.cancelled',
      targetType: 'order',
      targetId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
      },
    });
  });

  return Array.from(touchedSlugs);
}

export async function getAdminOverviewData() {
  return db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      venueLabel: events.venueLabel,
      eventStartsAt: events.eventStartsAt,
      priceMinor: events.priceMinor,
      currency: events.currency,
      status: events.status,
      totalCapacity: seatInventory.totalCapacity,
      availableSeats: seatInventory.availableSeats,
      soldSeats: seatInventory.soldSeats,
    })
    .from(events)
    .innerJoin(seatInventory, eq(events.id, seatInventory.eventId))
    .orderBy(desc(events.createdAt));
}
