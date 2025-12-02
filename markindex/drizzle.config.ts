/**
 * Drizzle Kit Configuration
 *
 * Used for migrations and schema management
 * Run: npm run db:push (push schema to database)
 * Run: npm run db:studio (open Drizzle Studio GUI)
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db.drizzle.schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  // Print all SQL statements
  verbose: true,
  // Always ask for confirmation before pushing changes
  strict: true,
} satisfies Config;
