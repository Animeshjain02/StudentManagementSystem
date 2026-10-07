import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";

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
    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const tempPassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
    const newHash = await hashPassword(tempPassword);

    user.passwordHash = newHash;
    user.mustChangePassword = true;
    await user.save();

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "STUDENT_PASSWORD_RESET",
      description: `Admin reset password for student ${user.name}.`,
    });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully. Temporary password is: ${tempPassword}`,
      temporaryPassword: tempPassword,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
