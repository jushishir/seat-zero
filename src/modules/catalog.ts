import { and, asc, eq, desc, sql } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db';
import { events, seatInventory } from '@/db/schema';

export async function getPublishedEvents() {
  'use cache';
  cacheTag('events');
  cacheLife('minutes');

  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      venueLabel: events.venueLabel,
      eventStartsAt: events.eventStartsAt,
      priceMinor: events.priceMinor,
      currency: events.currency,
      coverImageUrl: events.coverImageUrl,
      availableSeats: seatInventory.availableSeats,
      totalCapacity: seatInventory.totalCapacity,
    })
    .from(events)
    .innerJoin(seatInventory, eq(events.id, seatInventory.eventId))
    .where(eq(events.status, 'published'))
    .orderBy(asc(events.eventStartsAt));

  return rows;
}

export async function getEventBySlug(slug: string) {
  'use cache';
  cacheTag('events', `event-${slug}`);
  cacheLife('minutes');

  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      description: events.description,
      venueLabel: events.venueLabel,
      eventStartsAt: events.eventStartsAt,
      priceMinor: events.priceMinor,
      currency: events.currency,
      coverImageUrl: events.coverImageUrl,
      availableSeats: seatInventory.availableSeats,
      totalCapacity: seatInventory.totalCapacity,
    })
    .from(events)
    .innerJoin(seatInventory, eq(events.id, seatInventory.eventId))
    .where(and(eq(events.slug, slug), eq(events.status, 'published')))
    .limit(1);

  return rows[0] ?? null;
}

export async function searchPublishedEvents(rawQuery: string) {
  const q = rawQuery.trim();
  if (!q) {
    return getPublishedEvents();
  }

  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      venueLabel: events.venueLabel,
      eventStartsAt: events.eventStartsAt,
      priceMinor: events.priceMinor,
      currency: events.currency,
      coverImageUrl: events.coverImageUrl,
      availableSeats: seatInventory.availableSeats,
      totalCapacity: seatInventory.totalCapacity,
    })
    .from(events)
    .innerJoin(seatInventory, eq(events.id, seatInventory.eventId))
    .where(
      and(
        eq(events.status, 'published'),
        sql`(
          to_tsvector('english', ${events.title} || ' ' || ${events.description}) @@ websearch_to_tsquery('english', ${q})
          OR word_similarity(${q}, ${events.title}) > 0.3
          OR ${events.title} ILIKE ${`%${q}%`}
          OR ${events.venueLabel} ILIKE ${`%${q}%`}
        )`,
      ),
    )
    .orderBy(desc(sql`word_similarity(${q}, ${events.title})`));

  return rows;
}
