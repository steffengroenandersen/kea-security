import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup"];

/**
 * Proxy to protect routes
 * Protects all /app/* routes - checks for session cookie
 * Full validation happens in server components
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Only protect /app/* routes
  if (!pathname.startsWith("/app/")) {
    return NextResponse.next();
  }

  // Check if session cookie exists
  const sessionCookie = request.cookies.get("session");

  if (!sessionCookie) {
    // No session cookie - redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Session cookie exists - allow request
  // Full validation happens in the page server component
  return NextResponse.next();
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
