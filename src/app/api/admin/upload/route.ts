import { NextResponse } from 'next/server';
import { optimizeAndUploadBanner } from '@/adapters/storage';
import { getServerSession } from '@/lib/auth-service';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (
    !session?.user ||
    session.user.role !== 'admin' ||
    !session.user.twoFactorEnabled
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'ফাইল পাওয়া যায়নি।' }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ছবির সাইজ ৪ MB-র বেশি হতে পারবে না।' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await optimizeAndUploadBanner(buffer);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error('Image upload failed:', error);
    return NextResponse.json(
      { error: 'ছবি আপলোড বা প্রসেস করা যায়নি।' },
      { status: 400 },
    );
  }
}
