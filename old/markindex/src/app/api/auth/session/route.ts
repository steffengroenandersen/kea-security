/**
 * Get Current Session API Route
 *
 * GET /api/auth/session
 *
 * Returns current user's session information
 * Used by client to check authentication status
 */

import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: session.user,
      csrfToken: session.csrf_token,
    });
  } catch (error) {
    console.error('Session check error:', error);

    return NextResponse.json(
      { error: 'Session check failed' },
      { status: 500 }
    );
  }
}
