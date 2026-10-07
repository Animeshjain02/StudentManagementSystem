import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { QuotationResponse } from "@/models/QuotationResponse";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";
import { notifyAdmins } from "@/lib/notification";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden: Only the assigned student can request changes." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { changes } = await req.json();

    if (!changes || !changes.trim()) {
      return NextResponse.json(
        { error: "Please describe the changes you require." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const quotation = await Quotation.findById(id).populate("projectId");
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    const project = quotation.projectId as any;
    if (project.studentId.toString() !== session.userId) {
      return NextResponse.json({ error: "Forbidden: Not your quotation." }, { status: 403 });
    }

    quotation.status = "CHANGES_REQUESTED";
    quotation.requestedChanges = changes.trim();
    await quotation.save();

    await QuotationResponse.create({
      quotationId: quotation._id,
      version: quotation.version,
      action: "CHANGES_REQUESTED",
      reason: changes.trim(),
      performedBy: session.userId,
    });

    await logActivity({
      userId: session.userId,
      role: "STUDENT",
      action: "QUOTATION_CHANGES_REQUESTED",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `${session.name} requested modifications on quotation ${quotation.quotationId} (v${quotation.version}). Feedback: "${changes.trim()}"`,
    });

    await notifyAdmins({
      title: `Changes Requested: ${quotation.quotationId}`,
      message: `${session.name} requested changes on ${project.projectName}: "${changes.trim()}"`,
      type: "WARNING",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    return NextResponse.json({
      success: true,
      message: "Change request submitted. Our team will prepare a revised version.",
      quotation,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
