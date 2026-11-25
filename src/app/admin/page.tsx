import Link from 'next/link';
import { Suspense } from 'react';
import { toggleEventStatusAction } from '@/app/admin/actions';
import { AdminCreateEventForm } from '@/components/admin-create-event-form';
import { AdminNav } from '@/components/admin-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAdminSession } from '@/lib/auth-service';
import { formatEventDate, formatPrice } from '@/lib/format';
import { getAdminOverviewData } from '@/modules/admin';

async function AdminEventsContent() {
  const session = await requireAdminSession();
  const allEvents = await getAdminOverviewData();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <AdminNav email={session.user.email} />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <AdminCreateEventForm />

        <Card>
          <CardHeader>
            <CardTitle>All Events ({allEvents.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-neutral-100">
            {allEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/events/${ev.slug}`}
                      className="font-semibold hover:underline"
                    >
                      {ev.title}
                    </Link>
                    <Badge
                      variant={
                        ev.status === 'published' ? 'default' : 'secondary'
                      }
                    >
                      {ev.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatEventDate(ev.eventStartsAt)} • {ev.venueLabel} •{' '}
                    {formatPrice(ev.priceMinor, ev.currency)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-neutral-700">
                    Available: {ev.availableSeats} / {ev.totalCapacity} (Sold:{' '}
                    {ev.soldSeats})
                  </p>
                </div>

                <form
                  action={async () => {
                    'use server';
                    await toggleEventStatusAction(
                      ev.id,
                      ev.status === 'published' ? 'archived' : 'published',
                    );
                  }}
                >
                  <Button type="submit" variant="outline" size="sm">
                    {ev.status === 'published' ? 'Archive' : 'Publish'}
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm">Loading admin...</div>
      }
    >
      <AdminEventsContent />
    </Suspense>
  );
}
