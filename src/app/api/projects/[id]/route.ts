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
import { createNotification, notifyAdmins } from "@/lib/notification";

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
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
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
      Quotation.find({ projectId: project._id }).sort({ version: -1 }),
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
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
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(id);
    } else {
      project = await Project.findOne({ projectId: id });
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const oldStatus = project.status;

    if (body.status && body.status !== oldStatus) {
      project.status = body.status as ProjectStatus;
    }
    if (body.approvedBudget !== undefined) {
      project.approvedBudget = Number(body.approvedBudget);
    }
    if (body.startDate) {
      project.startDate = new Date(body.startDate);
    }
    if (body.expectedDeliveryDate) {
      project.expectedDeliveryDate = new Date(body.expectedDeliveryDate);
    }
    if (body.actualDeliveryDate) {
      project.actualDeliveryDate = new Date(body.actualDeliveryDate);
    }
    if (body.assignedTeam) {
      project.assignedTeam = body.assignedTeam;
    }
    if (body.notes !== undefined) {
      project.notes = body.notes;
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

    return NextResponse.json({
      success: true,
      message: "Project updated successfully.",
      project,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
