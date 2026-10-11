import bcrypt from "bcryptjs";
import { createHash } from "crypto";
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

/** Cookie options shared by every route that issues the session cookie. */
export const SESSION_COOKIE = "auth_token";
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
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

const RESET_PURPOSE = "password-reset";

/** Short fingerprint of the current password hash; ties a reset link to the password it was issued for. */
function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 24);
}

/** 30-minute, single-use (the fingerprint changes as soon as the password does) password reset token. */
export async function createResetToken(userId: string, passwordHash: string): Promise<string> {
  return new SignJWT({ purpose: RESET_PURPOSE, userId, fp: passwordFingerprint(passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(JWT_SECRET);
}

export async function verifyResetToken(
  token: string
): Promise<{ userId: string; matches: (passwordHash: string) => boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.purpose !== RESET_PURPOSE || typeof payload.userId !== "string" || typeof payload.fp !== "string") {
      return null;
    }
    const fp = payload.fp;
    return { userId: payload.userId, matches: (hash) => passwordFingerprint(hash) === fp };
  } catch {
    return null;
  }
}

const sessionCache = new Map<string, { payload: TokenPayload; expiresAt: number }>();

export async function getSession(preferredRole?: "ADMIN" | "STUDENT"): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return null;
    }

    const now = Date.now();
    const cachedSession = sessionCache.get(token);
    let sessionPayload = cachedSession && cachedSession.expiresAt > now ? cachedSession.payload : null;

    if (!sessionPayload) {
      const verified = await verifyToken(token);
      if (verified) {
        const { connectToDatabase } = await import("@/lib/db");
        await connectToDatabase();
        const { User } = await import("@/models/User");
        const account = await User.findById(verified.userId).select("status role").lean();
        if (account && account.status === "ACTIVE" && account.role === verified.role) {
          sessionCache.set(token, { payload: verified, expiresAt: now + 10000 }); // cache 10s
          sessionPayload = verified;
        }
      }
    }

    if (!sessionPayload) {
      return null;
    }

    if (preferredRole && sessionPayload.role !== preferredRole) {
      return null;
    }

    return sessionPayload;
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
