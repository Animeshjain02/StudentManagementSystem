import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { isObjectId, num, parseDate, str } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession("ADMIN");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can propose project budgets." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
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

    const budget = num(body.budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      return NextResponse.json(
        { error: "Proposed budget must be a positive number." },
        { status: 400 }
      );
    }

    const oldBudget = project.approvedBudget;
    project.approvedBudget = budget;
    project.status = "QUOTATION_SENT";

    if (body.deliveryDate) {
      const d = parseDate(body.deliveryDate);
      if (d) project.expectedDeliveryDate = d;
    }

    if (body.notes !== undefined) {
      project.notes = str(body.notes);
    }

    await project.save();

    // Log Activity
    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "QUOTATION_SENT",
      projectId: project._id,
      entityId: project.projectId,
      entityType: "PROJECT",
      description: `Admin sent proposed budget of ₹${budget.toLocaleString()} to student. Status updated to Quotation.`,
      metadata: { budget, oldBudget, deliveryDate: project.expectedDeliveryDate },
    });

    // Notify Student in real-time
    await createNotification({
      userId: project.studentId,
      title: `Budget Proposed: ₹${budget.toLocaleString()}`,
      message: `Admin proposed a budget of ₹${budget.toLocaleString()} for "${project.projectName}". Please review and approve or decline.`,
      type: "PROJECT",
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
      message: `Proposed budget of ₹${budget.toLocaleString()} sent successfully to student.`,
      project,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
