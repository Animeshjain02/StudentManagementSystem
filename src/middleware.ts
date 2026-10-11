import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "campus_ambassador_secret_jwt_super_key_2026_production_grade"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("auth_token")?.value;
  let userPayload: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userPayload = payload;
    } catch {
      userPayload = null;
    }
  }

  // 1. Handling /student routes
  if (pathname.startsWith("/student")) {
    // If accessing login page:
    if (pathname === "/student/login") {
      const res = NextResponse.next();
      if (token) {
        res.cookies.delete("auth_token");
      }
      return res;
    }

    // For all other /student/* pages (dashboard, projects, quotations, payments, etc.):
    // Require valid student session
    if (!userPayload || userPayload.role !== "STUDENT") {
      const loginUrl = new URL("/student/login", req.url);
      const res = NextResponse.redirect(loginUrl);
      if (token) {
        res.cookies.delete("auth_token");
      }
      return res;
    }

    return NextResponse.next();
  }

  // 2. Handling /admin routes
  if (pathname.startsWith("/admin")) {
    // If accessing login page:
    if (pathname === "/admin/login") {
      const res = NextResponse.next();
      if (token) {
        res.cookies.delete("auth_token");
      }
      return res;
    }

    // For all other /admin/* pages:
    // Require valid admin session
    if (!userPayload || userPayload.role !== "ADMIN") {
      const loginUrl = new URL("/admin/login", req.url);
      const res = NextResponse.redirect(loginUrl);
      if (token) {
        res.cookies.delete("auth_token");
      }
      return res;
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student/:path*",
    "/admin/:path*",
  ],
};
