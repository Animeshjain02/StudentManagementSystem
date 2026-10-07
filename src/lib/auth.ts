import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "campus_ambassador_secret_jwt_super_key_2026_production_grade"
);

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "STUDENT";
  mustChangePassword: boolean;
  ambassadorId?: string;
  exp?: number;
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character." };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: Omit<TokenPayload, "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function getSession(preferredRole?: "ADMIN" | "STUDENT"): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      const verified = await verifyToken(token);
      if (verified) return verified;
    }

    // Direct access mode when DISABLE_AUTH=true
    if (process.env.DISABLE_AUTH === "true") {
      let roleToUse: "ADMIN" | "STUDENT" | null = preferredRole || null;

      if (!roleToUse) {
        const portalCookie = cookieStore.get("active_portal")?.value;
        if (portalCookie === "admin") {
          roleToUse = "ADMIN";
        } else if (portalCookie === "student") {
          roleToUse = "STUDENT";
        }
      }

      if (!roleToUse) {
        try {
          const headerList = await headers();
          const referer = headerList.get("referer") || "";
          const xPortal = headerList.get("x-portal") || "";
          if (xPortal === "admin" || referer.includes("/admin")) {
            roleToUse = "ADMIN";
          } else if (xPortal === "student" || referer.includes("/student")) {
            roleToUse = "STUDENT";
          }
        } catch {
          // Headers not available in this context
        }
      }

      // Default to STUDENT if still unspecified
      if (!roleToUse) {
        roleToUse = "STUDENT";
      }

      const { connectToDatabase } = await import("@/lib/db");
      await connectToDatabase();
      const { User } = await import("@/models/User");
      const { StudentProfile } = await import("@/models/StudentProfile");

      if (roleToUse === "ADMIN") {
        const adminUser = await User.findOne({ role: "ADMIN" });
        if (adminUser) {
          return {
            userId: adminUser._id.toString(),
            email: adminUser.email,
            name: adminUser.name,
            role: "ADMIN",
            mustChangePassword: false,
          };
        }
      }

      const studentUser =
        (await User.findOne({ email: "student@example.com" })) ||
        (await User.findOne({ role: "STUDENT" }));

      if (studentUser) {
        const profile = await StudentProfile.findOne({ userId: studentUser._id });
        return {
          userId: studentUser._id.toString(),
          email: studentUser.email,
          name: studentUser.name,
          role: "STUDENT",
          mustChangePassword: false,
          ambassadorId: profile?.ambassadorId || "CA-2026-0001",
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function requireAuth(allowedRole?: "ADMIN" | "STUDENT"): Promise<TokenPayload> {
  const session = await getSession(allowedRole);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (allowedRole && session.role !== allowedRole) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
