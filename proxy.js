// proxy.js
import { NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth";

// 1. Centralized Route Map (Decouples config from logic)
const ROUTE_ACCESS = {
  "/dashboard/admin": ["Admin"],
  "/dashboard/employees": ["Employee"],
  // Easily scale by adding new routes here:
  // "/dashboard/shared": ["Admin", "Employee"],
};

const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Extract token from request cookies
  const token = request.cookies.get("token")?.value;
  const session = token ? await verifyJWT(token) : null;

  // 2. Auth Page Guards
  if (AUTH_PAGES.some((route) => pathname.startsWith(route))) {
    if (session) {
      const dashboardUrl =
        session.role === "Admin" ? "/dashboard/admin" : "/dashboard/employees";
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
    return NextResponse.next();
  }

  // 3. Protected Route Guards (Dynamic Evaluation)
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Match the current path against our route dictionary
    const matchedRoute = Object.keys(ROUTE_ACCESS).find((route) =>
      pathname.startsWith(route),
    );

    if (matchedRoute) {
      const allowedRoles = ROUTE_ACCESS[matchedRoute];

      if (!allowedRoles.includes(session.role)) {
        // Enforce boundary: send users back to their designated role home
        const fallbackUrl =
          session.role === "Admin"
            ? "/dashboard/admin"
            : "/dashboard/employees";
        return NextResponse.redirect(new URL(fallbackUrl, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // 4. Optimized Matcher (Excludes static assets)
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
