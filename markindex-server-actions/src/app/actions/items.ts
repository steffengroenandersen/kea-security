/**
 * Items CRUD Server Actions
 *
 * This file demonstrates secure data operations using Server Actions
 * instead of API routes.
 *
 * SECURITY FEATURES (Same as API routes):
 * ✅ Authentication required (session validation)
 * ✅ Authorization enforced (role-based access)
 * ✅ Server-side validation (never trust client)
 * ✅ Parameterized SQL queries (SQL injection prevention)
 * ✅ CSRF protection (automatic with Server Actions)
 *
 * KEY DIFFERENCE FROM API ROUTES:
 * - API Routes: Manual CSRF token validation on every POST/PUT/DELETE
 * - Server Actions: CSRF validated automatically by Next.js
 */

'use server'

import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/session';
import { validateContentLength, validateVisibility } from '@/lib/validation';

/**
 * Action result types
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Item type
 */
interface Item {
  id: number;
  user_id: number;
  title: string;
  content: string | null;
  visibility: 'private' | 'public';
  created_at: Date;
  updated_at: Date;
  owner_email?: string;
}

/**
 * Get items for current user (Server Action)
 *
 * SECURITY FEATURES:
 * - Authentication required (requireAuth throws if not logged in)
 * - Authorization: Admin sees all, users see public + own
 * - Parameterized queries (SQL injection prevention)
 *
 * COMPARISON TO API ROUTE:
 *
 * API Route (markindex/src/app/api/items/route.ts):
 * ```typescript
 * export async function GET(request: Request) {
 *   const session = await getSessionFromRequest(request);
 *   if (!session) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // ... query database
 *   return NextResponse.json({ items });
 * }
 * ```
 *
 * Server Action (this file):
 * ```typescript
 * export async function getItems() {
 *   const session = await requireAuth(); // Throws if not authenticated
 *   // ... query database
 *   return { success: true, data: items };
 * }
 * ```
 *
 * SECURITY: Both approaches are equally secure
 * - Both validate authentication
 * - Both enforce authorization
 * - Both use parameterized queries
 */
export async function getItems(): Promise<ActionResult<Item[]>> {
  try {
    // AUTHENTICATION: Throws error if not logged in
    // This is equivalent to returning 401 in API routes
    const session = await requireAuth();

    let result;

    // AUTHORIZATION: Role-based filtering
    if (session.user?.role === 'admin') {
      // Admin sees ALL items
      // SECURITY: Parameterized query (no SQL injection possible)
      result = await query(`
        SELECT items.*, users.email as owner_email
        FROM items
        LEFT JOIN users ON items.user_id = users.id
        ORDER BY items.created_at DESC
      `);
    } else {
      // Regular user sees: public items + their own items
      // SECURITY: Values ($1, $2) are parameterized
      result = await query(
        `SELECT items.*, users.email as owner_email
         FROM items
         LEFT JOIN users ON items.user_id = users.id
         WHERE items.visibility = $1 OR items.user_id = $2
         ORDER BY items.created_at DESC`,
        ['public', session.user!.id]
      );
    }

    return {
      success: true,
      data: result.rows as Item[],
    };
  } catch (error: any) {
    console.error('Get items error:', error);

    // If error is from requireAuth, pass it through
    if (error.message === 'Unauthorized - Please log in') {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to fetch items',
    };
  }
}

/**
 * Create new item (Server Action)
 *
 * SECURITY FEATURES:
 * - Authentication required
 * - Server-side validation (title, content, visibility)
 * - Whitelist validation for visibility
 * - Parameterized query
 * - CSRF protection automatic
 *
 * CSRF PROTECTION COMPARISON:
 *
 * API Routes (Manual CSRF):
 * ```typescript
 * const csrfToken = request.headers.get('X-CSRF-Token');
 * if (!csrfToken || csrfToken !== session.csrf_token) {
 *   return NextResponse.json({ error: 'Invalid CSRF' }, { status: 403 });
 * }
 * ```
 *
 * Server Actions (Automatic CSRF):
 * ```typescript
 * // No manual check needed!
 * // Next.js validates:
 * // 1. Origin header matches host
 * // 2. Referer is same-origin
 * // 3. Request is POST
 * // 4. Action ID is valid
 * ```
 *
 * BOTH ARE EQUALLY SECURE
 * - API Routes: Explicit CSRF token validation
 * - Server Actions: Implicit origin validation by Next.js
 */
export async function createItem(
  formData: FormData
): Promise<ActionResult<Item>> {
  try {
    // AUTHENTICATION: Throws if not logged in
    const session = await requireAuth();

    // Extract and validate data
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const visibility = formData.get('visibility') as string;

    // SERVER-SIDE VALIDATION
    // SECURITY: Never trust client-side validation

    // Validate title
    const titleValidation = validateContentLength(title, 1, 255);
    if (!titleValidation.valid) {
      return {
        success: false,
        error: titleValidation.error!,
      };
    }

    // Validate content (optional, but limit if provided)
    if (content) {
      const contentValidation = validateContentLength(content, 0, 10000);
      if (!contentValidation.valid) {
        return {
          success: false,
          error: contentValidation.error!,
        };
      }
    }

    // WHITELIST VALIDATION for visibility
    // Only 'private' or 'public' allowed, default to 'private'
    const validatedVisibility = validateVisibility(visibility);

    // SECURITY: Parameterized query prevents SQL injection
    // All values passed as parameters ($1, $2, $3, $4)
    const result = await query(
      `INSERT INTO items (user_id, title, content, visibility)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        session.user!.id,
        title.trim(),
        content?.trim() || null,
        validatedVisibility,
      ]
    );

    const newItem = result.rows[0] as Item;

    // Revalidate paths that show items
    // This ensures the new item appears immediately
    revalidatePath('/items');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: newItem,
    };
  } catch (error: any) {
    console.error('Create item error:', error);

    if (error.message?.includes('Unauthorized')) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to create item',
    };
  }
}

/**
 * Update item (Server Action)
 *
 * SECURITY FEATURES:
 * - Authentication required
 * - Authorization: Only owner can update (or admin)
 * - Server-side validation
 * - Parameterized queries
 *
 * AUTHORIZATION ENFORCEMENT:
 * This shows defense-in-depth:
 * 1. Verify user is authenticated (requireAuth)
 * 2. Verify user owns the item (database query)
 * 3. Only then allow update
 */
export async function updateItem(
  itemId: number,
  formData: FormData
): Promise<ActionResult<Item>> {
  try {
    // AUTHENTICATION
    const session = await requireAuth();

    // Extract data
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const visibility = formData.get('visibility') as string;

    // SERVER-SIDE VALIDATION
    const titleValidation = validateContentLength(title, 1, 255);
    if (!titleValidation.valid) {
      return {
        success: false,
        error: titleValidation.error!,
      };
    }

    if (content) {
      const contentValidation = validateContentLength(content, 0, 10000);
      if (!contentValidation.valid) {
        return {
          success: false,
          error: contentValidation.error!,
        };
      }
    }

    const validatedVisibility = validateVisibility(visibility);

    // AUTHORIZATION: Verify ownership
    // SECURITY: Check user owns item before allowing update
    const ownerCheck = await query(
      'SELECT * FROM items WHERE id = $1 AND user_id = $2',
      [itemId, session.user!.id]
    );

    if (ownerCheck.rows.length === 0) {
      // Item doesn't exist or user doesn't own it
      return {
        success: false,
        error: 'Item not found or you do not have permission to edit it',
      };
    }

    // Update item (parameterized query)
    const result = await query(
      `UPDATE items
       SET title = $1, content = $2, visibility = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [
        title.trim(),
        content?.trim() || null,
        validatedVisibility,
        itemId,
        session.user!.id,
      ]
    );

    // Revalidate paths
    revalidatePath('/items');
    revalidatePath(`/items/${itemId}`);

    return {
      success: true,
      data: result.rows[0] as Item,
    };
  } catch (error: any) {
    console.error('Update item error:', error);

    if (error.message?.includes('Unauthorized')) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to update item',
    };
  }
}

/**
 * Delete item (Server Action)
 *
 * SECURITY FEATURES:
 * - Authentication required
 * - Authorization: Only owner can delete
 * - Parameterized query
 */
export async function deleteItem(
  itemId: number
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    // AUTHENTICATION
    const session = await requireAuth();

    // AUTHORIZATION: Verify ownership before deletion
    const ownerCheck = await query(
      'SELECT * FROM items WHERE id = $1 AND user_id = $2',
      [itemId, session.user!.id]
    );

    if (ownerCheck.rows.length === 0) {
      return {
        success: false,
        error: 'Item not found or you do not have permission to delete it',
      };
    }

    // Delete item (parameterized query)
    await query(
      'DELETE FROM items WHERE id = $1 AND user_id = $2',
      [itemId, session.user!.id]
    );

    // Revalidate paths
    revalidatePath('/items');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error: any) {
    console.error('Delete item error:', error);

    if (error.message?.includes('Unauthorized')) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to delete item',
    };
  }
}

/**
 * Get single item (Server Action)
 *
 * SECURITY FEATURES:
 * - Authentication required
 * - Authorization: Only show if user has access
 * - Access rules: public items, own items, or admin
 */
export async function getItemById(
  itemId: number
): Promise<ActionResult<Item>> {
  try {
    // AUTHENTICATION
    const session = await requireAuth();

    // AUTHORIZATION: Check access
    // User can access if: item is public, item is theirs, or user is admin
    const result = await query(
      `SELECT items.*, users.email as owner_email
       FROM items
       LEFT JOIN users ON items.user_id = users.id
       WHERE items.id = $1
         AND (
           items.visibility = $2
           OR items.user_id = $3
           OR $4 = $5
         )`,
      [itemId, 'public', session.user!.id, session.user!.role, 'admin']
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Item not found',
      };
    }

    return {
      success: true,
      data: result.rows[0] as Item,
    };
  } catch (error: any) {
    console.error('Get item error:', error);

    if (error.message?.includes('Unauthorized')) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to fetch item',
    };
  }
}

/**
 * SECURITY SUMMARY: Server Actions for Data Operations
 *
 * AUTHENTICATION:
 * - requireAuth() throws error if not authenticated
 * - Simpler than API routes (no manual 401 responses)
 * - Same security level
 *
 * AUTHORIZATION:
 * - Role-based access control (admin vs user)
 * - Ownership verification before mutations
 * - Database-level enforcement
 * - Same as API routes
 *
 * CSRF PROTECTION:
 * - Automatic with Server Actions (Next.js validates origin)
 * - Manual with API routes (token validation)
 * - Both equally secure
 *
 * SQL INJECTION:
 * - Parameterized queries in both approaches
 * - Values never concatenated into SQL strings
 * - Equally secure
 *
 * VALIDATION:
 * - Server-side only (never trust client)
 * - Same validation functions used
 * - Equally secure
 *
 * REVALIDATION:
 * - Server Actions can call revalidatePath()
 * - API routes require client to refetch
 * - Server Actions more convenient (but same security)
 *
 * ADVANTAGES OF SERVER ACTIONS:
 * 1. Less boilerplate (no Request/Response handling)
 * 2. Automatic CSRF (no manual token validation)
 * 3. Type-safe (direct TypeScript imports)
 * 4. Progressive enhancement (works without JS)
 * 5. Automatic revalidation
 *
 * ADVANTAGES OF API ROUTES:
 * 1. RESTful architecture (familiar pattern)
 * 2. Can be called from external clients
 * 3. Explicit HTTP layer (more control)
 * 4. Standard REST conventions
 * 5. Easier to version
 *
 * SECURITY LEVEL: EQUAL
 * Choose based on architecture needs, not security.
 */

/**
 * CLIENT USAGE EXAMPLE:
 *
 * ```typescript
 * 'use client'
 *
 * import { createItem, deleteItem } from '@/app/actions/items';
 * import { useRouter } from 'next/navigation';
 *
 * export default function ItemForm() {
 *   const router = useRouter();
 *
 *   async function handleCreate(formData: FormData) {
 *     const result = await createItem(formData);
 *
 *     if (result.success) {
 *       // Item created, redirect
 *       router.push('/items');
 *     } else {
 *       // Show error
 *       alert(result.error);
 *     }
 *   }
 *
 *   async function handleDelete(id: number) {
 *     const result = await deleteItem(id);
 *
 *     if (result.success) {
 *       router.refresh(); // Refresh to show updated list
 *     } else {
 *       alert(result.error);
 *     }
 *   }
 *
 *   return (
 *     <form action={handleCreate}>
 *       <input name="title" required />
 *       <textarea name="content" />
 *       <select name="visibility">
 *         <option value="private">Private</option>
 *         <option value="public">Public</option>
 *       </select>
 *       <button type="submit">Create</button>
 *     </form>
 *   );
 * }
 * ```
 */
