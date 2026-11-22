CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"venue_label" text NOT NULL,
	"event_starts_at" timestamp with time zone NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"cover_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_price_non_negative" CHECK ("events"."price_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "seat_inventory" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"total_capacity" integer NOT NULL,
	"available_seats" integer NOT NULL,
	"reserved_seats" integer DEFAULT 0 NOT NULL,
	"sold_seats" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seat_total_non_negative" CHECK ("seat_inventory"."total_capacity" >= 0),
	CONSTRAINT "seat_available_non_negative" CHECK ("seat_inventory"."available_seats" >= 0),
	CONSTRAINT "seat_reserved_non_negative" CHECK ("seat_inventory"."reserved_seats" >= 0),
	CONSTRAINT "seat_sold_non_negative" CHECK ("seat_inventory"."sold_seats" >= 0),
	CONSTRAINT "seat_balance_check" CHECK ("seat_inventory"."available_seats" + "seat_inventory"."reserved_seats" + "seat_inventory"."sold_seats" = "seat_inventory"."total_capacity")
);
--> statement-breakpoint
ALTER TABLE "seat_inventory" ADD CONSTRAINT "seat_inventory_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_status_starts_idx" ON "events" USING btree ("status","event_starts_at");