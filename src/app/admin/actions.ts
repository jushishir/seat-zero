'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { requireAdminSession } from '@/lib/auth-service';
import {
  cancelAdminOrder,
  checkInTicketPass,
  createAdminEvent,
  toggleEventStatus,
} from '@/modules/admin';

export async function createEventAction(formData: FormData) {
  const session = await requireAdminSession();

  const result = await createAdminEvent(
    {
      title: formData.get('title'),
      slug: formData.get('slug'),
      description: formData.get('description'),
      venueLabel: formData.get('venueLabel'),
      eventStartsAt: formData.get('eventStartsAt'),
      priceBdt: formData.get('priceBdt'),
      totalCapacity: formData.get('totalCapacity'),
      status: formData.get('status') ?? 'published',
    },
    { id: session.user.id, email: session.user.email },
  );

  if (result.ok) {
    updateTag('events');
    updateTag(`event-${result.slug}`);
    revalidatePath('/admin');
  }

  return result;
}

export async function toggleEventStatusAction(
  eventId: string,
  nextStatus: 'published' | 'archived',
) {
  const session = await requireAdminSession();
  const slug = await toggleEventStatus(eventId, nextStatus, {
    id: session.user.id,
    email: session.user.email,
  });

  if (slug) {
    updateTag('events');
    updateTag(`event-${slug}`);
  }
  revalidatePath('/admin');
}

export async function checkInPassAction(passId: string) {
  const session = await requireAdminSession();
  await checkInTicketPass(passId, {
    id: session.user.id,
    email: session.user.email,
  });
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/audit');
}

export async function cancelOrderAction(orderId: string) {
  const session = await requireAdminSession();
  const slugs = await cancelAdminOrder(orderId, {
    id: session.user.id,
    email: session.user.email,
  });

  for (const slug of slugs) {
    updateTag(`event-${slug}`);
  }
  if (slugs.length > 0) {
    updateTag('events');
  }
  revalidatePath('/admin');
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/audit');
}
