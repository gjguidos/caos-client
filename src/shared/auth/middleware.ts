import { getRouteProtection, hasRequiredRole } from "@/shared/auth/lib/route-config";
import { readSession } from "@/shared/auth/lib/session";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const isProduction = process.env.NODE_ENV === "production";
  const { pathname } = request.nextUrl;

  //essential security headers
  response.headers.set("X-Frame-Options", "DENY"); // Prevents clickjacking attacks
  response.headers.set("X-Content-Type-Options", "nosniff"); // Prevents MIME type confusion attacks
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin"); // Privacy protection

  // CSP temporarily disabled - can be added later when properly configured
  // response.headers.set("Content-Security-Policy", "default-src 'self'");

  // HSTS only in production
  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Skip auth check for API routes, static files, and public assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return response;
  }

  const routeProtection = getRouteProtection(pathname);

  // If no route protection config found, allow access (fail open for undefined routes)
  if (!routeProtection) {
    return response;
  }

  // Check if route requires authentication
  if (routeProtection.requireAuth) {
    const session = await readSession(request);

    // Redirect to login if not authenticated
    if (!session) {
      return NextResponse.redirect(new URL("/api/auth/login", request.url));
    }

    // Check if route requires specific roles (only if RBAC is enabled)
    if (routeProtection.roles.length > 0) {
      const userRoles = session.roles || [];
      const hasAccess = hasRequiredRole(userRoles, routeProtection.roles);

      // Redirect to unauthorized page if user doesn't have required role
      if (!hasAccess) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
