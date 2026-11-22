import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';

export async function GET() {
  try {
    // ১. ডাটাবেজে কোনো টেবিল না থাকলেও 'SELECT 1' দিয়ে কানেকশন পরীক্ষা করা যায়
    await db.execute(sql`SELECT 1`);

    // ২. কানেকশন সফল হলে HTTP 200 সহ JSON উত্তর পাঠানো
    return NextResponse.json(
      { status: 'ok', database: 'connected' },
      { status: 200 },
    );
  } catch (error) {
    // ৩. কানেকশনে সমস্যা হলে টার্মিনালে আসল এরর প্রিন্ট করা ও ৫০০ উত্তর পাঠানো
    console.error('Database health check failed:', error);

    return NextResponse.json(
      { status: 'error', database: 'disconnected' },
      { status: 500 },
    );
  }
}
