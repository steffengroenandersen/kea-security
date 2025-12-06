import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { session, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateRandomString } from "@oslojs/crypto/random";

// Session configuration
const SESSION_COOKIE_NAME = "session";
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
const FIFTEEN_DAYS_MS = 1000 * 60 * 60 * 24 * 15;

/**
 * Generate a cryptographically secure random session token
 * Uses 32 characters (160+ bits of entropy) - Copenhagen Book recommends at least 112 bits
 * @returns Random session token string
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(20); // 20 bytes = 160 bits
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Create a new session for a user
 * @param userId - The user ID to create a session for
 * @returns Object containing session token and expiration date
 */
export async function createSession(userId: number) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

  await db.insert(session).values({
    sessionToken: token,
    userId: userId,
    expiresAt: expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Validate a session token and return associated user data
 * Automatically extends session if less than 15 days remaining
 * @param token - The session token to validate
 * @returns Object containing session and user data, or null values if invalid
 */
export async function validateSessionToken(token: string) {
  const result = await db
    .select({
      user: user,
      session: session,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.userId))
    .where(eq(session.sessionToken, token))
    .limit(1);

  if (result.length === 0) {
    return { session: null, user: null };
  }

  const { user: userData, session: sessionData } = result[0];

  // Check if session is expired
  if (Date.now() >= sessionData.expiresAt.getTime()) {
    await db
      .delete(session)
      .where(eq(session.sessionId, sessionData.sessionId));
    return { session: null, user: null };
  }

  // Extend session if less than 15 days remaining
  if (Date.now() >= sessionData.expiresAt.getTime() - FIFTEEN_DAYS_MS) {
    const newExpiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await db
      .update(session)
      .set({ expiresAt: newExpiresAt })
      .where(eq(session.sessionId, sessionData.sessionId));
    sessionData.expiresAt = newExpiresAt;
  }

  return { session: sessionData, user: userData };
}

/**
 * Invalidate a session by deleting it from the database
 * @param sessionId - The session ID to invalidate
 */
export async function invalidateSession(sessionId: number): Promise<void> {
  await db.delete(session).where(eq(session.sessionId, sessionId));
}

/**
 * Set the session cookie in the response
 * @param token - The session token to store in the cookie
 * @param expiresAt - When the cookie should expire
 */
export async function setSessionCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax", // CSRF protection while allowing navigation
    expires: expiresAt, // Cookie expires with session
    path: "/", // Available site-wide
  });
}

/**
 * Delete the session cookie from the response
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Immediate expiration
    path: "/",
  });
}

/**
 * Get the session token from the cookie
 * @returns The session token if present, undefined otherwise
 */
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}
