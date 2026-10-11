import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { QuotationResponse } from "@/models/QuotationResponse";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { notifyAdmins } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";
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
        { error: "Forbidden: Only the assigned student can request changes." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const changes = str(body?.changes);

    if (!changes) {
      return NextResponse.json(
        { error: "Please describe the changes you require." },
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

    // Only a quotation that is awaiting the student's answer can be sent back for changes.
    const quotation = await Quotation.findOneAndUpdate(
      { _id: found._id, status: { $in: ACTIONABLE_STATUSES } },
      { $set: { status: "CHANGES_REQUESTED", requestedChanges: changes } },
      { new: true }
    );
    if (!quotation) {
      return NextResponse.json(
        { error: `This quotation is ${found.status.replace(/_/g, " ").toLowerCase()}; changes can no longer be requested.` },
        { status: 400 }
      );
    }

    await QuotationResponse.create({
      quotationId: quotation._id,
      version: quotation.version,
      action: "CHANGES_REQUESTED",
      reason: changes,
      performedBy: session.userId,
    });

    await logActivity({
      userId: session.userId,
      role: "STUDENT",
      action: "QUOTATION_CHANGES_REQUESTED",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `${session.name} requested modifications on quotation ${quotation.quotationId} (v${quotation.version}). Feedback: "${changes}"`,
    });

    await notifyAdmins({
      title: `Changes Requested: ${quotation.quotationId}`,
      message: `${session.name} requested changes on ${project.projectName}: "${changes}"`,
      type: "WARNING",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    const admin = await User.findOne({ role: "ADMIN" });
    if (admin) {
      const tmpl = EmailTemplates.changeRequested(project.projectName, quotation.quotationId, changes);
      await sendEmail({ to: admin.email, subject: tmpl.subject, html: tmpl.html });
    }

    return NextResponse.json({
      success: true,
      message: "Change request submitted. Our team will prepare a revised version.",
      quotation,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
