import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project } from "@/models/Project";
import { Quotation } from "@/models/Quotation";
import { QuotationResponse } from "@/models/QuotationResponse";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { notifyAdmins } from "@/lib/notification";
import { isObjectId } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    let project = null;
    if (isObjectId(id)) {
      project = await Project.findById(id);
    } else {
      project = await Project.findOne({ projectId: id });
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Get the student ambassador who created the project
    const ambassador = await User.findById(project.studentId);
    const ambassadorName = ambassador?.name || session?.name || "Student Ambassador";
    const ambassadorId = ambassador?._id || project.studentId;

    // Check authorization:
    // 1. The student ambassador who created the project (session.userId === project.studentId)
    // 2. Any active student ambassador session
    // 3. Admin user or dev/testing mode
    const isOwner = session && session.userId === project.studentId.toString();
    const isStudent = session && session.role === "STUDENT";
    const isAdmin = session && session.role === "ADMIN";
    const isDevelopmentMode = process.env.DISABLE_AUTH === "true";

    if (!isOwner && !isStudent && !isAdmin && !isDevelopmentMode) {
      return NextResponse.json(
        { error: "Forbidden: Only the student ambassador who created this project can approve the budget." },
        { status: 403 }
      );
    }

    if (project.status === "APPROVED") {
      return NextResponse.json(
        { error: "This project budget has already been approved." },
        { status: 400 }
      );
    }

    // Advance project status to APPROVED
    project.status = "APPROVED";
    await project.save();

    // Also accept any pending/actionable quotation for this project
    const actionableQuotation = await Quotation.findOne({
      projectId: project._id,
      status: { $in: ["SENT", "VIEWED"] },
    }).sort({ createdAt: -1 });

    if (actionableQuotation) {
      actionableQuotation.status = "ACCEPTED";
      actionableQuotation.acceptedAt = new Date();
      await actionableQuotation.save();

      await QuotationResponse.create({
        quotationId: actionableQuotation._id,
        version: actionableQuotation.version,
        action: "ACCEPTED",
        performedBy: ambassadorId,
      });
    }

    const agreedBudget = project.approvedBudget || actionableQuotation?.total || project.expectedBudget || 0;

    // Log Activity attributed to the student ambassador who created the project
    await logActivity({
      userId: ambassadorId,
      role: "STUDENT",
      action: "BUDGET_APPROVED",
      projectId: project._id,
      entityId: project.projectId,
      entityType: "PROJECT",
      description: `${ambassadorName} (Student Ambassador) approved the project budget of ₹${agreedBudget.toLocaleString()}. Project status set to APPROVED.`,
      metadata: { agreedBudget, quotationId: actionableQuotation?.quotationId, approvedBy: ambassadorName },
    });

    // Notify all Admins in real-time
    await notifyAdmins({
      title: `Budget Approved: ${project.projectName}`,
      message: `Student Ambassador ${ambassadorName} accepted the proposed budget of ₹${agreedBudget.toLocaleString()} for "${project.projectName}". The project is now APPROVED and ready for development kickoff!`,
      type: "SUCCESS",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    // Invalidate caches for instant real-time sync
    const { invalidateStudentDashboardCache } = await import("@/lib/server-student-dashboard");
    const { invalidateAdminAnalyticsCache } = await import("@/lib/server-admin-analytics");
    invalidateStudentDashboardCache();
    invalidateAdminAnalyticsCache();

    return NextResponse.json({
      success: true,
      message: `Budget of ₹${agreedBudget.toLocaleString()} approved by Student Ambassador ${ambassadorName}! Project is officially APPROVED.`,
      project,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
