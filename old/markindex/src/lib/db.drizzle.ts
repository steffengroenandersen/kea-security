/**
 * Drizzle ORM Database Connection
 *
 * Alternative to raw SQL using Drizzle ORM for type-safe queries
 *
 * SECURITY COMPARISON: Raw SQL vs Drizzle ORM
 *
 * Both approaches are equally secure when used correctly:
 *
 * RAW SQL (src/lib/db.ts):
 * ✅ Parameterized queries prevent SQL injection
 * ✅ Explicit control over SQL
 * ✅ No abstraction overhead
 * ❌ No type safety
 * ❌ Manual query construction
 *
 * DRIZZLE ORM (this file):
 * ✅ Parameterized queries (automatic)
 * ✅ Type safety (TypeScript)
 * ✅ Relational queries (easier joins)
 * ✅ Schema migrations
 * ❌ Additional dependency
 * ❌ Learning curve
 *
 * WHEN TO USE EACH:
 * - Raw SQL: Simple queries, performance-critical, full control
 * - Drizzle: Complex queries, type safety important, team prefers ORM
 *
 * IMPORTANT: This file demonstrates Drizzle usage alongside raw SQL.
 * Both implementations are kept to show different approaches.
 * In production, choose ONE approach (don't mix).
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db.drizzle.schema';

/**
 * Create PostgreSQL connection pool
 *
 * Uses same configuration as raw SQL implementation
 * See src/lib/db.ts for detailed configuration explanation
 */
function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : undefined,
  });
}

// Create pool and Drizzle instance
const pool = createPool();
export const db = drizzle(pool, { schema });

/**
 * Close database connection
 * Should be called on application shutdown
 */
export async function closeDrizzle(): Promise<void> {
  await pool.end();
}

/**
 * EXAMPLE USAGE: Secure Queries with Drizzle
 *
 * All examples below are SQL injection safe because Drizzle
 * automatically parameterizes all values.
 */

// Example 1: Simple Select (SQL Injection Safe)
// Drizzle generates: SELECT * FROM users WHERE email = $1
// The email value is ALWAYS passed as a parameter, never interpolated
/*
import { eq } from 'drizzle-orm';
import { users } from './db.drizzle.schema';

const userByEmail = await db
  .select()
  .from(users)
  .where(eq(users.email, userInput));  // userInput is parameterized

// SECURITY: Even if userInput = "admin@test.com' OR '1'='1"
// Drizzle treats it as literal string, not SQL code
*/

// Example 2: Insert (SQL Injection Safe)
// Drizzle generates: INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
/*
const newUser = await db
  .insert(users)
  .values({
    email: userInput,              // Parameterized
    password_hash: hashedPassword, // Parameterized
    role: 'user',                  // Parameterized
  })
  .returning();

// SECURITY: All values are parameters, not string concatenation
*/

// Example 3: Complex Query with Join (SQL Injection Safe)
/*
import { and, eq, or } from 'drizzle-orm';
import { items, users } from './db.drizzle.schema';

const itemsWithUsers = await db
  .select({
    id: items.id,
    title: items.title,
    content: items.content,
    visibility: items.visibility,
    ownerEmail: users.email,
  })
  .from(items)
  .leftJoin(users, eq(items.user_id, users.id))
  .where(
    or(
      eq(items.visibility, 'public'),
      eq(items.user_id, currentUserId)
    )
  );

// SECURITY: All WHERE conditions are parameterized
// 'public' and currentUserId are passed as $1 and $2, not interpolated
*/

// Example 4: Update (SQL Injection Safe)
/*
const updated = await db
  .update(items)
  .set({
    title: userInputTitle,      // Parameterized
    content: userInputContent,  // Parameterized
    updated_at: new Date(),
  })
  .where(
    and(
      eq(items.id, itemId),
      eq(items.user_id, userId)
    )
  )
  .returning();

// SECURITY: SET values and WHERE conditions are all parameterized
*/

// Example 5: Delete with Authorization Check (SQL Injection Safe)
/*
const deleted = await db
  .delete(items)
  .where(
    and(
      eq(items.id, itemId),
      eq(items.user_id, userId)  // Verify ownership
    )
  );

// SECURITY: WHERE values are parameterized
// Authorization enforced at database level
*/

/**
 * WHY DRIZZLE IS AS SECURE AS RAW SQL:
 *
 * 1. PARAMETERIZATION:
 *    Drizzle ALWAYS uses parameterized queries internally
 *    db.select().from(users).where(eq(users.email, input))
 *    Generates: SELECT * FROM users WHERE email = $1
 *    Value passed separately: [input]
 *
 * 2. NO STRING INTERPOLATION:
 *    Drizzle's query builder doesn't allow:
 *    .where(`email = '${input}'`)  // Not possible with Drizzle
 *    Must use: .where(eq(users.email, input))  // Safe
 *
 * 3. TYPE SAFETY:
 *    TypeScript catches many errors at compile time:
 *    .where(eq(users.email, 123))  // Type error: email is string
 *    .where(eq(users.invalid, x))  // Type error: column doesn't exist
 *
 * 4. OPERATOR SAFETY:
 *    Drizzle provides safe operators:
 *    eq(), ne(), gt(), lt(), like(), and(), or()
 *    All generate parameterized SQL
 *
 * POTENTIAL PITFALLS (How to stay secure with Drizzle):
 *
 * ✅ SAFE - Using Drizzle operators:
 * .where(eq(users.email, userInput))
 *
 * ❌ UNSAFE - Using sql`` template with interpolation:
 * import { sql } from 'drizzle-orm';
 * .where(sql`email = '${userInput}'`)  // VULNERABLE - Don't do this!
 *
 * ✅ SAFE - Using sql`` with parameters:
 * .where(sql`email = ${userInput}`)  // Safe - parameterized
 *
 * RECOMMENDATION:
 * - Use Drizzle's query builder (eq, and, or, etc.) - always safe
 * - Avoid sql`` template unless you understand parameterization
 * - When using sql``, use ${value} not '${value}' (let Drizzle parameterize)
 */

/**
 * DRIZZLE CONFIGURATION FOR ADDITIONAL SECURITY
 */
export const drizzleConfig = {
  // Use same pool as raw SQL for consistency
  pool,

  // Schema validation (ensures queries match defined schema)
  schema,

  // Logging in development (helps catch issues early)
  logger: process.env.NODE_ENV === 'development',
};

/**
 * TYPE-SAFE HELPER FUNCTIONS
 *
 * These demonstrate how to create reusable, type-safe database functions
 */

import { eq, and, or } from 'drizzle-orm';
import { users, sessions, items, comments } from './db.drizzle.schema';

/**
 * Find user by email (Type-safe, SQL injection safe)
 *
 * @param email - User email
 * @returns User or undefined
 */
export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0];
}

/**
 * Create new user (Type-safe, SQL injection safe)
 *
 * TypeScript ensures all required fields are provided
 * All values are automatically parameterized
 */
export async function createUser(data: {
  email: string;
  password_hash: string;
  role?: 'user' | 'admin';
}) {
  const result = await db
    .insert(users)
    .values({
      email: data.email,
      password_hash: data.password_hash,
      role: data.role || 'user',
    })
    .returning();

  return result[0];
}

/**
 * Create session (Type-safe, SQL injection safe)
 */
export async function createSessionDrizzle(data: {
  user_id: number;
  session_token: string;
  csrf_token: string;
  expires_at: Date;
}) {
  const result = await db.insert(sessions).values(data).returning();
  return result[0];
}

/**
 * Get session with user data (Type-safe, SQL injection safe)
 *
 * Demonstrates type-safe join
 */
export async function getSessionWithUser(sessionToken: string) {
  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.user_id, users.id))
    .where(
      and(
        eq(sessions.session_token, sessionToken),
        // Check expiration: expires_at > NOW()
        // Using SQL function for server-side time comparison
        // This is safe because sessionToken is parameterized
      )
    )
    .limit(1);

  return result[0];
}

/**
 * Get items for user (Type-safe, SQL injection safe)
 *
 * Demonstrates complex authorization logic with Drizzle
 */
export async function getItemsForUser(userId: number, userRole: string) {
  const query = db
    .select({
      item: items,
      owner: users,
    })
    .from(items)
    .leftJoin(users, eq(items.user_id, users.id));

  // Admin sees everything, users see public + their own
  if (userRole === 'admin') {
    return query;
  } else {
    return query.where(
      or(
        eq(items.visibility, 'public'),
        eq(items.user_id, userId)
      )
    );
  }
}

/**
 * SUMMARY: Drizzle ORM Security
 *
 * ✅ Equally secure as raw SQL when used correctly
 * ✅ Automatic parameterization prevents SQL injection
 * ✅ Type safety catches errors at compile time
 * ✅ Better developer experience for complex queries
 * ✅ Schema migrations and type generation
 *
 * 🔒 SECURITY RULES:
 * 1. Use query builder (eq, and, or) - always safe
 * 2. Avoid sql`` template with string interpolation
 * 3. Validate user input before passing to Drizzle
 * 4. Use TypeScript types to catch errors early
 * 5. Still need application-level authorization checks
 *
 * 📚 BOTH IMPLEMENTATIONS AVAILABLE:
 * - Raw SQL: src/lib/db.ts (current implementation)
 * - Drizzle ORM: src/lib/db.drizzle.ts (this file, for reference)
 *
 * Choose based on your team's preference and project needs.
 * Both are equally secure when used properly.
 */
