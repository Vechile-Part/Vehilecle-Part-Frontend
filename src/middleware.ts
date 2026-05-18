import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getShellRoleFromToken } from "@/lib/jwtRole";

type ShellRole = "admin" | "staff" | "customer";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/set-password"];
const ADMIN_PREFIXES = ["/admin", "/reporting", "/customers"];
const STAFF_PREFIXES = ["/staff", "/pos"];
const CUSTOMER_PREFIXES = ["/customer"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function homeForRole(role: ShellRole): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "staff":
      return "/staff/customers";
    case "customer":
      return "/customer/profile";
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  if (
    pathname === "/logout" ||
    pathname === "/help" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/api-status"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("authToken")?.value;
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = getShellRoleFromToken(token);
  if (!role) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminRoute = matchesPrefix(pathname, ADMIN_PREFIXES);
  const isStaffRoute = matchesPrefix(pathname, STAFF_PREFIXES);
  const isCustomerRoute = matchesPrefix(pathname, CUSTOMER_PREFIXES);
  const isSettingsRoute = pathname === "/settings" || pathname.startsWith("/settings/");

  if (isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (isCustomerRoute && role !== "customer") {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (isStaffRoute && role !== "staff" && role !== "admin") {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (isSettingsRoute && role === "customer") {
    return NextResponse.redirect(new URL("/customer/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|api/).*)"],
};
