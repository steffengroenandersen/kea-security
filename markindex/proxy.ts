import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup"];

/**
 * Generate cryptographically secure nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16); // 128 bits
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * Build Content Security Policy header
 */
function buildCSPHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-inline'" : ''};
    img-src 'self' blob: data:;
    font-src 'self' data:;
    connect-src 'self' ${isDev ? 'ws://localhost:3000' : ''};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isDev ? '' : 'upgrade-insecure-requests;'}
  `.replace(/\s{2,}/g, ' ').trim();

  return cspHeader;
}

/**
 * Proxy to protect routes and apply security headers
 * Protects all /app/* routes - checks for session cookie
 * Full validation happens in server components
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate nonce for this request
  const nonce = generateNonce();
  const cspHeader = buildCSPHeader(nonce);

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-nonce', nonce);
    return response;
  }

  // Only protect /app/* routes
  if (!pathname.startsWith("/app/")) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-nonce', nonce);
    return response;
  }

  // Check if session cookie exists
  const sessionCookie = request.cookies.get("session");

  if (!sessionCookie) {
    // No session cookie - redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Session cookie exists - allow request with CSP headers
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);

  return response;
}

// Configure which routes use proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)",
  ],
};
