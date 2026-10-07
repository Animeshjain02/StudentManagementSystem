import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { Project } from "@/models/Project";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const query: any = { role: "STUDENT" };
    if (status) query.status = status;

    let students = await User.find(query).select("-passwordHash").sort({ createdAt: -1 });

    // Join with StudentProfile and Project count
    const studentData = await Promise.all(
      students.map(async (u) => {
        const profile = await StudentProfile.findOne({ userId: u._id });
        const projectCount = await Project.countDocuments({ studentId: u._id });
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
          projectCount,
        };
      })
    );

    // Apply text filters
    let filtered = studentData;
    if (search) {
      const q = search.toLowerCase();
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
    const paginated = filtered.slice((page - 1) * limit, page * limit);

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      collegeName,
      university,
      course,
      branch,
      semester,
      collegeId,
      referralCode,
      temporaryPassword,
    } = body;

    if (!name || !email || !phone || !collegeName || !course || !branch || !semester) {
      return NextResponse.json(
        { error: "Please provide all required student and college details." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 409 }
      );
    }

    // Generate unique Ambassador ID: CA-2026-XXXX
    const count = await StudentProfile.countDocuments();
    const year = new Date().getFullYear();
    const ambassadorId = `CA-${year}-${String(count + 1).padStart(4, "0")}`;

    // Temporary password (default or custom)
    const tempPass = temporaryPassword || `Student@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await hashPassword(tempPass);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      mustChangePassword: true, // Forces first login password change
    });

    const profile = await StudentProfile.create({
      userId: newUser._id,
      ambassadorId,
      phone: phone.trim(),
      collegeName: collegeName.trim(),
      university: university?.trim() || "",
      course: course.trim(),
      branch: branch.trim(),
      semester: semester.trim(),
      collegeId: collegeId?.trim() || "",
      referralCode: referralCode?.trim() || `REF-${ambassadorId}`,
      status: "ACTIVE",
    });

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
      message: `Your Ambassador ID is ${ambassadorId}. Please change your password on first login.`,
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
      message: "Student account created successfully!",
      student: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        ambassadorId,
        temporaryPassword: tempPass,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
