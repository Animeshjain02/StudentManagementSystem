import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession, signToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { logActivity } from "@/lib/activity";
import { str } from "@/lib/validation";
import { validateStudentFields } from "@/lib/field-rules";

/** Fields an ambassador may edit about themselves. Identity fields (email, role, ambassador id, status) are admin-only. */
const EDITABLE_PROFILE_FIELDS = ["phone", "collegeName", "university", "course", "branch", "semester"] as const;

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const fieldErrors = validateStudentFields(
      {
        name: body.name,
        phone: body.phone,
        collegeName: body.collegeName,
        university: body.university,
        course: body.course,
        branch: body.branch,
        semester: body.semester,
      },
      false
    );
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json({ error: Object.values(fieldErrors)[0], fieldErrors }, { status: 400 });
    }

    if (body.name !== undefined) {
      user.name = str(body.name);
      await user.save();
    }

    let profile = null;
    if (user.role === "STUDENT") {
      profile = await StudentProfile.findOne({ userId: user._id });
      if (profile) {
        for (const field of EDITABLE_PROFILE_FIELDS) {
          if (body[field] !== undefined) profile[field] = str(body[field]);
        }
        await profile.save();
      }
    }

    await logActivity({
      userId: user._id,
      role: user.role,
      action: "PROFILE_UPDATED",
      description: `${user.name} updated their profile details.`,
    });

    const res = NextResponse.json({ success: true, message: "Profile updated successfully.", profile });

    // Keep the name embedded in the session token in sync
    res.cookies.set(
      SESSION_COOKIE,
      await signToken({
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: session.mustChangePassword,
        ambassadorId: profile?.ambassadorId,
      }),
      sessionCookieOptions()
    );

    return res;
  } catch (err: any) {
    return handleApiError(err);
  }
}
