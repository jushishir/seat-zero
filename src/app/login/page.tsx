'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [needsTotp, setNeedsTotp] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'signup') {
        const res = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (res.error) {
          setErrorMsg(res.error.message ?? 'অ্যাকাউন্ট তৈরি হয়নি।');
          setLoading(false);
          return;
        }
        router.push('/my-tickets');
        router.refresh();
        return;
      }

      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setErrorMsg(res.error.message ?? 'ইমেইল বা পাসওয়ার্ড ভুল।');
        setLoading(false);
        return;
      }

      // যদি ইউজারের 2FA চালু থাকে, তবে TOTP কোড চাওয়া হবে
      if (
        (res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect
      ) {
        setNeedsTotp(true);
        setLoading(false);
        return;
      }

      router.push('/my-tickets');
      router.refresh();
    } catch {
      setErrorMsg('সার্ভারে সমস্যা হয়েছে।');
      setLoading(false);
    }
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await authClient.twoFactor.verifyTotp({
      code: totpCode.trim(),
    });

    if (res.error) {
      setErrorMsg(res.error.message ?? 'কোডটি সঠিক নয়।');
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-900">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            SeatZero
          </Link>
          <span className="text-xs text-neutral-500">Account</span>
        </div>

        {needsTotp ? (
          <form onSubmit={handleTotpVerify} className="space-y-4">
            <h1 className="text-xl font-bold">2FA Verification</h1>
            <p className="text-sm text-neutral-600">
              আপনার Authenticator অ্যাপ থেকে ৬-সংখ্যার কোডটি লিখুন:
            </p>
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="123456"
              className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-center font-mono text-lg tracking-widest outline-none focus:border-neutral-900"
            />
            {errorMsg && (
              <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {errorMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        ) : (
          <>
            <div className="mb-5 flex rounded-lg bg-neutral-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                className={`flex-1 rounded-md py-1.5 ${
                  mode === 'signin' ? 'bg-white shadow-sm' : 'text-neutral-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className={`flex-1 rounded-md py-1.5 ${
                  mode === 'signup' ? 'bg-white shadow-sm' : 'text-neutral-600'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tanvir Ahmed"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm outline-none focus:border-neutral-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>

              {errorMsg && (
                <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
