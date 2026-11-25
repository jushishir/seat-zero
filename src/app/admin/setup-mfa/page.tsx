'use client';

import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function SetupMfaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await authClient.twoFactor.enable({ password });
    if (res.error) {
      setErrorMsg(res.error.message ?? 'পাসওয়ার্ড সঠিক নয়।');
      setLoading(false);
      return;
    }

    if (res.data && 'totpURI' in res.data) {
      setTotpUri(res.data.totpURI);
    }
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    if (res.error) {
      setErrorMsg(res.error.message ?? 'কোডটি মিলছে না।');
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-900">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">Admin 2FA Setup (Mandatory)</h1>
        <p className="mt-1 text-sm text-neutral-600">
          অ্যাডমিন প্যানেল সুরক্ষিত রাখতে Google Authenticator বা Ente Auth
          সেটআপ করুন।
        </p>

        {!totpUri ? (
          <form onSubmit={handleEnable} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Confirm your password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Generating QR...' : 'Generate 2FA QR Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-5 space-y-4">
            <div className="flex justify-center rounded-lg border border-neutral-200 bg-white p-4">
              <QRCodeSVG value={totpUri} size={180} />
            </div>
            <p className="text-xs text-neutral-600">
              ১. ফোনের Authenticator অ্যাপ দিয়ে QR কোডটি স্ক্যান করুন।
              <br />
              ২. নিচে অ্যাপের ৬-সংখ্যার কোডটি লিখে Verify করুন।
            </p>
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Unlock Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
