import { db } from './index';
import { events, seatInventory } from './schema';

const SAMPLE_EVENTS = [
  {
    slug: 'nextjs-16-drizzle-lab',
    title: 'Next.js 16 & Drizzle Production Lab',
    description:
      'হাতে-কলমে শিখুন কীভাবে Next.js 16, Drizzle ORM ও PostgreSQL দিয়ে দ্রুতগতির প্রোডাকশন অ্যাপ বানাতে হয়।',
    venueLabel: 'Online (Live Workshop)',
    eventStartsAt: new Date('2026-12-05T19:00:00+06:00'),
    priceMinor: 50000, // ৫০০ টাকা (BDT পয়সায়)
    status: 'published',
    totalCapacity: 30,
    availableSeats: 30,
    soldSeats: 0,
  },
  {
    slug: 'dhaka-ui-ux-meetup',
    title: 'Dhaka UI/UX Design Deep Dive',
    description:
      'আধুনিক ডিজাইন সিস্টেম, অ্যাক্সেসিবিলিটি এবং মোবাইল-ফার্স্ট ইন্টারফেস নিয়ে বিশেষ আড্ডা ও ওয়ার্কশপ।',
    venueLabel: 'Banani, Dhaka',
    eventStartsAt: new Date('2026-12-12T15:00:00+06:00'),
    priceMinor: 80000, // ৮০০ টাকা
    status: 'published',
    totalCapacity: 20,
    availableSeats: 4, // মাত্র ৪টি বাকি — urgency ব্যাজ টেস্টের জন্য
    soldSeats: 16,
  },
  {
    slug: 'postgres-internals-101',
    title: 'PostgreSQL Internals & Concurrency',
    description:
      'ই-কমার্স ও টিকিটিং সিস্টেমে কীভাবে Race Condition ও Overselling ঠেকাতে হয় তার বিস্তারিত সেশন।',
    venueLabel: 'Dhanmondi, Dhaka',
    eventStartsAt: new Date('2026-12-19T16:00:00+06:00'),
    priceMinor: 60000, // ৬০০ টাকা
    status: 'published',
    totalCapacity: 25,
    availableSeats: 0, // ০টি বাকি — Sold Out ব্যাজ টেস্টের জন্য
    soldSeats: 25,
  },
];

async function seed() {
  console.log('Seeding sample events...');

  for (const item of SAMPLE_EVENTS) {
    // একই ট্রানজ্যাকশনের ভেতর ইভেন্ট এবং তার সিট সেভ করা হচ্ছে
    await db.transaction(async (tx) => {
      const [insertedEvent] = await tx
        .insert(events)
        .values({
          slug: item.slug,
          title: item.title,
          description: item.description,
          venueLabel: item.venueLabel,
          eventStartsAt: item.eventStartsAt,
          priceMinor: item.priceMinor,
          currency: 'BDT',
          status: item.status,
        })
        .onConflictDoNothing({ target: events.slug })
        .returning({ id: events.id, slug: events.slug });

      // যদি নতুন ইভেন্ট তৈরি হয়ে থাকে, তবেই সিট ইনভেন্টরি যোগ করবে
      if (insertedEvent) {
        await tx.insert(seatInventory).values({
          eventId: insertedEvent.id,
          totalCapacity: item.totalCapacity,
          availableSeats: item.availableSeats,
          reservedSeats: 0,
          soldSeats: item.soldSeats,
        });
        console.log(`Added: ${insertedEvent.slug}`);
      } else {
        console.log(`Skipped (already exists): ${item.slug}`);
      }
    });
  }

  console.log('Seeding complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
