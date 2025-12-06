/**
 * Authentication Server Actions
 *
 * This file demonstrates secure authentication using Next.js Server Actions
 * instead of API routes.
 *
 * SECURITY COMPARISON: Server Actions vs API Routes
 *
 * SIMILARITIES (Security features are the same):
 * ✅ Password hashing with bcrypt
 * ✅ Parameterized SQL queries
 * ✅ Server-side validation
 * ✅ httpOnly cookie sessions
 * ✅ Role-based access control
 *
 * DIFFERENCES (How you implement them):
 * - API Routes: Manual CSRF token validation
 * - Server Actions: Automatic CSRF protection by Next.js
 * - API Routes: Request/Response objects
 * - Server Actions: Direct function calls with FormData
 * - API Routes: fetch() from client
 * - Server Actions: Import and call directly
 *
 * BOTH ARE EQUALLY SECURE - Just different APIs
 */

'use server'

/**
 * IMPORTANT: 'use server' directive
 *
 * This marks all exports as Server Actions:
 * - Functions run on server only (never sent to client)
 * - Can access database, secrets, file system
 * - Automatically validated by Next.js for CSRF
 * - Type-safe when imported in client components
 *
 * SECURITY: Code in this file NEVER reaches the client
 * - Even if you import it, only a reference is sent
 * - Actual code execution happens server-side
 * - Client gets a proxied function call
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { setSessionCookie, clearSessionCookie } from '@/lib/session';
import { isValidEmail, isStrongPassword } from '@/lib/validation';

/**
 * Action result types for type-safe error handling
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Register new user (Server Action)
 *
 * SECURITY FEATURES:
 * - Server-side validation (never trust client)
 * - Password hashing with bcrypt
 * - Parameterized SQL queries
 * - Role forced to 'user' (privilege escalation prevention)
 * - CSRF protected automatically by Next.js
 *
 * COMPARISON TO API ROUTE:
 *
 * API Route (markindex/src/app/api/auth/register/route.ts):
 * ```typescript
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *   // ... validation and hashing
 *   return NextResponse.json({ user });
 * }
 * ```
 *
 * Server Action (this file):
 * ```typescript
 * export async function registerUser(formData: FormData) {
 *   // ... validation and hashing
 *   return { success: true, data: user };
 * }
 * ```
 *
 * Client usage:
 * API Route: await fetch('/api/auth/register', { method: 'POST', body })
 * Server Action: await registerUser(formData)
 */
export async function registerUser(
  formData: FormData
): Promise<ActionResult<{ id: number; email: string; role: string }>> {
  try {
    // Extract data from FormData
    // FormData is standard web API (works with forms without JavaScript)
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // SERVER-SIDE VALIDATION
    // SECURITY: Never trust client-side validation

    // Validate email format
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    // Validate password strength
    if (!isStrongPassword(password)) {
      return {
        success: false,
        error: 'Password must be at least 8 characters with letter and number',
      };
    }

    // SECURITY: Hash password with bcrypt (10 salt rounds)
    // Never store plain text passwords
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // SECURITY: Force role to 'user' (ignore any client-provided role)
    // This prevents privilege escalation attacks
    const role = 'user';

    try {
      // SECURITY: Parameterized query prevents SQL injection
      // Values passed as parameters ($1, $2, $3), not concatenated
      const result = await query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id, email, role, created_at`,
        [email, passwordHash, role]
      );

      const user = result.rows[0];

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error: any) {
      // Check for unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Email already registered',
        };
      }

      throw error;
    }
  } catch (error) {
    console.error('Registration error:', error);

    // SECURITY: Don't leak internal error details to client
    return {
      success: false,
      error: 'Registration failed. Please try again.',
    };
  }
}

/**
 * Login user (Server Action)
 *
 * SECURITY FEATURES:
 * - Password verification with bcrypt
 * - Generic error messages (prevent email enumeration)
 * - httpOnly cookie sessions
 * - CSRF protected automatically by Next.js
 *
 * CSRF PROTECTION COMPARISON:
 *
 * API Routes (Manual):
 * ```typescript
 * // Generate CSRF token on login
 * const csrfToken = crypto.randomBytes(32).toString('hex');
 * // Store in session
 * // Return to client
 * // Client must send in X-CSRF-Token header on future requests
 * // Server validates on every POST/PUT/DELETE
 * ```
 *
 * Server Actions (Automatic):
 * ```typescript
 * // Next.js automatically validates:
 * // - Origin header matches host
 * // - Referer header is same-origin
 * // - Request is POST
 * // No manual token needed!
 * ```
 *
 * BOTH ARE EQUALLY SECURE
 * - API Routes: Explicit token validation (you control it)
 * - Server Actions: Implicit origin validation (Next.js does it)
 */
export async function loginUser(
  formData: FormData
): Promise<ActionResult<{ redirect: string }>> {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Basic validation
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    if (!password) {
      return {
        success: false,
        error: 'Password required',
      };
    }

    // Find user by email (parameterized query)
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // SECURITY: Generic error message (don't reveal if email exists)
      // This prevents email enumeration attacks
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    const user = result.rows[0];

    // Verify password using bcrypt
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      // SECURITY: Generic error message (same as above)
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Create session with cryptographic tokens
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session in database (parameterized query)
    await query(
      `INSERT INTO sessions (user_id, session_token, csrf_token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, sessionToken, csrfToken, expiresAt]
    );

    // Set httpOnly cookie (XSS protection)
    // SECURITY: Same cookie configuration as API routes
    setSessionCookie(sessionToken);

    // NOTE: With Server Actions, we DON'T need to send CSRF token to client
    // Next.js handles CSRF protection automatically

    // Revalidate paths that show user-specific data
    // This ensures fresh data is shown after login
    revalidatePath('/dashboard');
    revalidatePath('/items');

    return {
      success: true,
      data: { redirect: '/dashboard' },
    };
  } catch (error) {
    console.error('Login error:', error);

    // SECURITY: Don't leak internal error details
    return {
      success: false,
      error: 'Login failed. Please try again.',
    };
  }
}

/**
 * Logout user (Server Action)
 *
 * SECURITY:
 * - Destroys session in database
 * - Clears httpOnly cookie
 * - No CSRF check needed (logout is safe operation)
 */
export async function logoutUser(): Promise<ActionResult<{ redirect: string }>> {
  try {
    // Get session token from cookie
    const { cookies } = await import('next/headers');
    const sessionToken = cookies().get('session_token')?.value;

    if (sessionToken) {
      // Destroy session in database (parameterized query)
      await query(
        'DELETE FROM sessions WHERE session_token = $1',
        [sessionToken]
      );
    }

    // Clear cookie
    clearSessionCookie();

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/login');

    return {
      success: true,
      data: { redirect: '/login' },
    };
  } catch (error) {
    console.error('Logout error:', error);

    // Even if error occurs, clear cookie for client
    clearSessionCookie();

    return {
      success: false,
      error: 'Logout failed',
    };
  }
}

/**
 * SECURITY ANALYSIS: Why Server Actions Are Secure
 *
 * 1. SERVER-SIDE EXECUTION:
 *    - All code runs on server (never sent to client)
 *    - Database credentials never exposed
 *    - Sensitive logic protected
 *
 * 2. AUTOMATIC CSRF PROTECTION:
 *    - Next.js validates origin header
 *    - Only same-origin requests allowed
 *    - POST-only enforcement
 *    - No manual token needed
 *
 * 3. PARAMETERIZED QUERIES:
 *    - Same as API routes
 *    - SQL injection prevention
 *    - Values passed as parameters
 *
 * 4. BCRYPT PASSWORD HASHING:
 *    - Same as API routes
 *    - Salted hashing (10 rounds)
 *    - Rainbow table protection
 *
 * 5. SECURE SESSIONS:
 *    - httpOnly cookies (XSS protection)
 *    - Secure flag in production (HTTPS only)
 *    - SameSite=Lax (CSRF baseline)
 *    - Same as API routes
 *
 * 6. SERVER-SIDE VALIDATION:
 *    - Never trust client input
 *    - All validation happens server-side
 *    - Same principle as API routes
 *
 * COMPARISON TO API ROUTES:
 *
 * | Feature | API Routes | Server Actions |
 * |---------|-----------|----------------|
 * | SQL Injection Prevention | ✅ Parameterized | ✅ Parameterized |
 * | Password Hashing | ✅ bcrypt | ✅ bcrypt |
 * | Session Security | ✅ httpOnly | ✅ httpOnly |
 * | CSRF Protection | ✅ Manual tokens | ✅ Automatic |
 * | Server-side Validation | ✅ Yes | ✅ Yes |
 * | Authorization | ✅ Manual check | ✅ Manual check |
 * | Security Level | 🔒 Secure | 🔒 Secure |
 *
 * CONCLUSION:
 * Both approaches are equally secure. The difference is in:
 * - How you call them (fetch vs direct function)
 * - How CSRF is handled (manual vs automatic)
 * - Amount of boilerplate code
 *
 * Choose based on architecture needs, not security.
 */

/**
 * CLIENT USAGE EXAMPLE:
 *
 * ```typescript
 * // In a Client Component (with 'use client')
 * import { loginUser } from '@/app/actions/auth';
 *
 * export default function LoginForm() {
 *   async function handleSubmit(formData: FormData) {
 *     const result = await loginUser(formData);
 *
 *     if (result.success) {
 *       // Redirect handled by action
 *       window.location.href = result.data.redirect;
 *     } else {
 *       // Show error
 *       setError(result.error);
 *     }
 *   }
 *
 *   return (
 *     <form action={handleSubmit}>
 *       <input name="email" type="email" required />
 *       <input name="password" type="password" required />
 *       <button type="submit">Login</button>
 *     </form>
 *   );
 * }
 * ```
 *
 * PROGRESSIVE ENHANCEMENT:
 * You can also use form action directly (works without JavaScript):
 *
 * ```typescript
 * <form action={loginUser}>
 *   <input name="email" type="email" required />
 *   <input name="password" type="password" required />
 *   <button type="submit">Login</button>
 * </form>
 * ```
 *
 * If JavaScript is disabled, form still works (native browser submission)
 */
