/**
 * Next.js Middleware
 *
 * Runs on every request before reaching API routes or pages
 *
 * SECURITY FEATURES:
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - CSRF protection for state-changing requests
 * - Authentication checks for protected routes
 *
 * This middleware applies defense-in-depth:
 * - Headers provide baseline security
 * - Individual routes also validate auth and CSRF
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { validateCsrfToken, requiresCsrfProtection } from '@/lib/csrf';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ============================================
  // SECURITY HEADERS
  // ============================================

  // Content Security Policy (XSS Prevention)
  // Controls what resources can be loaded and from where
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",  // Only load resources from same origin
      "script-src 'self' 'unsafe-inline'",  // Scripts from self + inline (Next.js requires inline)
      "style-src 'self' 'unsafe-inline'",  // Styles from self + inline (Tailwind requires inline)
      "img-src 'self' data: https:",  // Images from self, data URLs, and HTTPS
      "font-src 'self'",  // Fonts from same origin only
      "object-src 'none'",  // No Flash, Java applets, etc.
      "base-uri 'self'",  // Prevent <base> tag injection
      "form-action 'self'",  // Forms only submit to same origin
      "frame-ancestors 'none'",  // Cannot be embedded in iframes (clickjacking prevention)
      "upgrade-insecure-requests",  // Upgrade HTTP requests to HTTPS
    ].join('; ')
  );

  // Prevent MIME type sniffing (security risk)
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection (prevents embedding in iframes)
  response.headers.set('X-Frame-Options', 'DENY');

  // XSS protection for legacy browsers (modern browsers use CSP)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy (privacy + security)
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS (HTTP Strict Transport Security)
  // Forces HTTPS for 1 year, including subdomains
  // Only in production (development uses HTTP)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Remove X-Powered-By header (information disclosure)
  response.headers.delete('X-Powered-By');

  // ============================================
  // CSRF PROTECTION
  // ============================================

  // Check if request is to API route
  if (request.nextUrl.pathname.startsWith('/api')) {
    // CSRF protection for state-changing operations
    if (requiresCsrfProtection(request.method)) {
      // Get session from cookie
      const cookieHeader = request.headers.get('cookie');
      if (!cookieHeader) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Parse session token from cookies
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [key, ...values] = c.split('=');
          return [key, values.join('=')];
        })
      );

      const sessionToken = cookies.session_token;
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Get session from database
      const session = await getSession(sessionToken);
      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Validate CSRF token
      // Exception: auth endpoints don't need CSRF (they create sessions)
      const isAuthEndpoint = request.nextUrl.pathname.startsWith('/api/auth');
      if (!isAuthEndpoint && !validateCsrfToken(request, session)) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }
  }

  // ============================================
  // AUTHENTICATION FOR PROTECTED PAGES
  // ============================================

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/items',
    '/profile',
    '/admin',
  ];

  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      // Redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...values] = c.split('=');
        return [key, values.join('=')];
      })
    );

    const sessionToken = cookies.session_token;
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Admin-only routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (session.user?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return response;
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
