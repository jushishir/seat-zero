'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push('/');
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSearch} className="flex w-full max-w-xs gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search workshops..."
        className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 focus:bg-white"
      />
      <button
        type="submit"
        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
      >
        Search
      </button>
    </form>
  );
}
