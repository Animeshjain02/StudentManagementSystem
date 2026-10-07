import { NextRequest, NextResponse } from "next/server";
import { getSession, validatePasswordStrength, hashPassword, signToken } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newPassword, confirmPassword } = await req.json();

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation are required." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.mustChangePassword = false;
    await user.save();

    await logActivity({
      userId: user._id,
      role: user.role,
      action: "PASSWORD_CHANGED",
      description: `${user.name} changed account password.`,
    });

    let ambassadorId: string | undefined;
    if (user.role === "STUDENT") {
      const profile = await StudentProfile.findOne({ userId: user._id });
      ambassadorId = profile?.ambassadorId;
    }

    // Refresh token with mustChangePassword = false
    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: false,
      ambassadorId,
    });

    const res = NextResponse.json({
      success: true,
      message: "Password changed successfully! You can now access your dashboard.",
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
