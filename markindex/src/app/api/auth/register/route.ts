/**
 * User Registration API Route
 *
 * POST /api/auth/register
 *
 * SECURITY FEATURES:
 * - Server-side validation (never trust client)
 * - Password hashing with bcrypt
 * - Parameterized SQL queries (SQL injection prevention)
 * - Email uniqueness check
 * - Role forced to 'user' (privilege escalation prevention)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isValidEmail, isStrongPassword } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // SERVER-SIDE VALIDATION
    // Never trust client-side validation - it can be bypassed

    // Validate email format
    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (!isStrongPassword(body.password)) {
      return NextResponse.json(
        {
          error:
            'Password must be at least 8 characters and contain both letters and numbers',
        },
        { status: 400 }
      );
    }

    // Hash password before storage
    // SECURITY: Never store plain-text passwords
    const passwordHash = await hashPassword(body.password);

    // SECURITY: Force role to 'user' (ignore any client-provided role)
    // This prevents privilege escalation attacks
    const role = 'user';

    try {
      // Insert user with parameterized query (SQL injection prevention)
      const result = await query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id, email, role, created_at`,
        [body.email, passwordHash, role]
      );

      const user = result.rows[0];

      return NextResponse.json(
        { user },
        { status: 201 }
      );
    } catch (error: any) {
      // Check for unique constraint violation (duplicate email)
      if (error.code === '23505') {
        // SECURITY: Don't reveal whether email exists (prevents email enumeration)
        // But for better UX, we make an exception here
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error('Registration error:', error);

    // SECURITY: Don't leak internal error details to client
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
