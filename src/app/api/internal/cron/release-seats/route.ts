import crypto from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { releaseExpiredSeats } from '@/modules/inventory';

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!secret || !authHeader) return false;

  const expected = `Bearer ${secret}`;
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(authHeader, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await releaseExpiredSeats();

    for (const slug of result.slugs) {
      revalidateTag(`event-${slug}`, 'max');
    }
    if (result.releasedCount > 0) {
      revalidateTag('events', 'max');
    }

    return NextResponse.json({
      ok: true,
      releasedCount: result.releasedCount,
    });
  } catch (error) {
    console.error('Release expired seats cron failed:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
