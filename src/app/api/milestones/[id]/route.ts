import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Milestone, MilestoneStatus } from "@/models/Milestone";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";

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

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }

    const oldStatus = milestone.status;

    if (body.name) milestone.name = body.name.trim();
    if (body.description !== undefined) milestone.description = body.description;
    if (body.status) {
      milestone.status = body.status as MilestoneStatus;
      if (body.status === "COMPLETED" && !milestone.completedAt) {
        milestone.completedAt = new Date();
        milestone.progress = 100;
      }
    }
    if (body.progress !== undefined) {
      milestone.progress = Math.min(100, Math.max(0, Number(body.progress)));
      if (milestone.progress === 100 && milestone.status !== "COMPLETED") {
        milestone.status = "COMPLETED";
        milestone.completedAt = new Date();
      }
    }
    if (body.assignedTo) milestone.assignedTo = body.assignedTo;
    if (body.startDate) milestone.startDate = new Date(body.startDate);
    if (body.dueDate) milestone.dueDate = new Date(body.dueDate);

    await milestone.save();

    const project = await Project.findById(milestone.projectId);

    if (body.status === "COMPLETED" && oldStatus !== "COMPLETED" && project) {
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
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    await connectToDatabase();
    await Milestone.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Milestone removed successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
