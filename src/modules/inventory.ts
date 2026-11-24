import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { events, orderItems, orders, seatInventory } from '@/db/schema';

export async function releaseExpiredSeats(): Promise<{
  releasedCount: number;
  slugs: string[];
}> {
  // ১. ১০ মিনিট পার হয়ে যাওয়া সর্বোচ্চ ৫০টি pending অর্ডার খুঁজে বের করা
  const expiredCandidates = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, 'pending'), lt(orders.expiresAt, new Date())))
    .limit(50);

  if (expiredCandidates.length === 0) {
    return { releasedCount: 0, slugs: [] };
  }

  let releasedCount = 0;
  const touchedSlugs = new Set<string>();

  for (const candidate of expiredCandidates) {
    await db.transaction(async (tx) => {
      // ২. Atomic শর্ত: কেবল status 'pending' থাকলেই 'expired' করবে
      const [flipped] = await tx
        .update(orders)
        .set({ status: 'expired' })
        .where(and(eq(orders.id, candidate.id), eq(orders.status, 'pending')))
        .returning({ id: orders.id });

      // যদি এর মধ্যেই paid বা cancelled হয়ে থাকে, তবে কিছুই করবে না
      if (!flipped) return;

      const items = await tx
        .select({
          eventId: orderItems.eventId,
          quantity: orderItems.quantity,
          slug: events.slug,
        })
        .from(orderItems)
        .innerJoin(events, eq(orderItems.eventId, events.id))
        .where(eq(orderItems.orderId, flipped.id));

      // ৩. আটকে থাকা reserved সিটগুলো available-এ ফেরত আনা
      for (const item of items) {
        await tx
          .update(seatInventory)
          .set({
            availableSeats: sql`${seatInventory.availableSeats} + ${item.quantity}`,
            reservedSeats: sql`${seatInventory.reservedSeats} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(seatInventory.eventId, item.eventId));

        touchedSlugs.add(item.slug);
      }

      releasedCount += 1;
    });
  }

  return {
    releasedCount,
    slugs: Array.from(touchedSlugs),
  };
}
