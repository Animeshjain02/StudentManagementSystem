import { handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { Project } from "@/models/Project";
import { Quotation } from "@/models/Quotation";
import { Payment } from "@/models/Payment";
import { ActivityLog } from "@/models/ActivityLog";
import { logActivity } from "@/lib/activity";
import { isObjectId, str } from "@/lib/validation";
import { validateStudentFields } from "@/lib/field-rules";

export async function GET(
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

    const user = await User.findOne({ _id: id, role: "STUDENT" }).select("-passwordHash");
    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const profile = await StudentProfile.findOne({ userId: user._id });
    const projects = await Project.find({ studentId: user._id }).sort({ createdAt: -1 });

    const projectIds = projects.map((p) => p._id);
    const quotations = await Quotation.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 });
    const payments = await Payment.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 });
    const logs = await ActivityLog.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20);

    // Performance metrics
    const totalProjects = projects.length;
    const approvedProjects = projects.filter((p) =>
      ["APPROVED", "WORKING", "TESTING", "CLIENT_REVIEW", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(p.status)
    ).length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
    const totalProjectValue = projects.reduce((acc, p) => acc + (p.approvedBudget || p.expectedBudget || 0), 0);
    const totalPaymentsReceived = payments.reduce((acc, p) => acc + p.amount, 0);

    return NextResponse.json({
      student: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        profile,
      },
      projects,
      quotations,
      payments,
      activityLogs: logs,
      performance: {
        totalProjects,
        approvedProjects,
        completedProjects,
        totalProjectValue,
        totalPaymentsReceived,
        conversionRate: totalProjects > 0 ? Math.round((approvedProjects / totalProjects) * 100) : 0,
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function PATCH(
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
    const body = await req.json();
    await connectToDatabase();

    // Only ambassador accounts can be managed here (never the admin account itself)
    const user = await User.findOne({ _id: id, role: "STUDENT" });
    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Validate before saving anything so the user and profile can never end up half-updated
    if (body.status !== undefined && !["ACTIVE", "INACTIVE", "DISABLED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status. Use ACTIVE, INACTIVE or DISABLED." }, { status: 400 });
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

    if (body.name) user.name = str(body.name);
    if (body.status) user.status = body.status;
    await user.save();

    const profile = await StudentProfile.findOne({ userId: user._id });
    if (profile) {
      if (str(body.phone)) profile.phone = str(body.phone);
      if (str(body.collegeName)) profile.collegeName = str(body.collegeName);
      if (str(body.university)) profile.university = str(body.university);
      if (str(body.course)) profile.course = str(body.course);
      if (str(body.branch)) profile.branch = str(body.branch);
      if (str(body.semester)) profile.semester = str(body.semester);
      if (body.status) profile.status = body.status;
      await profile.save();
    }

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "STUDENT_UPDATED",
      description: `Admin updated details for student ${user.name}.`,
    });

    try {
      const { invalidateAdminAnalyticsCache } = await import("@/lib/server-admin-analytics");
      invalidateAdminAnalyticsCache();
    } catch (e) {
      console.error(e);
    }

    return NextResponse.json({ success: true, message: "Student updated successfully.", status: user.status });
  } catch (err: any) {
    return handleApiError(err);
  }
}
