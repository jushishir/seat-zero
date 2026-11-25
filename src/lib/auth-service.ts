import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAdminSession() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login?next=/admin');
  }

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  // অ্যাডমিনের জন্য TOTP MFA (2FA) বাধ্যতামূলক
  if (!session.user.twoFactorEnabled) {
    redirect('/admin/setup-mfa');
  }

  return session;
}
