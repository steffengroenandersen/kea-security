/**
 * User Logout API Route
 *
 * POST /api/auth/logout
 *
 * SECURITY FEATURES:
 * - Destroys session in database
 * - Clears session cookie
 * - CSRF protection via middleware
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Get session token from cookie
    const sessionToken = cookies().get('session_token')?.value;

    if (sessionToken) {
      // Destroy session in database
      await destroySession(sessionToken);
    }

    // Clear session cookie
    cookies().delete('session_token');

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);

    // Even if error occurs, clear cookie for client
    cookies().delete('session_token');

    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
