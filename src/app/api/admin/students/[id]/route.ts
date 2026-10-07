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
    await connectToDatabase();

    const user = await User.findById(id).select("-passwordHash");
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
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const body = await req.json();
    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (body.name) user.name = body.name.trim();
    if (body.status) user.status = body.status;
    await user.save();

    const profile = await StudentProfile.findOne({ userId: user._id });
    if (profile) {
      if (body.phone) profile.phone = body.phone.trim();
      if (body.collegeName) profile.collegeName = body.collegeName.trim();
      if (body.university) profile.university = body.university.trim();
      if (body.course) profile.course = body.course.trim();
      if (body.branch) profile.branch = body.branch.trim();
      if (body.semester) profile.semester = body.semester.trim();
      if (body.status) profile.status = body.status;
      await profile.save();
    }

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "STUDENT_UPDATED",
      description: `Admin updated details for student ${user.name}.`,
    });

    return NextResponse.json({ success: true, message: "Student updated successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
