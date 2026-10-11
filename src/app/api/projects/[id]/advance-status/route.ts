import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { PROJECT_STATUSES, ProjectStatus } from "@/lib/constants";
import { isObjectId, str } from "@/lib/validation";

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
        { error: "Forbidden: Only Admin can advance project stages." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const targetStatus = body.targetStatus as ProjectStatus;

    if (!targetStatus || !PROJECT_STATUSES.includes(targetStatus)) {
      return NextResponse.json(
        { error: `Invalid project status: ${targetStatus}` },
        { status: 400 }
      );
    }

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

    const oldStatus = project.status;
    project.status = targetStatus;

    if (body.notes) {
      project.notes = str(body.notes);
    }

    let notifTitle = `Project Status: ${targetStatus.replace(/_/g, " ")}`;
    let notifMsg = `Your project "${project.projectName}" status is now ${targetStatus.replace(/_/g, " ")}.`;

    // Stage-specific actions & notifications
    if (targetStatus === "IN_PROGRESS" || targetStatus === "WORKING") {
      if (!project.startDate) project.startDate = new Date();
      notifTitle = `Development Started: ${project.projectName}`;
      notifMsg = `Great news! Admin has initiated active development on your project "${project.projectName}". Current status: IN PROGRESS.`;
    } else if (targetStatus === "COMPLETED") {
      notifTitle = `Development Completed: ${project.projectName}`;
      notifMsg = `Development for "${project.projectName}" is officially COMPLETED. Testing and final verification passed.`;
    } else if (targetStatus === "PAYMENT_PENDING") {
      notifTitle = `Payment Stage: ${project.projectName}`;
      notifMsg = `Your project "${project.projectName}" is completed! Please proceed to the payment stage to finalize delivery.`;
    } else if (targetStatus === "DELIVERED") {
      if (!project.actualDeliveryDate) project.actualDeliveryDate = new Date();
      notifTitle = `Project Delivered: ${project.projectName}`;
      notifMsg = `Congratulations! "${project.projectName}" has been officially DELIVERED!`;
    }

    await project.save();

    // Log Activity
    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "PROJECT_STATUS_UPDATED",
      projectId: project._id,
      entityId: project.projectId,
      entityType: "PROJECT",
      description: `Admin advanced project stage from ${oldStatus} to ${targetStatus}.`,
      metadata: { oldStatus, newStatus: targetStatus },
    });

    // Send real-time notification to Student
    await createNotification({
      userId: project.studentId,
      title: notifTitle,
      message: notifMsg,
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
      message: `Project stage successfully advanced to ${targetStatus.replace(/_/g, " ")}.`,
      project,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
