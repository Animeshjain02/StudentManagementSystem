import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { verifyPassword, signToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { clearHits, isRateLimited, recordHit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const { email, password, portal } = await req.json();

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Brute-force protection: 8 failed attempts per account within 15 minutes locks sign-in for the window
    const throttleKey = `login:${email.toLowerCase().trim()}`;
    if (isRateLimited(throttleKey, 8, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many failed sign-in attempts. Please wait 15 minutes or reset your password." },
        { status: 429 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      recordHit(throttleKey);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      recordHit(throttleKey);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account has been deactivated or disabled. Please contact admin." },
        { status: 403 }
      );
    }

    // Check portal restriction if user attempts student login with admin or vice versa
    if (portal && user.role !== portal) {
      return NextResponse.json(
        {
          error:
            user.role === "ADMIN"
              ? "This is the Student Portal. Please use the Admin Login."
              : "This is the Admin Portal. Please use the Student Login.",
        },
        { status: 403 }
      );
    }

    clearHits(throttleKey);

    // If student, find profile to get ambassadorId
    let ambassadorId: string | undefined;
    if (user.role === "STUDENT") {
      const profile = await StudentProfile.findOne({ userId: user._id });
      ambassadorId = profile?.ambassadorId;
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      ambassadorId,
    });

    await logActivity({
      userId: user._id,
      role: user.role,
      action: "USER_LOGIN",
      description: `${user.name} logged into ${user.role} portal.`,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        ambassadorId,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
