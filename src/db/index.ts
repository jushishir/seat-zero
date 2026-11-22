import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/db/schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const poll =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DB_CONNECTION_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = poll;
}

export const db = drizzle(poll, { schema });
