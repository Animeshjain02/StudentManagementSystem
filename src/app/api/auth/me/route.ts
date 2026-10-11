import { handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";

export async function GET(req: NextRequest) {
  try {
    const portalParam = req.nextUrl.searchParams.get("portal");
    const preferredRole =
      portalParam === "admin"
        ? "ADMIN"
        : portalParam === "student"
        ? "STUDENT"
        : undefined;

    const session = await getSession(preferredRole);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.userId).select("-passwordHash");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Your account has been deactivated. Please contact admin." }, { status: 403 });
    }

    let profile = null;
    if (user.role === "STUDENT") {
      profile = await StudentProfile.findOne({ userId: user._id });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: false,
        status: user.status,
        lastLogin: user.lastLogin,
        profile,
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
