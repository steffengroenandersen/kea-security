/**
 * Authentication Module
 *
 * Provides secure authentication utilities:
 * - Password hashing with bcrypt
 * - Session management
 * - CSRF token generation
 *
 * Security Features:
 * - bcrypt with salt rounds = 10 (prevents rainbow table attacks)
 * - Cryptographically random session tokens (crypto.randomBytes)
 * - Secure session storage in database (not client-side)
 * - CSRF tokens for state-changing operations
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from './db';

// bcrypt configuration
const SALT_ROUNDS = 10;  // Balance between security and performance

// Session configuration
const SESSION_DURATION = 24 * 60 * 60 * 1000;  // 24 hours in milliseconds

// Type definitions
export interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
  profile_picture?: string;
  created_at: Date;
}

export interface Session {
  id: number;
  user_id: number;
  session_token: string;
  csrf_token: string;
  expires_at: Date;
  user?: User;  // Populated by getSession()
}

/**
 * Hash a password using bcrypt
 *
 * SECURITY: bcrypt is designed to be slow (prevents brute force attacks)
 * - Automatically generates random salt (prevents rainbow table attacks)
 * - Adaptive: can increase saltRounds as hardware improves
 *
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password (safe to store in database)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 *
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param password - Plain text password from login attempt
 * @param hash - Hashed password from database
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new session for a user
 *
 * SECURITY:
 * - Session token is cryptographically random (32 bytes = 256 bits)
 * - CSRF token is separate and equally random
 * - Tokens stored in database, only session_token sent to client as cookie
 * - Session expires after 24 hours
 *
 * @param userId - ID of authenticated user
 * @returns Promise<Session> - Created session with tokens
 */
export async function createSession(userId: number): Promise<Session> {
  // Generate cryptographically random tokens
  const sessionToken = crypto.randomBytes(32).toString('hex');  // 64 hex chars
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  // Store session in database using parameterized query (SQL injection prevention)
  const result = await query<Session>(
    `INSERT INTO sessions (user_id, session_token, csrf_token, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, sessionToken, csrfToken, expiresAt]
  );

  return result.rows[0];
}

/**
 * Get session and user data from session token
 *
 * SECURITY:
 * - Validates session hasn't expired
 * - Uses parameterized query to prevent SQL injection
 * - Returns null if session invalid (forcing re-authentication)
 *
 * @param sessionToken - Token from httpOnly cookie
 * @returns Promise<Session | null> - Session with user data, or null if invalid
 */
export async function getSession(sessionToken: string): Promise<Session | null> {
  // Parameterized query prevents SQL injection
  // JOIN to get user data in one query (performance optimization)
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
 * Destroy a session (logout)
 *
 * @param sessionToken - Token to invalidate
 */
export async function destroySession(sessionToken: string): Promise<void> {
  await query(
    'DELETE FROM sessions WHERE session_token = $1',
    [sessionToken]
  );
}

/**
 * Destroy all sessions for a user
 *
 * Useful for "logout all devices" or after password change
 *
 * @param userId - User ID
 */
export async function destroyAllUserSessions(userId: number): Promise<void> {
  await query(
    'DELETE FROM sessions WHERE user_id = $1',
    [userId]
  );
}

/**
 * Cleanup expired sessions
 *
 * Should be run periodically (e.g., cron job every hour)
 * Prevents database bloat from expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const result = await query(
    'DELETE FROM sessions WHERE expires_at < NOW()'
  );

  if (process.env.NODE_ENV === 'development') {
    console.log(`Cleaned up ${result.rowCount} expired sessions`);
  }
}

/**
 * Get session from request
 *
 * Helper to extract session token from cookies and validate
 *
 * @param request - Next.js request object
 * @returns Promise<Session | null>
 */
export async function getSessionFromRequest(
  request: Request
): Promise<Session | null> {
  // Extract session token from cookie
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  // Parse cookies (simple implementation)
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...values] = c.split('=');
      return [key, values.join('=')];
    })
  );

  const sessionToken = cookies.session_token;
  if (!sessionToken) {
    return null;
  }

  return getSession(sessionToken);
}
