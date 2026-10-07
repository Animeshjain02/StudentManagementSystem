import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { QuotationResponse } from "@/models/QuotationResponse";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { notifyAdmins } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RULE 2: Only Student can accept quotation
    if (session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden: Only the assigned student can accept this quotation." },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const quotation = await Quotation.findById(id).populate("projectId");
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    const project = quotation.projectId as any;

    // Check ownership
    if (project.studentId.toString() !== session.userId) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to accept this quotation." },
        { status: 403 }
      );
    }

    // RULE 3: Expiration check
    if (new Date() > new Date(quotation.validUntil)) {
      quotation.status = "EXPIRED";
      await quotation.save();
      return NextResponse.json(
        { error: "This quotation has expired and can no longer be accepted. Please contact admin for a refreshed quotation." },
        { status: 400 }
      );
    }

    if (quotation.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "This quotation has already been accepted." },
        { status: 400 }
      );
    }

    // Accept quotation
    quotation.status = "ACCEPTED";
    quotation.acceptedAt = new Date();
    await quotation.save();

    // Automatically update project to APPROVED and set approvedBudget (Requirement 17 & 21)
    await Project.findByIdAndUpdate(project._id, {
      status: "APPROVED",
      approvedBudget: quotation.total,
    });

    // Record response
    await QuotationResponse.create({
      quotationId: quotation._id,
      version: quotation.version,
      action: "ACCEPTED",
      performedBy: session.userId,
    });

    // Activity Log
    await logActivity({
      userId: session.userId,
      role: "STUDENT",
      action: "QUOTATION_ACCEPTED",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `${session.name} accepted quotation ${quotation.quotationId} (v${quotation.version}) for ₹${quotation.total.toLocaleString()}. Project status set to APPROVED.`,
      metadata: { quotationId: quotation.quotationId, version: quotation.version, amount: quotation.total },
    });

    // Notify admins
    await notifyAdmins({
      title: `Quotation Accepted: ${quotation.quotationId}`,
      message: `${session.name} accepted quotation for project ${project.projectName}. The project is now APPROVED.`,
      type: "SUCCESS",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    // Email to admin
    const admin = await User.findOne({ role: "ADMIN" });
    if (admin) {
      const tmpl = EmailTemplates.quotationAccepted(admin.name, project.projectName, quotation.quotationId);
      await sendEmail({ to: admin.email, subject: tmpl.subject, html: tmpl.html });
    }

    return NextResponse.json({
      success: true,
      message: "Quotation accepted! The project has been officially APPROVED.",
      quotation,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
