/**
 * User Login API Route
 *
 * POST /api/auth/login
 *
 * SECURITY FEATURES:
 * - Password verification with bcrypt
 * - Session creation with cryptographic tokens
 * - HttpOnly, Secure, SameSite cookies
 * - CSRF token generation
 * - Parameterized SQL queries
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { createSession, verifyPassword, User } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation
    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!body.password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    // Find user by email (parameterized query)
    const result = await query<User & { password_hash: string }>(
      'SELECT * FROM users WHERE email = $1',
      [body.email]
    );

    if (result.rows.length === 0) {
      // SECURITY: Generic error message (don't reveal if email exists)
      // This prevents email enumeration attacks
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password using bcrypt
    const passwordValid = await verifyPassword(body.password, user.password_hash);

    if (!passwordValid) {
      // SECURITY: Generic error message (same as above)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session with cryptographic tokens
    const session = await createSession(user.id);

    // Set session cookie
    // SECURITY FEATURES:
    // - httpOnly: JavaScript cannot access (XSS protection)
    // - secure: HTTPS only in production (man-in-the-middle protection)
    // - sameSite: 'lax' (CSRF protection)
    // - path: '/' (available to all routes)
    cookies().set('session_token', session.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Return user data and CSRF token
    // CSRF token sent in response body (client stores it for API requests)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
      },
      csrfToken: session.csrf_token,
    });
  } catch (error) {
    console.error('Login error:', error);

    // SECURITY: Don't leak internal error details
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
