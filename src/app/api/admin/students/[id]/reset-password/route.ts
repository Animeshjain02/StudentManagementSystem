import { handleApiError } from "@/lib/api";
import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { isObjectId } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    await connectToDatabase();

    const user = await User.findOne({ _id: id, role: "STUDENT" });
    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    let customPass = "";
    try {
      const body = await req.json();
      if (body && typeof body.password === "string" && body.password.trim()) {
        customPass = body.password.trim();
      }
    } catch {
      // Body is optional
    }

    const finalPassword = customPass || `Student@${randomInt(100000, 1000000)}`;

    if (finalPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const newHash = await hashPassword(finalPassword);

    user.passwordHash = newHash;
    user.mustChangePassword = false;
    await user.save();

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "STUDENT_PASSWORD_RESET",
      description: `Admin reset password for student ${user.name}.`,
    });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully!`,
      password: finalPassword,
      temporaryPassword: finalPassword,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
