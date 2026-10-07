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
        { error: "Forbidden: Only the assigned student can reject this quotation." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { reason } = await req.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Please provide a rejection reason." },
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

    quotation.status = "REJECTED";
    quotation.rejectedAt = new Date();
    quotation.rejectionReason = reason.trim();
    await quotation.save();

    await QuotationResponse.create({
      quotationId: quotation._id,
      version: quotation.version,
      action: "REJECTED",
      reason: reason.trim(),
      performedBy: session.userId,
    });

    await logActivity({
      userId: session.userId,
      role: "STUDENT",
      action: "QUOTATION_REJECTED",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `${session.name} rejected quotation ${quotation.quotationId}. Reason: "${reason.trim()}"`,
    });

    await notifyAdmins({
      title: `Quotation Rejected: ${quotation.quotationId}`,
      message: `${session.name} rejected quotation for ${project.projectName}. Reason: ${reason.trim()}`,
      type: "ALERT",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    return NextResponse.json({
      success: true,
      message: "Quotation rejected. Admin has been notified.",
      quotation,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
