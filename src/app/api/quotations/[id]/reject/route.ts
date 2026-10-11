import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { QuotationResponse } from "@/models/QuotationResponse";
import { logActivity } from "@/lib/activity";
import { notifyAdmins } from "@/lib/notification";
import { ACTIONABLE_STATUSES } from "@/lib/quotation";
import { isObjectId, str } from "@/lib/validation";

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
    if (!isObjectId(id)) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const reason = str(body?.reason);

    if (!reason) {
      return NextResponse.json(
        { error: "Please provide a rejection reason." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const found = await Quotation.findById(id).populate("projectId");
    if (!found || !found.sentAt) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    const project = found.projectId as any;
    if (project.studentId.toString() !== session.userId) {
      return NextResponse.json({ error: "Forbidden: Not your quotation." }, { status: 403 });
    }

    // Only a quotation that is awaiting the student's answer can be rejected (atomic with the update).
    const quotation = await Quotation.findOneAndUpdate(
      { _id: found._id, status: { $in: ACTIONABLE_STATUSES } },
      { $set: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: reason } },
      { new: true }
    );
    if (!quotation) {
      return NextResponse.json(
        { error: `This quotation is ${found.status.replace(/_/g, " ").toLowerCase()} and can no longer be rejected.` },
        { status: 400 }
      );
    }

    await QuotationResponse.create({
      quotationId: quotation._id,
      version: quotation.version,
      action: "REJECTED",
      reason,
      performedBy: session.userId,
    });

    await logActivity({
      userId: session.userId,
      role: "STUDENT",
      action: "QUOTATION_REJECTED",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `${session.name} rejected quotation ${quotation.quotationId}. Reason: "${reason}"`,
    });

    await notifyAdmins({
      title: `Quotation Rejected: ${quotation.quotationId}`,
      message: `${session.name} rejected quotation for ${project.projectName}. Reason: ${reason}`,
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
    return handleApiError(err);
  }
}
