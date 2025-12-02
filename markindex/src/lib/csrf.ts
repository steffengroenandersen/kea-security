/**
 * CSRF Protection Module
 *
 * Implements the Synchronizer Token Pattern for CSRF prevention
 *
 * SECURITY: Cross-Site Request Forgery (CSRF) Protection
 *
 * HOW CSRF ATTACKS WORK:
 * 1. User logs into our site (gets session cookie)
 * 2. User visits attacker's site (evil.com)
 * 3. evil.com submits form to our site
 * 4. Browser automatically sends session cookie
 * 5. Our site thinks request is legitimate (has valid session)
 * 6. Unwanted action performed (e.g., transfer money, change email)
 *
 * DEFENSE LAYERS:
 * 1. CSRF tokens: Each session has unique token, required for state-changing operations
 * 2. SameSite cookies: Browser doesn't send cookies in cross-site POST requests
 * 3. Origin validation: Check request origin matches our domain
 *
 * CSRF TOKEN FLOW:
 * 1. User logs in → server generates CSRF token, stores in session table
 * 2. Server sends CSRF token in response body (client stores in memory/localStorage)
 * 3. Client includes token in X-CSRF-Token header for POST/PUT/DELETE requests
 * 4. Server validates token matches session's CSRF token
 * 5. Attacker can't get token (same-origin policy prevents evil.com from reading our responses)
 */

import { Session } from './auth';

/**
 * Validate CSRF token from request
 *
 * Compares token from request header with token from session
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param request - HTTP request
 * @param session - User's session (contains CSRF token)
 * @returns boolean - True if CSRF token is valid
 */
export function validateCsrfToken(
  request: Request,
  session: Session
): boolean {
  // Extract CSRF token from request header
  // We use custom header (not cookie) because attacker can't set headers cross-origin
  const requestToken = request.headers.get('X-CSRF-Token');

  if (!requestToken) {
    return false;
  }

  // Compare tokens using constant-time comparison
  // This prevents timing attacks that could leak token information
  return timingSafeEqual(requestToken, session.csrf_token);
}

/**
 * Timing-safe string comparison
 *
 * SECURITY: Prevents timing attacks
 * - Regular === comparison returns immediately on first mismatch
 * - Attacker can measure response time to guess token byte-by-byte
 * - This function always takes same time regardless of match position
 *
 * @param a - First string
 * @param b - Second string
 * @returns boolean - True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  // If lengths differ, still perform comparison to maintain constant time
  const aLen = Buffer.byteLength(a);
  const bLen = Buffer.byteLength(b);

  // Convert to buffers for byte-level comparison
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Always compare full length (use longer buffer)
  const maxLen = Math.max(aLen, bLen);

  let result = aLen === bLen ? 0 : 1;

  // XOR each byte (result will be non-zero if any byte differs)
  for (let i = 0; i < maxLen; i++) {
    // Use modulo to handle different lengths without branching
    const byteA = bufA[i % aLen] || 0;
    const byteB = bufB[i % bLen] || 0;
    result |= byteA ^ byteB;
  }

  return result === 0;
}

/**
 * Check if request method requires CSRF protection
 *
 * CSRF protection only needed for state-changing operations
 * GET, HEAD, OPTIONS are safe (should not have side effects)
 *
 * @param method - HTTP method
 * @returns boolean - True if method requires CSRF token
 */
export function requiresCsrfProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Validate request origin
 *
 * Additional CSRF protection layer
 * Checks that request comes from our own domain
 *
 * @param request - HTTP request
 * @param allowedOrigins - Array of allowed origins
 * @returns boolean - True if origin is allowed
 */
export function validateOrigin(
  request: Request,
  allowedOrigins: string[]
): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Check origin header (present for CORS requests)
  if (origin) {
    return allowedOrigins.includes(origin);
  }

  // Fallback to referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  // No origin or referer (unusual but possible)
  // In strict mode, could reject these
  // For now, allow (rely on CSRF token validation)
  return true;
}
