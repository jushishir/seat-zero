import Link from 'next/link';

export default function EventNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">
        ইভেন্টটি খুঁজে পাওয়া যায়নি
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        আপনি যে ওয়ার্কশপটি খুঁজছেন তা সরানো হয়েছে অথবা ঠিকানাটি ভুল।
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        সব ইভেন্ট দেখুন
      </Link>
    </div>
  );
}
