import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// ১. ইভেন্ট টেবিল (ইভেন্টের মূল তথ্য)
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    venueLabel: text('venue_label').notNull(),
    eventStartsAt: timestamp('event_starts_at', {
      withTimezone: true,
    }).notNull(),
    priceMinor: integer('price_minor').notNull(), // যেমন ৫০০ টাকা = 50000 পয়সা
    currency: text('currency').notNull().default('BDT'),
    status: text('status').notNull().default('draft'), // draft | published | archived
    coverImageUrl: text('cover_image_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('events_price_non_negative', sql`${table.priceMinor} >= 0`),
    index('events_status_starts_idx').on(table.status, table.eventStartsAt),
  ],
);

// ২. সিট ইনভেন্টরি টেবিল (সিটের হিসাব ও ওভারসেল সুরক্ষা)
export const seatInventory = pgTable(
  'seat_inventory',
  {
    eventId: uuid('event_id')
      .primaryKey()
      .references(() => events.id, { onDelete: 'cascade' }),
    totalCapacity: integer('total_capacity').notNull(),
    availableSeats: integer('available_seats').notNull(),
    reservedSeats: integer('reserved_seats').notNull().default(0),
    soldSeats: integer('sold_seats').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('seat_total_non_negative', sql`${table.totalCapacity} >= 0`),
    check('seat_available_non_negative', sql`${table.availableSeats} >= 0`),
    check('seat_reserved_non_negative', sql`${table.reservedSeats} >= 0`),
    check('seat_sold_non_negative', sql`${table.soldSeats} >= 0`),
    check(
      'seat_balance_check',
      sql`${table.availableSeats} + ${table.reservedSeats} + ${table.soldSeats} = ${table.totalCapacity}`,
    ),
  ],
);
