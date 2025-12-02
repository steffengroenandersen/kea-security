/**
 * Session Management for Server Actions
 *
 * Server Actions require slightly different session handling than API routes
 * because they don't have direct access to Request objects.
 *
 * SECURITY COMPARISON: API Routes vs Server Actions
 *
 * API ROUTES:
 * - Access session via: getSessionFromRequest(request)
 * - Manual CSRF validation required
 * - Explicit cookie handling
 *
 * SERVER ACTIONS:
 * - Access session via: getServerSession() (uses Next.js cookies())
 * - CSRF protection automatic (Next.js validates origin)
 * - Simplified cookie handling
 *
 * BOTH ARE EQUALLY SECURE - Just different APIs for the same functionality
 */

import { cookies } from 'next/headers';
import { query } from './db';

/**
 * User type definition
 */
export interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
  profile_picture?: string;
  created_at: Date;
}

/**
 * Session type definition
 */
export interface Session {
  id: number;
  user_id: number;
  session_token: string;
  csrf_token: string;
  expires_at: Date;
  user?: User;
}

/**
 * Get current session from cookies (Server Actions version)
 *
 * SECURITY FEATURES:
 * - Validates session hasn't expired
 * - Uses parameterized queries (SQL injection prevention)
 * - Returns null for invalid sessions (fails securely)
 *
 * DIFFERENCE FROM API VERSION:
 * - Uses Next.js cookies() function instead of request.headers
 * - Same security properties, different API
 *
 * @returns Session with user data, or null if invalid
 */
export async function getServerSession(): Promise<Session | null> {
  // Get cookies using Next.js helper (Server Actions context)
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (!sessionToken) {
    return null;
  }

  // SECURITY: Parameterized query prevents SQL injection
  // JOIN user data in one query for performance
  const result = await query<Session & User>(
    `SELECT
       s.id, s.user_id, s.session_token, s.csrf_token, s.expires_at,
       u.id as user_id, u.email, u.role, u.profile_picture
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.session_token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Construct typed response
  return {
    id: row.id,
    user_id: row.user_id,
    session_token: row.session_token,
    csrf_token: row.csrf_token,
    expires_at: row.expires_at,
    user: {
      id: row.user_id,
      email: row.email,
      role: row.role,
      profile_picture: row.profile_picture,
      created_at: row.created_at,
    },
  };
}

/**
 * Require authenticated session (throws if not authenticated)
 *
 * USAGE IN SERVER ACTIONS:
 * const session = await requireAuth();
 * // If this line is reached, user is authenticated
 * // If not authenticated, error is thrown and action fails
 *
 * SECURITY: Fails securely - unauthorized access throws error
 */
export async function requireAuth(): Promise<Session> {
  const session = await getServerSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized - Please log in');
  }

  return session;
}

/**
 * Require admin role (throws if not admin)
 *
 * SECURITY: Defense in depth
 * - First checks authentication
 * - Then checks authorization (role)
 * - Fails securely with descriptive errors
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();

  if (session.user?.role !== 'admin') {
    throw new Error('Forbidden - Admin access required');
  }

  return session;
}

/**
 * Set session cookie (Server Actions version)
 *
 * SECURITY FEATURES:
 * - httpOnly: JavaScript cannot access (XSS protection)
 * - secure: HTTPS only in production (MITM protection)
 * - sameSite: 'lax' (CSRF protection baseline)
 * - maxAge: 24 hours (session expiration)
 *
 * SAME SECURITY as API routes version, different API
 */
export function setSessionCookie(sessionToken: string): void {
  cookies().set('session_token', sessionToken, {
    httpOnly: true,                                    // XSS protection
    secure: process.env.NODE_ENV === 'production',    // HTTPS only
    sameSite: 'lax',                                   // CSRF protection
    maxAge: 24 * 60 * 60,                             // 24 hours
    path: '/',
  });
}

/**
 * Clear session cookie (logout)
 */
export function clearSessionCookie(): void {
  cookies().delete('session_token');
}

/**
 * CSRF PROTECTION WITH SERVER ACTIONS
 *
 * IMPORTANT DIFFERENCE FROM API ROUTES:
 *
 * API ROUTES (Manual CSRF):
 * - Must generate CSRF token on login
 * - Must validate token on every POST/PUT/DELETE
 * - Must send token in request header
 * - Example: if (csrfToken !== session.csrf_token) { throw error }
 *
 * SERVER ACTIONS (Automatic CSRF):
 * - Next.js validates origin header automatically
 * - Only same-origin requests allowed
 * - No manual token validation needed
 * - Next.js handles it transparently
 *
 * HOW NEXT.JS PROTECTS SERVER ACTIONS:
 *
 * 1. Server Actions can ONLY be called from same origin
 * 2. Next.js validates 'Origin' and 'Referer' headers
 * 3. Actions are POST-only (GET requests rejected)
 * 4. Action IDs are cryptographically random
 * 5. Cannot be called from external websites
 *
 * SECURITY TEST:
 *
 * Try calling Server Action from evil.com:
 * ```html
 * <!-- evil.com -->
 * <form action="https://markindex.io/createItem" method="POST">
 *   <input name="title" value="Hacked!">
 * </form>
 * ```
 *
 * Result: Next.js blocks it (origin mismatch)
 *
 * COMPARISON:
 *
 * Both approaches are equally secure:
 * - API Routes: Manual CSRF token validation (explicit)
 * - Server Actions: Automatic origin validation (implicit)
 *
 * SERVER ACTIONS ADVANTAGES:
 * - Less code (no token generation/validation)
 * - Less complexity (framework handles it)
 * - Less error-prone (can't forget to validate)
 *
 * API ROUTES ADVANTAGES:
 * - Explicit control (you see the validation)
 * - Works with external clients (mobile apps)
 * - Traditional REST architecture
 *
 * RECOMMENDATION:
 * Use Server Actions for Next.js-only apps (simpler, equally secure)
 * Use API Routes for public APIs (more flexible, equally secure)
 */

/**
 * Example: Manual CSRF check (not needed, but shown for comparison)
 *
 * Server Actions DON'T need this because Next.js validates automatically,
 * but this shows what's happening behind the scenes.
 */
export async function validateServerActionOrigin(): Promise<boolean> {
  // Next.js does this automatically for Server Actions
  // This is just for educational purposes

  // In Server Actions context, we'd check headers like:
  // const origin = headers().get('origin');
  // const host = headers().get('host');
  // return origin === `https://${host}` || origin === `http://${host}`;

  // But with Server Actions, Next.js does this FOR US
  return true; // If action is called, origin was already validated
}

/**
 * SECURITY SUMMARY: Server Actions vs API Routes
 *
 * AUTHENTICATION:
 * - Both: httpOnly cookies with session tokens
 * - Both: Server-side validation
 * - Both: Secure cookie flags (httpOnly, secure, sameSite)
 *
 * CSRF PROTECTION:
 * - API Routes: Manual token validation (you implement it)
 * - Server Actions: Automatic origin validation (Next.js does it)
 * - Both: Equally secure
 *
 * SQL INJECTION:
 * - Both: Parameterized queries
 * - Both: Same database layer
 * - Both: Equally secure
 *
 * AUTHORIZATION:
 * - Both: Role-based access control
 * - Both: Server-side enforcement
 * - Both: Equally secure
 *
 * VALIDATION:
 * - Both: Server-side only (never trust client)
 * - Both: Same validation functions
 * - Both: Equally secure
 *
 * THE DIFFERENCE IS ONLY IN HOW YOU CALL THEM:
 * - API Routes: fetch('/api/items', { method: 'POST', ... })
 * - Server Actions: createItem(formData)
 *
 * SECURITY LEVEL IS THE SAME.
 */
