import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { verifyPassword, signToken } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const { email, password, portal } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
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

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

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

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
