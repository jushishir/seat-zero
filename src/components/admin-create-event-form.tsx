'use client';

import { useState } from 'react';
import { createEventAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminCreateEventForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await createEventAction(formData);

    setPending(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    form.reset();
    setSuccessMsg(`নতুন ইভেন্ট তৈরি হয়েছে! (/events/${res.slug})`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Event</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="TypeScript Mastery 2026"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">URL Slug * (lowercase-with-dashes)</Label>
            <Input
              id="slug"
              name="slug"
              required
              placeholder="typescript-mastery-2026"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venueLabel">Venue *</Label>
            <Input
              id="venueLabel"
              name="venueLabel"
              required
              placeholder="Uttara, Dhaka"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eventStartsAt">Start Date & Time (+06) *</Label>
            <Input
              id="eventStartsAt"
              name="eventStartsAt"
              type="datetime-local"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priceBdt">Ticket Price (BDT) *</Label>
            <Input
              id="priceBdt"
              name="priceBdt"
              type="number"
              min={0}
              required
              placeholder="500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="totalCapacity">Total Seats *</Label>
            <Input
              id="totalCapacity"
              name="totalCapacity"
              type="number"
              min={1}
              required
              placeholder="30"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              placeholder="ওয়ার্কশপে কী কী শেখানো হবে..."
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          {errorMsg && (
            <p className="rounded-md bg-red-50 p-2.5 text-xs text-red-700 sm:col-span-2">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-700 sm:col-span-2">
              {successMsg}
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating...' : 'Publish Event'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
