import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Milestone, MILESTONE_STATUSES } from "@/models/Milestone";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { isObjectId, num, parseDate, str } from "@/lib/validation";

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
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }
    const body = await req.json();
    await connectToDatabase();

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }

    // Validate first so a bad field never leaves the milestone half-updated
    if (body.status !== undefined && !(MILESTONE_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid milestone status." }, { status: 400 });
    }
    let progress: number | undefined;
    if (body.progress !== undefined) {
      progress = num(body.progress);
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
        return NextResponse.json({ error: "Progress must be a number between 0 and 100." }, { status: 400 });
      }
    }
    let startDate = milestone.startDate;
    let dueDate = milestone.dueDate;
    if (body.startDate) {
      const d = parseDate(body.startDate);
      if (!d) return NextResponse.json({ error: "Invalid start date." }, { status: 400 });
      startDate = d;
    }
    if (body.dueDate) {
      const d = parseDate(body.dueDate);
      if (!d) return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
      dueDate = d;
    }
    if (dueDate.getTime() < startDate.getTime()) {
      return NextResponse.json({ error: "The due date cannot be earlier than the start date." }, { status: 400 });
    }
    if (body.name !== undefined && !str(body.name)) {
      return NextResponse.json({ error: "Milestone name cannot be empty." }, { status: 400 });
    }

    const oldStatus = milestone.status;

    if (body.name) milestone.name = str(body.name);
    if (body.description !== undefined) milestone.description = str(body.description);
    if (body.assignedTo) milestone.assignedTo = str(body.assignedTo);
    milestone.startDate = startDate;
    milestone.dueDate = dueDate;

    if (body.status) {
      milestone.status = body.status;
      if (body.status === "COMPLETED") {
        milestone.progress = 100;
      } else if (progress === undefined && milestone.progress === 100) {
        // Re-opening a finished milestone: it can't still read 100% complete
        milestone.progress = 99;
      }
    }
    if (progress !== undefined) {
      milestone.progress = progress;
      if (progress === 100) milestone.status = "COMPLETED";
    }

    // Keep completedAt consistent with the final status
    if (milestone.status === "COMPLETED") {
      if (!milestone.completedAt) milestone.completedAt = new Date();
    } else {
      milestone.completedAt = undefined;
    }

    await milestone.save();

    const project = await Project.findById(milestone.projectId);

    // Notify the student whenever the milestone transitions into COMPLETED (by status or by 100% progress)
    if (milestone.status === "COMPLETED" && oldStatus !== "COMPLETED" && project) {
      await createNotification({
        userId: project.studentId,
        title: `Milestone Completed: ${milestone.name}`,
        message: `The milestone "${milestone.name}" for project ${project.projectName} has been completed!`,
        type: "SUCCESS",
        relatedEntityId: project.projectId,
        relatedEntityType: "PROJECT",
      });
    }

    if (project) {
      await logActivity({
        userId: session.userId,
        role: "ADMIN",
        action: "MILESTONE_UPDATED",
        projectId: project._id,
        entityId: milestone._id.toString(),
        entityType: "MILESTONE",
        description: `Admin updated milestone "${milestone.name}" (${milestone.status} - ${milestone.progress}%).`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Milestone updated successfully.",
      milestone,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }
    await connectToDatabase();
    const milestone = await Milestone.findByIdAndDelete(id);
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "MILESTONE_DELETED",
      projectId: milestone.projectId,
      entityId: milestone._id.toString(),
      entityType: "MILESTONE",
      description: `Admin removed milestone "${milestone.name}".`,
    });

    return NextResponse.json({ success: true, message: "Milestone removed successfully." });
  } catch (err: any) {
    return handleApiError(err);
  }
}
