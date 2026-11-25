import { desc } from 'drizzle-orm';
import { Suspense } from 'react';
import { AdminNav } from '@/components/admin-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { requireAdminSession } from '@/lib/auth-service';
import { formatEventDate } from '@/lib/format';

async function AdminAuditContent() {
  const session = await requireAdminSession();

  const logs = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(50);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <AdminNav email={session.user.email} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Audit Log (Last 50 Actions)</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-neutral-100">
            {logs.length === 0 ? (
              <p className="py-6 text-sm text-neutral-500">
                এখনো কোনো লগ তৈরি হয়নি।
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-neutral-900">
                      {log.action}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatEventDate(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-600">
                    Actor: {log.actorEmail} • Target: {log.targetType} (
                    {log.targetId})
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm">Loading audit log...</div>
      }
    >
      <AdminAuditContent />
    </Suspense>
  );
}
