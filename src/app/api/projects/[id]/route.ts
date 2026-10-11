import { handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project, ProjectStatus } from "@/models/Project";
import { Milestone } from "@/models/Milestone";
import { Quotation } from "@/models/Quotation";
import { Payment } from "@/models/Payment";
import { ProjectDocument } from "@/models/Document";
import { ActivityLog } from "@/models/ActivityLog";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { PROJECT_STATUSES } from "@/lib/constants";
import { isObjectId, num, parseDate, str } from "@/lib/validation";

export async function GET(
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

    // Find by ObjectId or projectId string
    let project = null;
    if (isObjectId(id)) {
      project = await Project.findById(id).populate("studentId", "name email");
    } else {
      project = await Project.findOne({ projectId: id }).populate("studentId", "name email");
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // STRICT SECURITY: Ownership check for students
    const studentOwnerId =
      (project.studentId as any)?._id
        ? (project.studentId as any)._id.toString()
        : (project.studentId as any)?.toString();

    if (session.role === "STUDENT" && studentOwnerId !== session.userId) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this project." },
        { status: 403 }
      );
    }

    // Fetch related entities
    const [milestones, quotations, payments, documents, activityLogs] = await Promise.all([
      Milestone.find({ projectId: project._id }).sort({ startDate: 1 }),
      // Drafts (and cancelled drafts) were never sent, so students must not see them
      Quotation.find({
        projectId: project._id,
        ...(session.role === "STUDENT" ? { sentAt: { $exists: true } } : {}),
      }).sort({ createdAt: -1, version: -1 }),
      Payment.find({ projectId: project._id }).sort({ paymentDate: -1 }),
      ProjectDocument.find({ projectId: project._id }).sort({ createdAt: -1 }),
      ActivityLog.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(30),
    ]);

    // Calculate payment totals
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const effectiveBudget = project.approvedBudget || project.expectedBudget || 0;
    const pendingPayment = Math.max(0, effectiveBudget - totalPaid);

    let paymentStatus: "NOT_PAID" | "PARTIAL" | "PAID" | "OVERDUE" = "NOT_PAID";
    if (totalPaid >= effectiveBudget && effectiveBudget > 0) {
      paymentStatus = "PAID";
    } else if (totalPaid > 0) {
      paymentStatus = "PARTIAL";
    }

    return NextResponse.json({
      project,
      milestones,
      quotations,
      payments,
      documents,
      activityLogs,
      financials: {
        totalBudget: effectiveBudget,
        totalPaid,
        pendingPayment,
        paymentStatus,
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
    const session = await getSession("ADMIN");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can update project status, team, or approved budget (Rules 5 & 6)
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin is authorized to modify project status or budget." },
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
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const oldStatus = project.status;

    if (body.status !== undefined && !(PROJECT_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid project status." }, { status: 400 });
    }
    let approvedBudget: number | undefined;
    if (body.approvedBudget !== undefined && body.approvedBudget !== null && body.approvedBudget !== "") {
      approvedBudget = num(body.approvedBudget);
      if (!Number.isFinite(approvedBudget) || approvedBudget < 0) {
        return NextResponse.json({ error: "Approved budget must be a non-negative number." }, { status: 400 });
      }
    }
    const dates: Record<string, Date> = {};
    for (const field of ["startDate", "expectedDeliveryDate", "actualDeliveryDate"] as const) {
      if (body[field]) {
        const d = parseDate(body[field]);
        if (!d) return NextResponse.json({ error: `Invalid date for ${field}.` }, { status: 400 });
        dates[field] = d;
      }
    }
    if (body.assignedTeam !== undefined && (!Array.isArray(body.assignedTeam) || body.assignedTeam.some((m: unknown) => typeof m !== "string"))) {
      return NextResponse.json({ error: "Assigned team must be a list of names." }, { status: 400 });
    }

    if (body.status && body.status !== oldStatus) {
      project.status = body.status as ProjectStatus;
    }
    if (approvedBudget !== undefined) {
      project.approvedBudget = approvedBudget;
    }
    if (dates.startDate) project.startDate = dates.startDate;
    if (dates.expectedDeliveryDate) project.expectedDeliveryDate = dates.expectedDeliveryDate;
    if (dates.actualDeliveryDate) project.actualDeliveryDate = dates.actualDeliveryDate;
    if (body.assignedTeam) {
      project.assignedTeam = body.assignedTeam.map((m: string) => m.trim()).filter(Boolean);
    }
    if (body.notes !== undefined) {
      project.notes = str(body.notes);
    }

    await project.save();

    // Log Activity
    const statusChanged = body.status && body.status !== oldStatus;
    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: statusChanged ? "PROJECT_STATUS_UPDATED" : "PROJECT_UPDATED",
      projectId: project._id,
      entityId: project.projectId,
      entityType: "PROJECT",
      description: statusChanged
        ? `Status updated from ${oldStatus} to ${project.status} by Admin.`
        : `Admin updated details for project ${project.projectId}.`,
      metadata: { oldStatus, newStatus: project.status, approvedBudget: project.approvedBudget },
    });

    // Notify student if status changed
    if (statusChanged) {
      await createNotification({
        userId: project.studentId,
        title: `Project Status: ${project.status}`,
        message: `Your project ${project.projectName} (${project.projectId}) is now marked as ${project.status}.`,
        type: "PROJECT",
        relatedEntityId: project.projectId,
        relatedEntityType: "PROJECT",
      });
    }

    // Invalidate caches for instant real-time sync
    const { invalidateStudentDashboardCache } = await import("@/lib/server-student-dashboard");
    const { invalidateAdminAnalyticsCache } = await import("@/lib/server-admin-analytics");
    invalidateStudentDashboardCache();
    invalidateAdminAnalyticsCache();

    return NextResponse.json({
      success: true,
      message: "Project updated successfully.",
      project,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
