/**
 * Middleware Auth + RBAC — CRM Graha Padma
 *
 * Berjalan di Edge Runtime — HANYA boleh mengimport dari auth.config.ts,
 * bukan dari config.ts (yang mengimport @node-rs/argon2 = Node.js only).
 *
 * Tanggung jawab:
 *   1. Redirect unauthenticated user ke /login
 *   2. Redirect authenticated user dari /login ke halaman default role-nya
 *   3. Blokir akses route yang tidak sesuai role (redirect ke /unauthorized)
 */

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";
import { canAccessRoute, ROUTE_PERMISSIONS } from "@/lib/auth/permissions";
import { ROLE_DEFAULT_REDIRECT } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const pathname = nextUrl.pathname;

  // -------------------------------------------------------------------------
  // 1. Bypass static assets
  // -------------------------------------------------------------------------
  const isStatic =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isStatic) return;

  // Route publik yang tidak perlu auth
  const PUBLIC_ROUTES = ["/login", "/api/auth", "/unauthorized"];
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // -------------------------------------------------------------------------
  // 2. Redirect ke /login jika belum login
  // -------------------------------------------------------------------------
  if (!session?.user) {
    if (isPublic) return;
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  const user = {
    id: session.user.id as string,
    role: session.user.role as UserRole,
  };

  // -------------------------------------------------------------------------
  // 3. User sudah login tapi akses /login → redirect ke halaman default
  // -------------------------------------------------------------------------
  if (pathname === "/login") {
    const defaultRedirect = ROLE_DEFAULT_REDIRECT[user.role] ?? "/dashboard";
    return Response.redirect(new URL(defaultRedirect, nextUrl.origin));
  }

  // -------------------------------------------------------------------------
  // 4. Root path → redirect ke halaman default role
  // -------------------------------------------------------------------------
  if (pathname === "/") {
    const defaultRedirect = ROLE_DEFAULT_REDIRECT[user.role] ?? "/dashboard";
    return Response.redirect(new URL(defaultRedirect, nextUrl.origin));
  }

  // -------------------------------------------------------------------------
  // 5. Cek permission route
  // -------------------------------------------------------------------------
  const isProtectedRoute = Object.keys(ROUTE_PERMISSIONS).some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !canAccessRoute(user, pathname)) {
    return Response.redirect(new URL("/unauthorized", nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
