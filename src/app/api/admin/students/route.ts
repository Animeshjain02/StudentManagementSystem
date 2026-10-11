import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { Project } from "@/models/Project";
import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";
import { validateStudentFields } from "@/lib/field-rules";
import { isDuplicateKeyError, isEmail, nextSequentialId, parsePagination, str } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const college = searchParams.get("college") || "";
    const status = searchParams.get("status") || "";
    const { page, limit, skip } = parsePagination(searchParams);

    const query: any = { role: "STUDENT" };
    if (status) query.status = status;

    // Three queries in total (users, profiles, project counts) instead of two per student.
    const users = await User.find(query).select("-passwordHash").sort({ createdAt: -1 });
    const userIds = users.map((u) => u._id);
    const [profiles, projectCounts] = await Promise.all([
      StudentProfile.find({ userId: { $in: userIds } }),
      Project.aggregate([
        { $match: { studentId: { $in: userIds } } },
        { $group: { _id: "$studentId", count: { $sum: 1 } } },
      ]),
    ]);
    const profileByUser = new Map(profiles.map((p) => [p.userId.toString(), p]));
    const countByUser = new Map<string, number>(projectCounts.map((c: any) => [c._id.toString(), c.count]));

    const studentData = users.map((u) => {
      const profile = profileByUser.get(u._id.toString());
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        status: u.status,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        ambassadorId: profile?.ambassadorId || "N/A",
        collegeName: profile?.collegeName || "N/A",
        phone: profile?.phone || "N/A",
        course: profile?.course || "N/A",
        branch: profile?.branch || "N/A",
        semester: profile?.semester || "N/A",
        joiningDate: profile?.joiningDate,
        referralCode: profile?.referralCode,
        projectCount: countByUser.get(u._id.toString()) || 0,
      };
    });

    // Apply text filters
    let filtered = studentData;
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.ambassadorId.toLowerCase().includes(q) ||
          s.collegeName.toLowerCase().includes(q)
      );
    }
    if (college) {
      filtered = filtered.filter((s) => s.collegeName === college);
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return NextResponse.json({
      students: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { university, referralCode } = body;
    const name = str(body.name);
    const email = str(body.email).toLowerCase();
    
    // Normalize phone number (handle +91, 0, spaces, dashes)
    const rawPhone = str(body.phone);
    const cleanDigits = rawPhone.replace(/\D/g, "");
    const phone = cleanDigits.length === 12 && cleanDigits.startsWith("91")
      ? cleanDigits.slice(2)
      : cleanDigits.length === 11 && cleanDigits.startsWith("0")
      ? cleanDigits.slice(1)
      : cleanDigits;

    const collegeName = str(body.collegeName);
    const course = str(body.course) || "B.Tech";
    const branch = str(body.branch);
    const semester = str(body.semester) || "1st Year";
    const collegeId = str(body.collegeId || body.number || body.rollNo);

    if (!name || !email || !phone || !collegeName || !branch) {
      return NextResponse.json(
        { error: "Please provide all required details: Name, Email, Phone, College, and Branch." },
        { status: 400 }
      );
    }
    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Phone number must be a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)." },
        { status: 400 }
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }
    const fieldErrors = validateStudentFields(
      { name, phone, collegeName, university: str(university), course, branch, semester, collegeId: str(collegeId), referralCode: str(referralCode) },
      true
    );
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json({ error: Object.values(fieldErrors)[0], fieldErrors }, { status: 400 });
    }

    // Password from payload (supports both 'password' and 'temporaryPassword')
    const passInput = str(body.password || body.temporaryPassword);
    const tempPass: string = passInput || `Student@${randomInt(100000, 1000000)}`;

    if (tempPass.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    await connectToDatabase();

    // Check duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(tempPass);

    let newUser: any;
    try {
      newUser = await User.create({
        name,
        email,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        mustChangePassword: Boolean(body.mustChangePassword ?? false),
      });
    } catch (err: any) {
      if (isDuplicateKeyError(err)) {
        return NextResponse.json({ error: "A user with this email address already exists." }, { status: 409 });
      }
      throw err;
    }

    // Generate unique Ambassador ID: CA-YYYY-XXXX (retry if a concurrent request took the number)
    const year = new Date().getFullYear();
    let profile: any = null;
    let ambassadorId = str(body.ambassadorId);

    try {
      if (ambassadorId) {
        // If a custom ambassador ID was specified by admin
        profile = await StudentProfile.create({
          userId: newUser._id,
          ambassadorId,
          phone,
          collegeName,
          university: str(university),
          course,
          branch,
          semester,
          collegeId: str(collegeId),
          referralCode: str(referralCode) || `REF-${ambassadorId}`,
          status: "ACTIVE",
        });
      } else {
        for (let attempt = 0; attempt < 5 && !profile; attempt++) {
          ambassadorId = await nextSequentialId(StudentProfile, "ambassadorId", `CA-${year}-`, 4, attempt);
          try {
            profile = await StudentProfile.create({
              userId: newUser._id,
              ambassadorId,
              phone,
              collegeName,
              university: str(university),
              course,
              branch,
              semester,
              collegeId: str(collegeId),
              referralCode: str(referralCode) || `REF-${ambassadorId}`,
              status: "ACTIVE",
            });
          } catch (err: any) {
            if (!isDuplicateKeyError(err) || attempt === 4) throw err;
          }
        }
      }
    } catch (err) {
      // Never leave a login without a profile behind
      await User.findByIdAndDelete(newUser._id);
      throw err;
    }

    // Invalidate analytics cache so new ambassador appears on analytics / ambassadors list immediately
    try {
      const { invalidateAdminAnalyticsCache } = await import("@/lib/server-admin-analytics");
      invalidateAdminAnalyticsCache();
    } catch (e) {
      console.error("Cache invalidation failed:", e);
    }

    // Activity Log
    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "STUDENT_CREATED",
      description: `Admin created student account for ${newUser.name} (${ambassadorId}).`,
      metadata: { ambassadorId, collegeName },
    });

    // In-app Notification for student
    await createNotification({
      userId: newUser._id,
      title: "Welcome to Campus Ambassador Program!",
      message: `Your Ambassador ID is ${ambassadorId}. You can now access your ambassador portal.`,
      type: "SUCCESS",
      relatedEntityId: ambassadorId,
      relatedEntityType: "STUDENT",
    });

    // Send Welcome Email
    const emailTmpl = EmailTemplates.accountCreated(newUser.name, newUser.email, tempPass, ambassadorId);
    await sendEmail({
      to: newUser.email,
      subject: emailTmpl.subject,
      html: emailTmpl.html,
    });

    return NextResponse.json({
      success: true,
      message: "Ambassador account created successfully!",
      student: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        ambassadorId,
        temporaryPassword: tempPass,
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
