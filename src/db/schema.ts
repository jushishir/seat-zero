import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

// ৩. অর্ডার / বুকিং টেবিল
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: text('order_number').notNull().unique(),
    buyerName: text('buyer_name').notNull(),
    buyerEmail: text('buyer_email').notNull(),
    buyerPhone: text('buyer_phone').notNull(),
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull().default('BDT'),
    status: text('status').notNull().default('pending'), // pending | paid | expired | cancelled | refund_required
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('orders_total_non_negative', sql`${table.totalMinor} >= 0`),
    index('orders_status_expires_idx').on(table.status, table.expiresAt),
    index('orders_buyer_email_idx').on(table.buyerEmail),
  ],
);

// ৪. অর্ডার আইটেম (কেনার সময়কার দাম ও নামের Snapshot)
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id),
    eventTitleSnapshot: text('event_title_snapshot').notNull(),
    unitPriceMinorSnapshot: integer('unit_price_minor_snapshot').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalMinor: integer('line_total_minor').notNull(),
  },
  (table) => [
    check('order_items_qty_limit', sql`${table.quantity} BETWEEN 1 AND 5`),
    index('order_items_order_idx').on(table.orderId),
  ],
);

// ৫. ডিজিটাল টিকিট পাস (প্রতি আসনের জন্য ১টি ইউনিক কোড)
export const ticketPasses = pgTable(
  'ticket_passes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id),
    passCode: text('pass_code').notNull().unique(),
    attendeeEmail: text('attendee_email').notNull(),
    status: text('status').notNull().default('active'), // active | cancelled
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('ticket_passes_event_idx').on(table.eventId),
    index('ticket_passes_email_idx').on(table.attendeeEmail),
  ],
);

// ৬. ইডিম্পোটেন্সি কী (ডাবল অর্ডার ঠেকানোর টেবিল)
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').primaryKey(),
    scope: text('scope').notNull(), // যেমন: "checkout"
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBody: jsonb('response_body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('idempotency_expires_idx').on(table.expiresAt)],
);

// ৭. ওয়েবহুক ইভেন্ট (ডুপ্লিকেট পেমেন্ট ওয়েবহুক ঠেকানোর টেবিল)
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(), // যেমন: "mock"
    providerEventId: text('provider_event_id').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').notNull().default('received'), // received | processed | failed
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('webhook_provider_event_uidx').on(
      table.provider,
      table.providerEventId,
    ),
  ],
);
