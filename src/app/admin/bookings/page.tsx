import { desc, eq } from 'drizzle-orm';
import { Suspense } from 'react';
import { cancelOrderAction, checkInPassAction } from '@/app/admin/actions';
import { AdminNav } from '@/components/admin-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/db';
import { events, orders, ticketPasses } from '@/db/schema';
import { requireAdminSession } from '@/lib/auth-service';
import { formatPrice } from '@/lib/format';

async function AdminBookingsContent() {
  const session = await requireAdminSession();

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(30);

  const recentPasses = await db
    .select({
      id: ticketPasses.id,
      passCode: ticketPasses.passCode,
      attendeeEmail: ticketPasses.attendeeEmail,
      status: ticketPasses.status,
      checkedInAt: ticketPasses.checkedInAt,
      eventTitle: events.title,
    })
    .from(ticketPasses)
    .innerJoin(events, eq(ticketPasses.eventId, events.id))
    .orderBy(desc(ticketPasses.createdAt))
    .limit(50);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <AdminNav email={session.user.email} />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders ({recentOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-neutral-100">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
              >
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">
                      {order.orderNumber}
                    </span>
                    <Badge
                      variant={
                        order.status === 'paid' ? 'default' : 'secondary'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600">
                    {order.buyerName} ({order.buyerEmail}) •{' '}
                    {formatPrice(order.totalMinor, order.currency)}
                  </p>
                </div>

                {(order.status === 'pending' || order.status === 'paid') && (
                  <form
                    action={async () => {
                      'use server';
                      await cancelOrderAction(order.id);
                    }}
                  >
                    <Button type="submit" variant="destructive" size="sm">
                      Cancel & Return Seats
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issued Ticket Passes & Gate Check-in</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-neutral-100">
            {recentPasses.map((pass) => (
              <div
                key={pass.id}
                className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
              >
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{pass.passCode}</span>
                    <Badge
                      variant={
                        pass.status === 'active' ? 'outline' : 'secondary'
                      }
                    >
                      {pass.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600">
                    {pass.eventTitle} • {pass.attendeeEmail}
                  </p>
                </div>

                {pass.status === 'active' &&
                  (pass.checkedInAt ? (
                    <Badge className="bg-emerald-100 text-emerald-800">
                      Checked In ✓
                    </Badge>
                  ) : (
                    <form
                      action={async () => {
                        'use server';
                        await checkInPassAction(pass.id);
                      }}
                    >
                      <Button type="submit" size="sm">
                        Mark Checked-In
                      </Button>
                    </form>
                  ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm">Loading bookings...</div>
      }
    >
      <AdminBookingsContent />
    </Suspense>
  );
}
