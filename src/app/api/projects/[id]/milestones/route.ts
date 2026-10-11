import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Milestone, MILESTONE_STATUSES } from "@/models/Milestone";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";
import { isObjectId, num, parseDate, str } from "@/lib/validation";

export async function POST(
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
    const { description, assignedTo, progress, status } = body;
    const name = str(body.name);

    if (!name || !body.startDate || !body.dueDate) {
      return NextResponse.json(
        { error: "Milestone name, start date, and due date are required." },
        { status: 400 }
      );
    }

    const startDate = parseDate(body.startDate);
    const dueDate = parseDate(body.dueDate);
    if (!startDate || !dueDate) {
      return NextResponse.json({ error: "Please provide valid start and due dates." }, { status: 400 });
    }
    if (dueDate.getTime() < startDate.getTime()) {
      return NextResponse.json({ error: "The due date cannot be earlier than the start date." }, { status: 400 });
    }

    const milestoneStatus = status || "PENDING";
    if (!(MILESTONE_STATUSES as readonly string[]).includes(milestoneStatus)) {
      return NextResponse.json({ error: "Invalid milestone status." }, { status: 400 });
    }

    let pct = 0;
    if (progress !== undefined && progress !== "") {
      pct = num(progress);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ error: "Progress must be a number between 0 and 100." }, { status: 400 });
      }
    }

    await connectToDatabase();
    // Accept the Mongo id or the human-readable PRJ- code
    const project = isObjectId(id) ? await Project.findById(id) : await Project.findOne({ projectId: id });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const done = milestoneStatus === "COMPLETED" || pct === 100;
    const milestone = await Milestone.create({
      projectId: project._id,
      name,
      description: str(description),
      startDate,
      dueDate,
      assignedTo: str(assignedTo) || "Engineering Team",
      progress: done ? 100 : pct,
      status: done ? "COMPLETED" : milestoneStatus,
      completedAt: done ? new Date() : undefined,
    });

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "MILESTONE_CREATED",
      projectId: project._id,
      entityId: milestone._id.toString(),
      entityType: "MILESTONE",
      description: `Admin created milestone "${milestone.name}" for project ${project.projectId}.`,
    });

    return NextResponse.json({
      success: true,
      message: "Milestone created successfully.",
      milestone,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
