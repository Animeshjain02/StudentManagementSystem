import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Milestone } from "@/models/Milestone";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";

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
    const { name, description, startDate, dueDate, assignedTo, progress, status } = body;

    if (!name || !startDate || !dueDate) {
      return NextResponse.json(
        { error: "Milestone name, start date, and due date are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const milestone = await Milestone.create({
      projectId: project._id,
      name: name.trim(),
      description: description?.trim() || "",
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      assignedTo: assignedTo?.trim() || "Engineering Team",
      progress: Number(progress) || 0,
      status: status || "PENDING",
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
