import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { hashPassword, validatePasswordStrength, verifyResetToken } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { clearHits } from "@/lib/rate-limit";

const INVALID_LINK = "This password reset link is invalid or has expired. Please request a new one.";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword, confirmPassword } = await req.json().catch(() => ({} as any));

    if (typeof token !== "string" || !token) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    await connectToDatabase();

    const claims = await verifyResetToken(token);
    if (!claims) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }

    const user = await User.findById(claims.userId);
    // The token embeds a fingerprint of the old password hash: once the password changes the link is dead (single use).
    if (!user || user.status !== "ACTIVE" || !claims.matches(user.passwordHash)) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();
    clearHits(`login:${user.email}`);

    await logActivity({
      userId: user._id,
      role: user.role,
      action: "PASSWORD_RESET",
      description: `${user.name} reset their password using an emailed link.`,
    });

    return NextResponse.json({ success: true, message: "Your password has been reset. You can now sign in." });
  } catch (err: any) {
    return handleApiError(err);
  }
}
