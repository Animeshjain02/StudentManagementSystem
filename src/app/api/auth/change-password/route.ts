import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import {
  getSession,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  signToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { logActivity } from "@/lib/activity";
import { clearHits, isRateLimited, recordHit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (typeof newPassword !== "string" || typeof confirmPassword !== "string" || !newPassword || !confirmPassword) {
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

    // The forced first-login change is authenticated by the temporary password the user just signed in
    // with. Any later (voluntary) change must prove knowledge of the current password, so a hijacked or
    // unattended session cannot silently take over the account.
    if (!user.mustChangePassword) {
      const throttleKey = `pwchange:${user._id}`;
      if (isRateLimited(throttleKey, 5, 15 * 60 * 1000)) {
        return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
      }
      if (typeof currentPassword !== "string" || !currentPassword) {
        return NextResponse.json({ error: "Please enter your current password." }, { status: 400 });
      }
      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        recordHit(throttleKey);
        return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
      }
      clearHits(throttleKey);
    }

    if (await verifyPassword(newPassword, user.passwordHash)) {
      return NextResponse.json({ error: "New password must be different from the current password." }, { status: 400 });
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

    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

    return res;
  } catch (err: any) {
    return handleApiError(err);
  }
}
