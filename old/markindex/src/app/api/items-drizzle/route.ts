/**
 * Items API - Drizzle ORM Version
 *
 * This file demonstrates the SAME security-focused API implementation
 * using Drizzle ORM instead of raw SQL.
 *
 * SECURITY COMPARISON:
 *
 * Raw SQL Version (src/app/api/items/route.ts):
 * - Uses parameterized queries: query('SELECT * FROM items WHERE id = $1', [id])
 * - SQL injection safe through parameter binding
 * - Manual query construction
 *
 * Drizzle Version (this file):
 * - Uses query builder: db.select().from(items).where(eq(items.id, id))
 * - SQL injection safe through automatic parameterization
 * - Type-safe query construction
 *
 * BOTH ARE EQUALLY SECURE - Drizzle generates parameterized queries internally
 *
 * This file is provided as a reference/example.
 * In production, use ONE approach (raw SQL OR Drizzle), not both.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db.drizzle';
import { items, users } from '@/lib/db.drizzle.schema';
import { eq, or, and, desc } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/auth';
import { validateContentLength, validateVisibility } from '@/lib/validation';

/**
 * GET /api/items-drizzle
 *
 * List items based on user role and visibility
 *
 * SECURITY FEATURES:
 * - Authentication required
 * - Role-based access control
 * - Query parameterization (automatic with Drizzle)
 */
export async function GET(request: Request) {
  // AUTHENTICATION CHECK
  const session = await getSessionFromRequest(request);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let itemsList;

    // AUTHORIZATION: Role-based filtering
    if (session.user.role === 'admin') {
      // Admin sees ALL items
      // DRIZZLE SECURITY: All values are automatically parameterized
      itemsList = await db
        .select({
          id: items.id,
          user_id: items.user_id,
          title: items.title,
          content: items.content,
          visibility: items.visibility,
          created_at: items.created_at,
          updated_at: items.updated_at,
          owner_email: users.email,
        })
        .from(items)
        .leftJoin(users, eq(items.user_id, users.id))
        .orderBy(desc(items.created_at));

      /* EQUIVALENT RAW SQL (equally secure):
       * query(`
       *   SELECT items.*, users.email as owner_email
       *   FROM items
       *   LEFT JOIN users ON items.user_id = users.id
       *   ORDER BY items.created_at DESC
       * `)
       */
    } else {
      // Regular user sees: public items + their own items
      // DRIZZLE SECURITY: 'public' and session.user.id are parameterized
      // Generated SQL: WHERE visibility = $1 OR user_id = $2
      itemsList = await db
        .select({
          id: items.id,
          user_id: items.user_id,
          title: items.title,
          content: items.content,
          visibility: items.visibility,
          created_at: items.created_at,
          updated_at: items.updated_at,
          owner_email: users.email,
        })
        .from(items)
        .leftJoin(users, eq(items.user_id, users.id))
        .where(
          or(
            eq(items.visibility, 'public'),
            eq(items.user_id, session.user.id)
          )
        )
        .orderBy(desc(items.created_at));

      /* EQUIVALENT RAW SQL (equally secure):
       * query(`
       *   SELECT items.*, users.email as owner_email
       *   FROM items
       *   LEFT JOIN users ON items.user_id = users.id
       *   WHERE visibility = $1 OR user_id = $2
       *   ORDER BY items.created_at DESC
       * `, ['public', session.user.id])
       */
    }

    return NextResponse.json({ items: itemsList });
  } catch (error) {
    console.error('Drizzle query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/items-drizzle
 *
 * Create new item
 *
 * SECURITY FEATURES:
 * - Authentication required
 * - Server-side validation (never trust client)
 * - Whitelist validation for visibility
 * - Automatic parameterization with Drizzle
 */
export async function POST(request: Request) {
  // AUTHENTICATION CHECK
  const session = await getSessionFromRequest(request);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // SERVER-SIDE VALIDATION
    // Never trust client-side validation

    // Validate title
    const titleValidation = validateContentLength(body.title, 1, 255);
    if (!titleValidation.valid) {
      return NextResponse.json(
        { error: titleValidation.error },
        { status: 400 }
      );
    }

    // Validate content (optional, but limit if provided)
    if (body.content) {
      const contentValidation = validateContentLength(body.content, 0, 10000);
      if (!contentValidation.valid) {
        return NextResponse.json(
          { error: contentValidation.error },
          { status: 400 }
        );
      }
    }

    // WHITELIST VALIDATION for visibility
    // Only accept 'private' or 'public', default to 'private'
    const visibility = validateVisibility(body.visibility);

    // DRIZZLE INSERT (SQL injection safe)
    // All values are automatically parameterized
    // Generated SQL: INSERT INTO items (user_id, title, content, visibility) VALUES ($1, $2, $3, $4)
    const newItem = await db
      .insert(items)
      .values({
        user_id: session.user.id,         // Parameterized: $1
        title: body.title.trim(),         // Parameterized: $2
        content: body.content?.trim(),    // Parameterized: $3
        visibility: visibility,           // Parameterized: $4
      })
      .returning();

    /* EQUIVALENT RAW SQL (equally secure):
     * query(`
     *   INSERT INTO items (user_id, title, content, visibility)
     *   VALUES ($1, $2, $3, $4)
     *   RETURNING *
     * `, [session.user.id, body.title.trim(), body.content?.trim(), visibility])
     */

    return NextResponse.json({ item: newItem[0] }, { status: 201 });
  } catch (error) {
    console.error('Drizzle insert error:', error);

    // SECURITY: Don't leak internal error details
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}

/**
 * SECURITY ANALYSIS: Why Both Approaches Are Equally Secure
 *
 * 1. PARAMETERIZATION:
 *    Raw SQL:  query('SELECT * FROM items WHERE id = $1', [id])
 *    Drizzle:  db.select().from(items).where(eq(items.id, id))
 *    Both pass values as parameters, not in SQL string
 *
 * 2. SQL INJECTION PREVENTION:
 *    Attack: id = "1 OR 1=1"
 *    Raw SQL: Treats as literal string "1 OR 1=1" (not SQL code)
 *    Drizzle: Treats as literal string "1 OR 1=1" (not SQL code)
 *    Result: Both safe, no injection possible
 *
 * 3. AUTHORIZATION:
 *    Both enforce same business logic:
 *    - Check user session
 *    - Verify ownership or role
 *    - Apply visibility filters
 *
 * 4. VALIDATION:
 *    Both use same validation functions:
 *    - validateContentLength()
 *    - validateVisibility()
 *    - Server-side only (never trust client)
 *
 * ADVANTAGES OF DRIZZLE:
 * ✅ Type safety (TypeScript catches errors at compile time)
 * ✅ Auto-completion (IDE helps write queries)
 * ✅ Easier complex joins
 * ✅ Schema migrations
 * ✅ No manual SQL strings
 *
 * ADVANTAGES OF RAW SQL:
 * ✅ Explicit control
 * ✅ No additional dependencies
 * ✅ Easier for SQL experts
 * ✅ Performance optimization easier
 * ✅ Simpler debugging (raw SQL visible)
 *
 * RECOMMENDATION FOR REPORT:
 * "Both raw SQL with parameterized queries and Drizzle ORM provide
 * equal protection against SQL injection. The choice is about developer
 * experience and team preference, not security. This project demonstrates
 * raw SQL for explicitness and educational clarity, but includes Drizzle
 * examples to show that ORMs can be equally secure when used correctly."
 */

/**
 * COMMON MISTAKES TO AVOID (Both Raw SQL and Drizzle):
 *
 * ❌ WRONG (Raw SQL - String interpolation):
 * query(`SELECT * FROM items WHERE id = ${id}`)  // VULNERABLE
 *
 * ✅ CORRECT (Raw SQL - Parameterized):
 * query('SELECT * FROM items WHERE id = $1', [id])  // SAFE
 *
 * ❌ WRONG (Drizzle - SQL template with interpolation):
 * import { sql } from 'drizzle-orm';
 * db.select().from(items).where(sql`id = '${id}'`)  // VULNERABLE
 *
 * ✅ CORRECT (Drizzle - Query builder):
 * db.select().from(items).where(eq(items.id, id))  // SAFE
 *
 * ✅ ALSO CORRECT (Drizzle - SQL template with parameter):
 * db.select().from(items).where(sql`id = ${id}`)  // SAFE (no quotes around ${id})
 */
